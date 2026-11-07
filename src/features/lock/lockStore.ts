import { clearLockDb, lockDbAvailable, readLockDb, writeLockDb } from './lockDb';
import { waitMs, type SecretRecord } from './pin';

/**
 * The lock record is kept in its own IndexedDB database (see lockDb), because Android WebView writes localStorage to
 * disk late and a force-stop can lose recent writes. localStorage is used only when IndexedDB is unavailable, and
 * this key is where older versions kept the record (it is moved into IndexedDB on the first start).
 */
export const LOCK_STORAGE_KEY = 'rafiq.lock.v1';
export const AUTO_LOCK_OPTIONS = [0, 60000, 300000, 900000] as const;
export const DEFAULT_AUTO_LOCK_MS = 60000;

const MAX_WAIT_MS = 900000;

export interface LockRecord {
  v: 1;
  pin: SecretRecord;
  recovery: SecretRecord;
  biometric: boolean;
  autoLockMs: number;
  failures: number;
  blockedUntil: number;
}

let resetNotice = false;

const SALT_BYTES = 16;
const HASH_BYTES = 32;
const MAX_ITERATIONS = 1_000_000;

/** True when `value` is canonical base64 that decodes to exactly `bytes` bytes. */
function isBase64Of(value: unknown, bytes: number): boolean {
  if (typeof value !== 'string') return false;
  if (value.length !== Math.ceil(bytes / 3) * 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) return false;
  try {
    return atob(value).length === bytes;
  } catch {
    return false;
  }
}

function isSecret(value: unknown): value is SecretRecord {
  if (typeof value !== 'object' || value === null) return false;
  const secret = value as Record<string, unknown>;
  return (
    isBase64Of(secret.salt, SALT_BYTES) &&
    isBase64Of(secret.hash, HASH_BYTES) &&
    Number.isInteger(secret.iter) &&
    (secret.iter as number) >= 1 &&
    (secret.iter as number) <= MAX_ITERATIONS
  );
}

function isNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isLockRecord(value: unknown): value is LockRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record.v === 1 &&
    isSecret(record.pin) &&
    isSecret(record.recovery) &&
    typeof record.biometric === 'boolean' &&
    (AUTO_LOCK_OPTIONS as readonly number[]).includes(record.autoLockMs as number) &&
    Number.isInteger(record.failures) &&
    isNonNegative(record.failures) &&
    isNonNegative(record.blockedUntil)
  );
}

type Mode = 'idb' | 'local';

/** How long the load may wait for IndexedDB before the store falls back to localStorage. */
const LOAD_TIMEOUT_MS = 2000;

/** The record as last loaded or written; reads are synchronous from here. */
let cache: LockRecord | null = null;
let mode: Mode = 'local';
let loading: Promise<void> | null = null;
/** Writes and fresh reads run one at a time, in call order, so the cache always matches the last commit. */
let queue: Promise<unknown> = Promise.resolve();

function serial<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(task, task);
  queue = result.catch(() => undefined);
  return result;
}

function removeLocal(): void {
  try {
    localStorage.removeItem(LOCK_STORAGE_KEY);
  } catch {
    // storage unavailable; nothing more to do
  }
}

/** The localStorage record: a valid record, null when there is none, or 'damaged' (removed, notice set). */
function readLocal(): LockRecord | null | 'damaged' {
  let raw: string | null;
  try {
    raw = localStorage.getItem(LOCK_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  if (isLockRecord(parsed)) return parsed;
  resetNotice = true;
  removeLocal();
  return 'damaged';
}

function localRecord(): LockRecord | null {
  const local = readLocal();
  return local === 'damaged' ? null : local;
}

/**
 * Loads from IndexedDB. Once the database is initialized it is the only authority and a localStorage record is
 * stale (an erase or change whose removal never reached the disk), so it is removed. Before that, a localStorage
 * record is moved in. `abandoned` turns true when the load gave up waiting; nothing is changed after that.
 */
async function loadFromDb(timeoutMs: number, abandoned: () => boolean): Promise<LockRecord | null> {
  const state = await readLockDb(timeoutMs);
  if (abandoned()) throw new Error('The lock load timed out.');
  if (state.initialized || state.record !== undefined) {
    removeLocal();
    if (state.record === undefined) return null;
    if (isLockRecord(state.record)) return state.record;
    resetNotice = true;
    await clearLockDb(timeoutMs).catch(() => undefined);
    return null;
  }
  const local = localRecord();
  if (local) {
    await writeLockDb(local, timeoutMs);
    if (abandoned()) throw new Error('The lock load timed out.');
    removeLocal();
    return local;
  }
  await clearLockDb(timeoutMs);
  return null;
}

/**
 * Loads the lock record into memory once, before the first render. Never rejects and never waits longer than
 * `timeoutMs`: when IndexedDB is missing, fails or does not answer in time, the store keeps the record in
 * localStorage as before (whose writes Android may lose on a force-stop).
 */
export function loadLock(timeoutMs: number = LOAD_TIMEOUT_MS): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    let gaveUp = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), timeoutMs);
    });
    try {
      if (!lockDbAvailable()) throw new Error('IndexedDB is not available.');
      const result = await Promise.race([loadFromDb(timeoutMs, () => gaveUp).then((record) => ({ record })), timeout]);
      if (result === 'timeout') throw new Error('The lock load timed out.');
      cache = result.record;
      mode = 'idb';
    } catch {
      gaveUp = true;
      mode = 'local';
      cache = localRecord();
    } finally {
      clearTimeout(timer);
    }
  })();
  return loading;
}

/** The lock record in memory (null before loadLock has finished). */
export function readLock(): LockRecord | null {
  return cache;
}

/**
 * Reads the stored record again (another tab may have changed it). A valid record updates the cache and is
 * returned. Nothing stored, or a failed read, returns null and leaves the cache, so callers keep their record.
 * A damaged record is removed, sets the reset notice and returns null.
 */
export function readLockFresh(): Promise<LockRecord | null> {
  return serial(async () => {
    await loadLock();
    if (mode === 'local') {
      const local = readLocal();
      if (local === 'damaged') {
        cache = null;
        return null;
      }
      if (local) cache = local;
      return local;
    }
    let record: unknown;
    try {
      record = (await readLockDb()).record;
    } catch {
      return null;
    }
    if (record === undefined) return null;
    if (isLockRecord(record)) {
      cache = record;
      return record;
    }
    resetNotice = true;
    await clearLockDb().catch(() => undefined);
    cache = null;
    return null;
  });
}

/** Saves the record; resolves once it is stored (in IndexedDB, committed), and only then updates the cache. */
export function writeLock(record: LockRecord): Promise<void> {
  return serial(async () => {
    await loadLock();
    if (mode === 'idb') await writeLockDb(record);
    else localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(record));
    cache = record;
  });
}

/** Removes the record (and any localStorage copy); resolves once that is stored, and only then clears the cache. */
export function clearLock(): Promise<void> {
  return serial(async () => {
    await loadLock();
    if (mode === 'idb') {
      removeLocal();
      await clearLockDb();
    } else {
      localStorage.removeItem(LOCK_STORAGE_KEY);
    }
    cache = null;
  });
}

export function consumeResetNotice(): boolean {
  const value = resetNotice;
  resetNotice = false;
  return value;
}

export async function recordFailure(record: LockRecord, now: number): Promise<LockRecord> {
  const failures = record.failures + 1;
  const next = { ...record, failures, blockedUntil: now + waitMs(failures) };
  await writeLock(next);
  return next;
}

export async function recordSuccess(record: LockRecord): Promise<LockRecord> {
  const next = { ...record, failures: 0, blockedUntil: 0 };
  await writeLock(next);
  return next;
}

/** Forgets everything loaded, as on a fresh start. Tests only. */
export function resetLockStoreForTests(): void {
  cache = null;
  mode = 'local';
  loading = null;
  queue = Promise.resolve();
  resetNotice = false;
}

/**
 * Pulls a blockedUntil that is more than the longest wait away (a clock that was ahead and then
 * corrected) back to now + the longest wait. Returns the same object when nothing changes.
 */
export function clampBlock(record: LockRecord, now: number): LockRecord {
  if (record.blockedUntil - now <= MAX_WAIT_MS) return record;
  return { ...record, blockedUntil: now + MAX_WAIT_MS };
}

export function remainingWaitMs(record: LockRecord, now: number): number {
  return Math.min(Math.max(record.blockedUntil - now, 0), MAX_WAIT_MS);
}
