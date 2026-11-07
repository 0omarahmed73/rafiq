import Dexie from 'dexie';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDexieRepo, RafiqDB } from '../../db/dexieRepo';
import * as lockDb from './lockDb';
import {
  LOCK_STORAGE_KEY,
  clampBlock,
  clearLock,
  consumeResetNotice,
  loadLock,
  readLock,
  readLockFresh,
  recordFailure,
  recordSuccess,
  remainingWaitMs,
  resetLockStoreForTests,
  writeLock,
  type LockRecord,
} from './lockStore';
import { hashSecret } from './pin';

// The real IndexedDB wrapper, wrapped so single tests can make it fail.
vi.mock('./lockDb', async (importOriginal) => {
  const real = await importOriginal<typeof import('./lockDb')>();
  return {
    ...real,
    readLockDb: vi.fn(real.readLockDb),
    writeLockDb: vi.fn(real.writeLockDb),
    clearLockDb: vi.fn(real.clearLockDb),
  };
});

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

const DAMAGED: Array<[string, Record<string, unknown>]> = [
  ['wrong version', { v: 2 }],
  ['bad autoLockMs', { autoLockMs: 7 }],
  ['a salt that is not base64', { pin: { salt: '!', hash: HASH, iter: 1000 } }],
  ['a salt of the wrong length', { pin: { salt: 'AAECAwQFBgcICQoLDA0O', hash: HASH, iter: 1000 } }],
  ['a salt with bad padding', { pin: { salt: 'EBESExQVFhcYGRobHB0eH===', hash: HASH, iter: 1000 } }],
  [
    'a hash of the wrong length',
    { recovery: { salt: SALT, hash: 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8g', iter: 1000 } },
  ],
  ['a hash that is not base64', { recovery: { salt: SALT, hash: '%'.repeat(44), iter: 1000 } }],
  ['iter of zero', { pin: { salt: SALT, hash: HASH, iter: 0 } }],
  ['a fractional iter', { pin: { salt: SALT, hash: HASH, iter: 1000.5 } }],
  ['iter above one million', { pin: { salt: SALT, hash: HASH, iter: 1_000_001 } }],
  ['fractional failures', { failures: 1.5 }],
  ['negative failures', { failures: -1 }],
];

const original = globalThis.indexedDB;

/** The localStorage mirror, parsed (null when absent). */
const mirrored = (): unknown => JSON.parse(localStorage.getItem(LOCK_STORAGE_KEY) ?? 'null');

/** What the lock database holds, read straight from IndexedDB. */
const stored = () => lockDb.readLockDb();

/** A cold start with `value` already in the lock database. */
async function bootWith(value: unknown): Promise<void> {
  await lockDb.writeLockDb(value);
  resetLockStoreForTests();
  await loadLock();
}

/** A factory whose open request never answers. */
function silentFactory(): IDBFactory {
  return { open: () => ({}) } as unknown as IDBFactory;
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
  resetLockStoreForTests();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  globalThis.indexedDB = original;
  localStorage.clear();
});

describe('lockStore in IndexedDB', () => {
  it('reads null before the load and after loading an empty database, and marks the database', async () => {
    expect(readLock()).toBeNull();
    await loadLock();
    expect(readLock()).toBeNull();
    expect(consumeResetNotice()).toBe(false);
    expect(await stored()).toEqual({ initialized: true, record: undefined });
  });

  it('loads once: repeated calls share one promise', async () => {
    const first = loadLock();
    expect(loadLock()).toBe(first);
    await first;
    expect(loadLock()).toBe(first);
  });

  it('writes durably and updates the cache only after the commit', async () => {
    await loadLock();
    const pending = writeLock(base);
    expect(readLock()).toBeNull();
    await pending;
    expect(readLock()).toEqual(base);
    expect((await stored()).record).toEqual(base);
    expect(mirrored()).toEqual(base);
  });

  it('a mirror that cannot be written does not fail the durable write or clear', async () => {
    await loadLock();
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('denied');
    });
    await writeLock(base);
    expect(readLock()).toEqual(base);
    expect((await stored()).record).toEqual(base);
    await clearLock();
    expect(readLock()).toBeNull();
    expect(await stored()).toEqual({ initialized: true, record: undefined });
    expect(setItem).toHaveBeenCalled();
    expect(removeItem).toHaveBeenCalled();
  });

  it('a write that IndexedDB does not confirm rejects and leaves the cache', async () => {
    await loadLock();
    await writeLock(base);
    vi.mocked(lockDb.writeLockDb).mockRejectedValueOnce(new Error('aborted'));
    await expect(writeLock({ ...base, failures: 3 })).rejects.toThrow();
    expect(readLock()).toEqual(base);
    expect((await stored()).record).toEqual(base);
    expect(mirrored()).toEqual(base);
  });

  it('a cold start reads the stored record and rewrites a missing mirror', async () => {
    await bootWith({ ...base, failures: 5, blockedUntil: 31000 });
    expect(readLock()).toEqual({ ...base, failures: 5, blockedUntil: 31000 });
    expect(mirrored()).toEqual({ ...base, failures: 5, blockedUntil: 31000 });
    expect(consumeResetNotice()).toBe(false);
  });

  it('accepts iter at the bounds and records made by hashSecret', async () => {
    const bounds = {
      ...base,
      pin: { salt: SALT, hash: HASH, iter: 1 },
      recovery: { salt: SALT, hash: HASH, iter: 1_000_000 },
    };
    await bootWith(bounds);
    expect(readLock()).toEqual(bounds);
    const real = { ...base, pin: await hashSecret('1357'), recovery: await hashSecret('ABCDEFGHJKMN', 1000) };
    await bootWith(real);
    expect(readLock()).toEqual(real);
    expect(consumeResetNotice()).toBe(false);
  });

  it.each(DAMAGED)('drops a stored record with %s, clears it and flags a reset notice once', async (_name, over) => {
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(base));
    await bootWith({ ...base, ...over });
    expect(mirrored()).toBeNull();
    expect(readLock()).toBeNull();
    expect(await stored()).toEqual({ initialized: true, record: undefined });
    expect(consumeResetNotice()).toBe(true);
    expect(consumeResetNotice()).toBe(false);
  });

  it('drops a stored record that is not an object', async () => {
    await bootWith('{"v":1,"pin":');
    expect(readLock()).toBeNull();
    expect(consumeResetNotice()).toBe(true);
  });

  it('clearLock removes the record durably, and any localStorage copy', async () => {
    await loadLock();
    await writeLock(base);
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(base));
    await clearLock();
    expect(readLock()).toBeNull();
    expect(await stored()).toEqual({ initialized: true, record: undefined });
    expect(mirrored()).toBeNull();
  });

  it('a clear that IndexedDB does not confirm rejects and leaves the cache', async () => {
    await loadLock();
    await writeLock(base);
    vi.mocked(lockDb.clearLockDb).mockRejectedValueOnce(new Error('aborted'));
    await expect(clearLock()).rejects.toThrow();
    expect(readLock()).toEqual(base);
    // IndexedDB still holds the lock, so the mirror keeps it too (fail closed).
    expect(mirrored()).toEqual(base);
  });

  it('applies writes in the order they were made', async () => {
    await loadLock();
    const writes = [writeLock({ ...base, failures: 1 }), writeLock({ ...base, failures: 2 }), clearLock()];
    const last = writeLock({ ...base, failures: 3 });
    await Promise.all([...writes, last]);
    expect(readLock()?.failures).toBe(3);
    expect((await stored()).record).toMatchObject({ failures: 3 });
  });

  it('counts failures and blocks with backoff, durably', async () => {
    await loadLock();
    let record = base;
    for (let i = 0; i < 5; i += 1) record = await recordFailure(record, 1000);
    expect(readLock()).toMatchObject({ failures: 5, blockedUntil: 31000 });
    expect((await stored()).record).toMatchObject({ failures: 5, blockedUntil: 31000 });
    expect(mirrored()).toMatchObject({ failures: 5, blockedUntil: 31000 });
    record = await recordFailure(record, 40000);
    expect(record.blockedUntil).toBe(100000);
  });

  it('recordSuccess resets and persists', async () => {
    await loadLock();
    const next = await recordSuccess({ ...base, failures: 6, blockedUntil: 5000 });
    expect(next).toMatchObject({ failures: 0, blockedUntil: 0 });
    expect(readLock()).toEqual(next);
    expect((await stored()).record).toEqual(next);
  });

  it('recordFailure rejects when the write fails', async () => {
    await loadLock();
    vi.mocked(lockDb.writeLockDb).mockRejectedValueOnce(new Error('aborted'));
    await expect(recordFailure(base, 1000)).rejects.toThrow();
    expect(readLock()).toBeNull();
  });
});

describe('moving a localStorage record into IndexedDB', () => {
  it('moves a valid record and keeps the localStorage key as the mirror', async () => {
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify({ ...base, failures: 2 }));
    await loadLock();
    expect(readLock()).toEqual({ ...base, failures: 2 });
    expect(await stored()).toEqual({ initialized: true, record: { ...base, failures: 2 } });
    expect(mirrored()).toEqual({ ...base, failures: 2 });
    expect(consumeResetNotice()).toBe(false);
  });

  it.each([['malformed json', '{bad'], ...DAMAGED.map(([name, over]) => [name, JSON.stringify({ ...base, ...over })])])(
    'drops a localStorage record with %s and flags a reset notice',
    async (_name, raw) => {
      localStorage.setItem(LOCK_STORAGE_KEY, raw);
      await loadLock();
      expect(readLock()).toBeNull();
      expect(localStorage.getItem(LOCK_STORAGE_KEY)).toBeNull();
      expect(await stored()).toEqual({ initialized: true, record: undefined });
      expect(consumeResetNotice()).toBe(true);
    },
  );

  // The erase bug: an erased lock whose localStorage removal never reached the disk came back on the next start.
  it('with the initialized marker, an empty database is no lock and a stale localStorage copy is removed', async () => {
    await lockDb.clearLockDb();
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(base));
    await loadLock();
    expect(readLock()).toBeNull();
    expect(localStorage.getItem(LOCK_STORAGE_KEY)).toBeNull();
    expect(await stored()).toEqual({ initialized: true, record: undefined });
    expect(consumeResetNotice()).toBe(false);
  });

  it('once IndexedDB is initialized, its record wins over a stale mirror, which is rewritten', async () => {
    await lockDb.writeLockDb({ ...base, failures: 4 });
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(base));
    await loadLock();
    expect(readLock()).toEqual({ ...base, failures: 4 });
    expect(mirrored()).toEqual({ ...base, failures: 4 });
  });

  it('keeps the record in memory and in localStorage when the move cannot be written', async () => {
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(base));
    vi.mocked(lockDb.writeLockDb).mockRejectedValueOnce(new Error('aborted'));
    await loadLock();
    expect(readLock()).toEqual(base);
    expect(localStorage.getItem(LOCK_STORAGE_KEY)).not.toBeNull();
  });
});

describe('readLockFresh', () => {
  it('adopts a valid stored record that differs from the cache', async () => {
    await loadLock();
    await writeLock(base);
    await lockDb.writeLockDb({ ...base, autoLockMs: 300000 });
    expect(await readLockFresh()).toEqual({ ...base, autoLockMs: 300000 });
    expect(readLock()).toEqual({ ...base, autoLockMs: 300000 });
    expect(mirrored()).toEqual({ ...base, autoLockMs: 300000 });
  });

  it('returns null without changing the cache when nothing is stored', async () => {
    await loadLock();
    await writeLock(base);
    await lockDb.clearLockDb();
    expect(await readLockFresh()).toBeNull();
    expect(readLock()).toEqual(base);
  });

  it('returns null without changing the cache when the read fails', async () => {
    await loadLock();
    await writeLock(base);
    vi.mocked(lockDb.readLockDb).mockRejectedValueOnce(new Error('aborted'));
    expect(await readLockFresh()).toBeNull();
    expect(readLock()).toEqual(base);
  });

  it('clears a damaged stored record and flags the reset notice', async () => {
    await loadLock();
    await writeLock(base);
    await lockDb.writeLockDb({ ...base, v: 2 });
    expect(await readLockFresh()).toBeNull();
    expect(consumeResetNotice()).toBe(true);
    expect(await stored()).toEqual({ initialized: true, record: undefined });
  });

  it('sees a write that was made just before it', async () => {
    await loadLock();
    void writeLock({ ...base, failures: 2 });
    expect(await readLockFresh()).toMatchObject({ failures: 2 });
  });
});

describe('lockStore without IndexedDB (local mode)', () => {
  it('falls back to localStorage when IndexedDB is missing', async () => {
    // @ts-expect-error simulating a missing IndexedDB
    globalThis.indexedDB = undefined;
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(base));
    await loadLock();
    expect(readLock()).toEqual(base);
    expect(localStorage.getItem(LOCK_STORAGE_KEY)).not.toBeNull();

    await writeLock({ ...base, failures: 1 });
    expect(JSON.parse(localStorage.getItem(LOCK_STORAGE_KEY)!)).toEqual({ ...base, failures: 1 });
    expect(readLock()).toEqual({ ...base, failures: 1 });

    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify({ ...base, autoLockMs: 0 }));
    expect(await readLockFresh()).toEqual({ ...base, autoLockMs: 0 });
    localStorage.removeItem(LOCK_STORAGE_KEY);
    expect(await readLockFresh()).toBeNull();
    expect(readLock()).toEqual({ ...base, autoLockMs: 0 });

    await writeLock(base);
    await clearLock();
    expect(readLock()).toBeNull();
    expect(localStorage.getItem(LOCK_STORAGE_KEY)).toBeNull();
  });

  it('a local write that throws rejects and leaves the cache', async () => {
    // @ts-expect-error simulating a missing IndexedDB
    globalThis.indexedDB = undefined;
    await loadLock();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    await expect(writeLock(base)).rejects.toThrow();
    expect(readLock()).toBeNull();
  });

  it('drops a damaged localStorage record with the reset notice', async () => {
    // @ts-expect-error simulating a missing IndexedDB
    globalThis.indexedDB = undefined;
    localStorage.setItem(LOCK_STORAGE_KEY, '{bad');
    await loadLock();
    expect(readLock()).toBeNull();
    expect(localStorage.getItem(LOCK_STORAGE_KEY)).toBeNull();
    expect(consumeResetNotice()).toBe(true);
  });

  it('falls back to the mirror when the load read fails, and still tries IndexedDB for writes', async () => {
    await lockDb.writeLockDb(base);
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(base));
    vi.mocked(lockDb.readLockDb).mockRejectedValueOnce(new Error('blocked'));
    await loadLock();
    expect(readLock()).toEqual(base);
    await writeLock({ ...base, failures: 1 });
    expect(mirrored()).toMatchObject({ failures: 1 });
    await vi.waitFor(async () => expect((await stored()).record).toMatchObject({ failures: 1 }));
    await clearLock();
    expect(mirrored()).toBeNull();
    await vi.waitFor(async () => expect(await stored()).toEqual({ initialized: true, record: undefined }));
  });

  it('a local write still succeeds when the IndexedDB attempt fails', async () => {
    vi.mocked(lockDb.readLockDb).mockRejectedValueOnce(new Error('blocked'));
    await loadLock();
    vi.mocked(lockDb.writeLockDb).mockRejectedValueOnce(new Error('aborted'));
    await writeLock(base);
    expect(readLock()).toEqual(base);
    expect(mirrored()).toEqual(base);
  });

  it('starts with no lock when the load fails and there is no mirror', async () => {
    await lockDb.writeLockDb(base);
    vi.mocked(lockDb.readLockDb).mockRejectedValueOnce(new Error('blocked'));
    await loadLock();
    expect(readLock()).toBeNull();
  });

  it('falls back when IndexedDB never answers, within the 2 s cap', async () => {
    globalThis.indexedDB = silentFactory();
    localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(base));
    vi.useFakeTimers();
    let done = false;
    const loading = loadLock().then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(1999);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await loading;
    expect(done).toBe(true);
    expect(readLock()).toEqual(base);
  });

  it('honours a shorter load cap', async () => {
    globalThis.indexedDB = silentFactory();
    const started = Date.now();
    await loadLock(30);
    expect(Date.now() - started).toBeLessThan(1000);
    expect(readLock()).toBeNull();
  });
});

describe('the data erase and the lock database', () => {
  it('repo.eraseAll() leaves the lock database alone', async () => {
    // Dexie keeps the IndexedDB factory it found at start; the lock database must live in the same one here.
    globalThis.indexedDB = Dexie.dependencies.indexedDB as IDBFactory;
    await lockDb.clearLockDb();
    resetLockStoreForTests();
    await loadLock();
    await writeLock(base);
    const db = new RafiqDB('rafiq-erase-lock-test');
    await db.open();
    try {
      const repo = createDexieRepo(db);
      await repo.addSoothing('الرسم', 'user');
      await repo.eraseAll();
      expect(await repo.listSoothing()).toEqual([]);
      expect(await stored()).toEqual({ initialized: true, record: base });
    } finally {
      db.close();
      await lockDb.clearLockDb();
    }
  });
});

describe('lockStore helpers', () => {
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
});
