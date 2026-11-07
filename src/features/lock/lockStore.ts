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

function isSecret(value: unknown): value is SecretRecord {
  if (typeof value !== 'object' || value === null) return false;
  const secret = value as Record<string, unknown>;
  return (
    typeof secret.salt === 'string' &&
    typeof secret.hash === 'string' &&
    typeof secret.iter === 'number' &&
    Number.isFinite(secret.iter) &&
    secret.iter > 0
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

export function remainingWaitMs(record: LockRecord, now: number): number {
  return Math.min(Math.max(record.blockedUntil - now, 0), MAX_WAIT_MS);
}
