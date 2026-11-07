import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLockDb, LOCK_DB_NAME, lockDbAvailable, readLockDb, writeLockDb } from './lockDb';

const record = { v: 1, pin: { salt: 'abc', hash: 'def' }, failures: 0 };

/** Every key and value in the raw store, read through an independent connection. */
function rawStore(): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(LOCK_DB_NAME, 1);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const out: Record<string, unknown> = {};
      const cursor = db.transaction('kv', 'readonly').objectStore('kv').openCursor();
      cursor.onerror = () => reject(cursor.error);
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (c) {
          out[String(c.key)] = c.value;
          c.continue();
        } else {
          db.close();
          resolve(out);
        }
      };
    };
  });
}

/** A factory whose open request never answers. */
function silentFactory(): IDBFactory {
  return { open: () => ({}) } as unknown as IDBFactory;
}

describe('lockDb', () => {
  const original = globalThis.indexedDB;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  afterEach(() => {
    globalThis.indexedDB = original;
    vi.restoreAllMocks();
  });

  it('reads a fresh database as uninitialized with no record', async () => {
    await expect(readLockDb()).resolves.toEqual({
      initialized: false,
      record: undefined,
    });
  });

  it('reads back what was written', async () => {
    await writeLockDb(record);
    await expect(readLockDb()).resolves.toEqual({ initialized: true, record });
  });

  it('overwrites an earlier record', async () => {
    const second = { ...record, failures: 3 };
    await writeLockDb(record);
    await writeLockDb(second);
    await expect(readLockDb()).resolves.toEqual({
      initialized: true,
      record: second,
    });
  });

  it('clears to initialized with no record', async () => {
    await writeLockDb(record);
    await clearLockDb();
    await expect(readLockDb()).resolves.toEqual({
      initialized: true,
      record: undefined,
    });
  });

  it('clears a fresh database to initialized with no record', async () => {
    await clearLockDb();
    await expect(readLockDb()).resolves.toEqual({
      initialized: true,
      record: undefined,
    });
  });

  it('stores only the lock and initialized keys', async () => {
    await writeLockDb(record);
    expect(await rawStore()).toEqual({ lock: record, initialized: true });
    await clearLockDb();
    expect(await rawStore()).toEqual({ initialized: true });
  });

  it('reports unavailable and rejects without indexedDB', async () => {
    // @ts-expect-error simulating a missing IndexedDB
    globalThis.indexedDB = undefined;
    expect(lockDbAvailable()).toBe(false);
    await expect(readLockDb()).rejects.toBeDefined();
    await expect(writeLockDb(record)).rejects.toBeDefined();
    await expect(clearLockDb()).rejects.toBeDefined();
  });

  it('reports available when indexedDB exists', () => {
    expect(lockDbAvailable()).toBe(true);
  });

  it('rejects when open never answers', async () => {
    globalThis.indexedDB = silentFactory();
    await expect(readLockDb(20)).rejects.toBeDefined();
    await expect(writeLockDb(record, 20)).rejects.toBeDefined();
    await expect(clearLockDb(20)).rejects.toBeDefined();
  });

  it('rejects and closes the connection when the transaction aborts', async () => {
    const close = vi.spyOn(IDBDatabase.prototype, 'close');
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new Error('put failed');
    });
    await expect(writeLockDb(record)).rejects.toBeDefined();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('closes the connection after success', async () => {
    const close = vi.spyOn(IDBDatabase.prototype, 'close');
    await writeLockDb(record);
    await readLockDb();
    expect(close).toHaveBeenCalledTimes(2);
  });

  it('aborts mid-write: rejects, closes, and leaves the stored value unchanged', async () => {
    await writeLockDb(record);
    const close = vi.spyOn(IDBDatabase.prototype, 'close');
    const put = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, ...args) {
      const result = put.apply(this, args as Parameters<typeof put>);
      this.transaction.abort();
      return result;
    });
    await expect(writeLockDb({ ...record, failures: 9 })).rejects.toBeDefined();
    expect(close).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
    await expect(readLockDb()).resolves.toEqual({ initialized: true, record });
  });

  it('passes strict durability to writes only', async () => {
    const tx = vi.spyOn(IDBDatabase.prototype, 'transaction');
    await writeLockDb(record);
    await clearLockDb();
    await readLockDb();
    const calls = tx.mock.calls.filter(([stores]) => stores === 'kv');
    expect(calls[0][2]).toEqual({ durability: 'strict' });
    expect(calls[1][2]).toEqual({ durability: 'strict' });
    expect(calls[2][2]).toBeUndefined();
  });

  it('closes a connection that opens only after the timeout, rejecting once', async () => {
    const close = vi.fn();
    const request: Record<string, unknown> = {};
    globalThis.indexedDB = { open: () => request } as unknown as IDBFactory;
    const outcome = readLockDb(10).then(
      () => 'resolved',
      () => 'rejected',
    );
    await expect(outcome).resolves.toBe('rejected');
    request.result = { close, transaction: vi.fn() };
    (request.onsuccess as () => void)();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('rejects when the open is blocked', async () => {
    const request: Record<string, unknown> = {};
    globalThis.indexedDB = { open: () => request } as unknown as IDBFactory;
    const pending = readLockDb(5000);
    (request.onblocked as () => void)();
    await expect(pending).rejects.toBeDefined();
  });

  it('leaves no timers pending after a successful write', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const done = writeLockDb(record);
      await vi.waitFor(() => expect(vi.getTimerCount()).toBeLessThanOrEqual(1));
      vi.useRealTimers();
      await done;
    } finally {
      vi.useRealTimers();
    }
  });
});
