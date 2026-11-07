import { waitMs, type SecretRecord } from './pin';

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

export function readLock(): LockRecord | null {
  try {
    const raw = localStorage.getItem(LOCK_STORAGE_KEY);
    if (raw === null) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = undefined;
    }
    if (isLockRecord(parsed)) return parsed;
    resetNotice = true;
    try {
      localStorage.removeItem(LOCK_STORAGE_KEY);
    } catch {
      // storage unavailable; nothing more to do
    }
    return null;
  } catch {
    return null;
  }
}

export function writeLock(record: LockRecord): void {
  localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(record));
}

export function clearLock(): void {
  try {
    localStorage.removeItem(LOCK_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function consumeResetNotice(): boolean {
  const value = resetNotice;
  resetNotice = false;
  return value;
}

export function recordFailure(record: LockRecord, now: number): LockRecord {
  const failures = record.failures + 1;
  const next = { ...record, failures, blockedUntil: now + waitMs(failures) };
  writeLock(next);
  return next;
}

export function recordSuccess(record: LockRecord): LockRecord {
  const next = { ...record, failures: 0, blockedUntil: 0 };
  writeLock(next);
  return next;
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
