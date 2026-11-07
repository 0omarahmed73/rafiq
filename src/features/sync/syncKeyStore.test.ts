import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

describe('syncKeyStore', () => {
  const original = globalThis.indexedDB;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  afterEach(() => {
    globalThis.indexedDB = original;
  });

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
    const started = Date.now();
    await expect(clearSyncIdentity(100)).resolves.toBeUndefined();
    expect(Date.now() - started).toBeLessThan(1000);
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
