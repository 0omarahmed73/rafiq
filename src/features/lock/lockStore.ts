import { clearLockDb, lockDbAvailable, readLockDb, writeLockDb, type LockDbState } from './lockDb';
import { waitMs, type SecretRecord } from './pin';

/**
 * The lock record is kept in its own IndexedDB database (see lockDb), because Android WebView writes localStorage to
 * disk late and a force-stop can lose recent writes. This localStorage key (where older versions kept the record) is
 * a best-effort mirror of it, so that a start where IndexedDB is slow or unavailable stays locked (fail closed).
 * IndexedDB wins whenever it answers at load, and the mirror is then rewritten to match it.
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

/** A write or clear that definitely did not reach storage. */
export class LockWriteError extends Error {
  constructor(readonly reason?: unknown) {
    super('The lock could not be saved.');
    this.name = 'LockWriteError';
  }
}

/** IndexedDB reported a failure and could not be read back: the change may or may not be stored. */
export class LockWriteUnknownError extends Error {
  constructor() {
    super('The lock may have been saved.');
    this.name = 'LockWriteUnknownError';
  }
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
/** Set by eraseLock: from then on, until the next start, nothing writes a record again. */
let erased = false;

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

/** Sets the localStorage mirror; never throws. */
function mirror(record: LockRecord): void {
  try {
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // storage unavailable: IndexedDB still holds the record
  }
}

/** In local mode, writes are also tried in IndexedDB, in order and without waiting; failures are ignored. */
let idbAttempts: Promise<unknown> = Promise.resolve();
function tryInDb(write: () => Promise<void>): void {
  idbAttempts = idbAttempts.then(write).catch(() => undefined);
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
 * Loads from IndexedDB. Once the database is initialized it is the only authority: a different localStorage
 * mirror is stale (an erase or change whose localStorage write never reached the disk) and is rewritten to match.
 * Before that, a localStorage record is moved in (and stays as the mirror). `abandoned` turns true when the load
 * gave up waiting; the mirror is not touched after that.
 */
async function loadFromDb(timeoutMs: number, abandoned: () => boolean): Promise<LockRecord | null> {
  const state = await readLockDb(timeoutMs);
  if (abandoned()) throw new Error('The lock load timed out.');
  if (state.initialized || state.record !== undefined) {
    if (isLockRecord(state.record)) {
      mirror(state.record);
      return state.record;
    }
    removeLocal();
    if (state.record === undefined) return null;
    resetNotice = true;
    await clearLockDb(timeoutMs).catch(() => undefined);
    return null;
  }
  const local = localRecord();
  if (local) {
    await writeLockDb(local, timeoutMs);
    return local;
  }
  await clearLockDb(timeoutMs);
  return null;
}

/**
 * Loads the lock record into memory once, before the first render. Never rejects and never waits longer than
 * `timeoutMs`. When IndexedDB is missing, fails or does not answer in time ("local mode"), the record is read from
 * the localStorage mirror, so a lock that was set stays on. In local mode writes go to the mirror and are also
 * tried in IndexedDB. Accepted limits: a change that only reached the mirror is overwritten by IndexedDB at the
 * next healthy start, and a stale mirror (an erase whose removal was lost) makes such a start locked with the old
 * PIN.
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
    if (erased) return null;
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
      mirror(record);
      return record;
    }
    resetNotice = true;
    await clearLockDb().catch(() => undefined);
    removeLocal();
    cache = null;
    return null;
  });
}

/**
 * Runs an IndexedDB write. lockDb also rejects on a timeout, after which the transaction may still commit, so a
 * rejection is checked by reading back: the change is there (resolves), it is not (LockWriteError), or the read
 * fails too (LockWriteUnknownError).
 */
async function confirmed(attempt: () => Promise<void>, landed: (state: LockDbState) => boolean): Promise<void> {
  try {
    await attempt();
  } catch (error) {
    let state: LockDbState;
    try {
      state = await readLockDb();
    } catch {
      throw new LockWriteUnknownError();
    }
    if (!landed(state)) throw new LockWriteError(error);
  }
}

function strictLocal(change: () => void): void {
  try {
    change();
  } catch (error) {
    throw new LockWriteError(error);
  }
}

/**
 * Saves the record; resolves once it is stored (in IndexedDB, committed; in local mode, in localStorage), and only
 * then updates the cache. The other store is updated best effort and never changes the result. After eraseLock it
 * does nothing.
 */
export function writeLock(record: LockRecord): Promise<void> {
  return serial(async () => {
    await loadLock();
    if (erased) return;
    if (mode === 'idb') {
      const json = JSON.stringify(record);
      await confirmed(
        () => writeLockDb(record),
        (state) => JSON.stringify(state.record) === json,
      );
      // An erase that ran while this write was in flight wins: clear again so the record cannot come back.
      if (erased) {
        await clearLockDb().catch(() => undefined);
        return;
      }
      mirror(record);
    } else {
      strictLocal(() => localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(record)));
      tryInDb(() => writeLockDb(record));
    }
    cache = record;
  });
}

/** Removes the record, the same way as writeLock stores one; only then clears the cache. */
export function clearLock(): Promise<void> {
  return serial(async () => {
    await loadLock();
    if (erased) return;
    if (mode === 'idb') {
      await confirmed(
        () => clearLockDb(),
        (state) => state.record === undefined,
      );
      removeLocal();
    } else {
      strictLocal(() => localStorage.removeItem(LOCK_STORAGE_KEY));
      tryInDb(() => clearLockDb());
    }
    cache = null;
  });
}

/**
 * Removes the lock for an erase. A write already queued or in flight (a failure count, a clamp) must not bring the
 * record back before the reload, and IndexedDB may be slow: so the mirror and the cache go at once, every later
 * write becomes a no-op, and the IndexedDB clear is issued directly instead of waiting behind the queue. Never
 * rejects.
 */
export function eraseLock(): Promise<void> {
  erased = true;
  cache = null;
  removeLocal();
  return clearLockDb().catch(() => undefined);
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
  idbAttempts = Promise.resolve();
  erased = false;
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
