import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LOCK_STORAGE_KEY,
  clampBlock,
  clearLock,
  consumeResetNotice,
  readLock,
  recordFailure,
  recordSuccess,
  remainingWaitMs,
  writeLock,
  type LockRecord,
} from './lockStore';
import { hashSecret } from './pin';

// 16 and 32 bytes of base64, the lengths hashSecret produces.
const SALT = 'EBESExQVFhcYGRobHB0eHw==';
const HASH = 'ICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj8=';

const base: LockRecord = {
  v: 1,
  pin: { salt: SALT, hash: HASH, iter: 1000 },
  recovery: { salt: SALT, hash: HASH, iter: 1000 },
  biometric: false,
  autoLockMs: 60000,
  failures: 0,
  blockedUntil: 0,
};

beforeEach(() => {
  localStorage.clear();
  clearLock();
  consumeResetNotice();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('lockStore', () => {
  it('round-trips a record and reads null when empty', () => {
    expect(readLock()).toBeNull();
    expect(consumeResetNotice()).toBe(false);
    writeLock(base);
    expect(readLock()).toEqual(base);
  });

  it.each([
    ['malformed json', '{bad'],
    ['wrong version', JSON.stringify({ ...base, v: 2 })],
    ['bad autoLockMs', JSON.stringify({ ...base, autoLockMs: 7 })],
  ])('drops %s and flags a reset notice once', (_name, raw) => {
    localStorage.setItem(LOCK_STORAGE_KEY, raw);
    expect(readLock()).toBeNull();
    expect(localStorage.getItem(LOCK_STORAGE_KEY)).toBeNull();
    expect(consumeResetNotice()).toBe(true);
    expect(consumeResetNotice()).toBe(false);
  });

  it.each([
    ['a salt that is not base64', { pin: { salt: '!', hash: HASH, iter: 1000 } }],
    ['a salt of the wrong length', { pin: { salt: 'AAECAwQFBgcICQoLDA0O', hash: HASH, iter: 1000 } }],
    ['a salt with bad padding', { pin: { salt: 'EBESExQVFhcYGRobHB0eH===', hash: HASH, iter: 1000 } }],
    ['a hash of the wrong length', { recovery: { salt: SALT, hash: 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8g', iter: 1000 } }],
    ['a hash that is not base64', { recovery: { salt: SALT, hash: '%'.repeat(44), iter: 1000 } }],
    ['iter of zero', { pin: { salt: SALT, hash: HASH, iter: 0 } }],
    ['a fractional iter', { pin: { salt: SALT, hash: HASH, iter: 1000.5 } }],
    ['iter above one million', { pin: { salt: SALT, hash: HASH, iter: 1_000_001 } }],
    ['fractional failures', { failures: 1.5 }],
    ['negative failures', { failures: -1 }],
  ])('drops a record with %s as damaged', (_name, over) => {
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify({ ...base, ...over }));
    expect(readLock()).toBeNull();
    expect(localStorage.getItem(LOCK_STORAGE_KEY)).toBeNull();
    expect(consumeResetNotice()).toBe(true);
  });

  it('accepts iter at the bounds and records made by hashSecret', async () => {
    writeLock({ ...base, pin: { salt: SALT, hash: HASH, iter: 1 }, recovery: { salt: SALT, hash: HASH, iter: 1_000_000 } });
    expect(readLock()).not.toBeNull();
    const low = { ...base, pin: await hashSecret('1357', 1000), recovery: await hashSecret('ABCDEFGHJKMN', 1000) };
    writeLock(low);
    expect(readLock()).toEqual(low);
    const real = { ...base, pin: await hashSecret('1357') };
    writeLock(real);
    expect(readLock()).toEqual(real);
    expect(consumeResetNotice()).toBe(false);
  });

  it('counts failures and blocks with backoff', () => {
    let record = base;
    for (let i = 0; i < 5; i += 1) record = recordFailure(record, 1000);
    expect(readLock()?.failures).toBe(5);
    expect(readLock()?.blockedUntil).toBe(31000);
    record = recordFailure(record, 40000);
    expect(record.blockedUntil).toBe(100000);
  });

  it('recordSuccess resets and persists', () => {
    const next = recordSuccess({ ...base, failures: 6, blockedUntil: 5000 });
    expect(next.failures).toBe(0);
    expect(next.blockedUntil).toBe(0);
    expect(readLock()).toEqual(next);
  });

  it('computes the remaining wait with clamping', () => {
    expect(remainingWaitMs({ ...base, blockedUntil: 31000 }, 1000)).toBe(30000);
    expect(remainingWaitMs({ ...base, blockedUntil: 1000 + 10 * 365 * 86400000 }, 1000)).toBe(900000);
    expect(remainingWaitMs({ ...base, blockedUntil: 5 }, 1000)).toBe(0);
  });

  it('clamps a blockedUntil further away than the longest wait', () => {
    const near = { ...base, failures: 5, blockedUntil: 31000 };
    expect(clampBlock(near, 1000)).toBe(near);
    expect(clampBlock({ ...near, blockedUntil: 1000 + 900000 }, 1000).blockedUntil).toBe(901000);
    expect(clampBlock({ ...near, blockedUntil: 1000 + 10 * 86400000 }, 1000)).toEqual({ ...near, blockedUntil: 901000 });
  });

  it('writeLock throws when storage fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    expect(() => writeLock(base)).toThrow();
  });

  it('keeps blockedUntil across reads', () => {
    writeLock({ ...base, failures: 5, blockedUntil: 31000 });
    expect(readLock()?.blockedUntil).toBe(31000);
    expect(readLock()?.blockedUntil).toBe(31000);
  });
});
