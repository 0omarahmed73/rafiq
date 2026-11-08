import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearSyncIdentity,
  clearSyncKey,
  createSessionStorage,
  loadSyncKey,
  loadSyncMeta,
  saveSyncKey,
  saveSyncMeta,
} from './syncKeyStore';

async function makeKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** A factory whose open request never answers. */
function silentFactory(): IDBFactory {
  return { open: () => ({}) } as unknown as IDBFactory;
}

type FakeRequest = Record<string, any>;

/** A factory whose open request is driven by the test: `requests` collects every request it hands out. */
function drivenFactory(requests: FakeRequest[]): IDBFactory {
  return {
    open: () => {
      const request: FakeRequest = {};
      requests.push(request);
      return request;
    },
  } as unknown as IDBFactory;
}

/** Raw access to the store through an independent connection. */
function rawDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('rafiq-sync', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('kv');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => resolve(open.result);
  });
}

async function rawPut(key: string, value: unknown): Promise<void> {
  const db = await rawDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function rawGet(key: string): Promise<unknown> {
  const db = await rawDb();
  const value = await new Promise<unknown>((resolve, reject) => {
    const request = db.transaction('kv', 'readonly').objectStore('kv').get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
}

describe('syncKeyStore', () => {
  const original = globalThis.indexedDB;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  afterEach(() => {
    globalThis.indexedDB = original;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** Only setTimeout is faked: fake-indexeddb schedules its work with setImmediate. */
  const fakeTimeouts = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

  it('loads null from a fresh database', async () => {
    await expect(loadSyncKey()).resolves.toBeNull();
  });

  it('round-trips a non-extractable key with its salt and iterations', async () => {
    const key = await makeKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = new TextEncoder().encode('hello');
    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

    await saveSyncKey({ key, salt: 'c2FsdA==', iter: 600000 });
    const loaded = await loadSyncKey();

    expect(loaded?.salt).toBe('c2FsdA==');
    expect(loaded?.iter).toBe(600000);
    expect(loaded?.key.extractable).toBe(false);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, loaded!.key, cipher);
    expect(new TextDecoder().decode(plain)).toBe('hello');
  });

  it('clearSyncKey removes only the key', async () => {
    await saveSyncKey({ key: await makeKey(), salt: 's', iter: 1 });
    await saveSyncMeta({ version: 3 });
    await clearSyncKey();
    await expect(loadSyncKey()).resolves.toBeNull();
    await expect(loadSyncMeta()).resolves.toEqual({ version: 3 });
  });

  it('loads the default meta and round-trips a saved one', async () => {
    await expect(loadSyncMeta()).resolves.toEqual({ version: 0 });
    await saveSyncMeta({ version: 4, lastSyncedAt: '2026-11-08T10:00:00.000Z' });
    await expect(loadSyncMeta()).resolves.toEqual({ version: 4, lastSyncedAt: '2026-11-08T10:00:00.000Z' });
  });

  it('session adapter sets, gets and removes items', async () => {
    const storage = createSessionStorage();
    await expect(storage.getItem('missing')).resolves.toBeNull();
    await storage.setItem('sb-auth', 'token-json');
    await expect(storage.getItem('sb-auth')).resolves.toBe('token-json');
    await storage.removeItem('sb-auth');
    await expect(storage.getItem('sb-auth')).resolves.toBeNull();
  });

  it('clearSyncIdentity removes the key, the meta and every session item, twice without error', async () => {
    const storage = createSessionStorage();
    await saveSyncKey({ key: await makeKey(), salt: 's', iter: 1 });
    await saveSyncMeta({ version: 2 });
    await storage.setItem('a', '1');
    await storage.setItem('b', '2');

    await clearSyncIdentity();
    await expect(loadSyncKey()).resolves.toBeNull();
    await expect(loadSyncMeta()).resolves.toEqual({ version: 0 });
    await expect(storage.getItem('a')).resolves.toBeNull();
    await expect(storage.getItem('b')).resolves.toBeNull();

    await expect(clearSyncIdentity()).resolves.toBeUndefined();
  });

  it('clearSyncIdentity resolves within its timeout when IndexedDB never answers', async () => {
    globalThis.indexedDB = silentFactory();
    fakeTimeouts();
    let done = false;
    const promise = clearSyncIdentity(100).then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(99);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await promise;
    expect(done).toBe(true);
  });

  it('clearSyncIdentity defaults to a 2500 ms timeout', async () => {
    globalThis.indexedDB = silentFactory();
    fakeTimeouts();
    let done = false;
    const promise = clearSyncIdentity().then(() => {
      done = true;
    });
    await vi.advanceTimersByTimeAsync(2499);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await promise;
  });

  it('clearSyncIdentity leaves unrelated keys alone', async () => {
    await saveSyncKey({ key: await makeKey(), salt: 's', iter: 1 });
    await rawPut('other', 'keep');
    await rawPut('sessions', 'keep too');
    await clearSyncIdentity();
    await expect(loadSyncKey()).resolves.toBeNull();
    await expect(rawGet('other')).resolves.toBe('keep');
    await expect(rawGet('sessions')).resolves.toBe('keep too');
  });

  it.each([
    ['a missing iter', async () => ({ key: await makeKey(), salt: 's' })],
    ['a zero iter', async () => ({ key: await makeKey(), salt: 's', iter: 0 })],
    ['a fractional iter', async () => ({ key: await makeKey(), salt: 's', iter: 1.5 })],
    ['a key that is not a CryptoKey', async () => ({ key: 'nope', salt: 's', iter: 1 })],
    ['a non-string salt', async () => ({ key: await makeKey(), salt: 5, iter: 1 })],
    ['an empty salt', async () => ({ key: await makeKey(), salt: '', iter: 1 })],
    ['a non-object', async () => 'junk'],
    ['a non-string account', async () => ({ key: await makeKey(), salt: 's', iter: 1, userId: 7 })],
  ])('loadSyncKey is null for a stored record with %s', async (_name, make) => {
    await rawPut('key', await make());
    await expect(loadSyncKey()).resolves.toBeNull();
  });

  it('keeps the account a key belongs to, and still loads a key cached without one', async () => {
    const key = await makeKey();
    await saveSyncKey({ key, salt: 's', iter: 1, userId: 'user-1' });
    await expect(loadSyncKey()).resolves.toMatchObject({ salt: 's', iter: 1, userId: 'user-1' });
    await rawPut('key', { key, salt: 's', iter: 1 });
    const legacy = await loadSyncKey();
    expect(legacy).toMatchObject({ salt: 's', iter: 1 });
    expect(legacy!.userId).toBeUndefined();
  });

  it('loadSyncMeta falls back to the default for a malformed record', async () => {
    await rawPut('meta', { version: 'x' });
    await expect(loadSyncMeta()).resolves.toEqual({ version: 0 });
  });

  it('rejects when the open request errors, and the read paths degrade', async () => {
    const requests: FakeRequest[] = [];
    globalThis.indexedDB = drivenFactory(requests);
    const failing = saveSyncMeta({ version: 1 });
    const assertion = expect(failing).rejects.toThrow('IndexedDB open failed');
    requests[0].onerror();
    await assertion;
  });

  it('rejects when the open request is blocked', async () => {
    const requests: FakeRequest[] = [];
    globalThis.indexedDB = drivenFactory(requests);
    const assertion = expect(saveSyncMeta({ version: 1 })).rejects.toThrow('blocked');
    requests[0].onblocked();
    await assertion;
    const loaded = loadSyncMeta();
    requests[1].onblocked();
    await expect(loaded).resolves.toEqual({ version: 0 });
  });

  it('closes a connection that opens after the call timed out, and settles once', async () => {
    const requests: FakeRequest[] = [];
    globalThis.indexedDB = drivenFactory(requests);
    fakeTimeouts();
    const assertion = expect(saveSyncMeta({ version: 1 })).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(2000);
    await assertion;

    const db = { close: vi.fn(), transaction: vi.fn() };
    requests[0].result = db;
    requests[0].onsuccess();
    expect(db.close).toHaveBeenCalledTimes(1);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('closes the connection after a normal call', async () => {
    const close = vi.spyOn(IDBDatabase.prototype, 'close');
    await saveSyncMeta({ version: 1 });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('save and clear calls reject on timeout', async () => {
    globalThis.indexedDB = silentFactory();
    fakeTimeouts();
    const key = await makeKey();
    const calls = [saveSyncKey({ key, salt: 's', iter: 1 }), saveSyncMeta({ version: 1 }), clearSyncKey()];
    const assertions = calls.map((call) => expect(call).rejects.toThrow('timed out'));
    await vi.advanceTimersByTimeAsync(2000);
    await Promise.all(assertions);
  });

  it('load calls degrade on timeout', async () => {
    globalThis.indexedDB = silentFactory();
    fakeTimeouts();
    const key = loadSyncKey();
    const meta = loadSyncMeta();
    await vi.advanceTimersByTimeAsync(2000);
    await expect(key).resolves.toBeNull();
    await expect(meta).resolves.toEqual({ version: 0 });
  });

  it('session adapter getItem swallows a failure while setItem and removeItem reject', async () => {
    // @ts-expect-error simulate a missing IndexedDB
    globalThis.indexedDB = undefined;
    const storage = createSessionStorage();
    await expect(storage.getItem('a')).resolves.toBeNull();
    await expect(storage.setItem('a', 'b')).rejects.toBeDefined();
    await expect(storage.removeItem('a')).rejects.toBeDefined();
  });

  it('clearSyncIdentity resolves when IndexedDB is unavailable', async () => {
    // @ts-expect-error simulate a missing IndexedDB
    globalThis.indexedDB = undefined;
    await expect(clearSyncIdentity()).resolves.toBeUndefined();
  });

  it('degrades when IndexedDB is unavailable', async () => {
    // @ts-expect-error simulate a missing IndexedDB
    globalThis.indexedDB = undefined;
    await expect(loadSyncKey()).resolves.toBeNull();
    await expect(loadSyncMeta()).resolves.toEqual({ version: 0 });
    await expect(saveSyncKey({ key: await makeKey(), salt: 's', iter: 1 })).rejects.toBeDefined();
  });
});
