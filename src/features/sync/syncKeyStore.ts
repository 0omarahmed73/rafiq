/**
 * The sync identity in its own small IndexedDB database: the derived (non-extractable) AES key with the KDF
 * parameters it was derived with, the last-seen cloud version, and the auth session items. IndexedDB with strict
 * durability survives Android force-stops, which can lose recent localStorage writes. Nothing here is logged.
 *
 * Keys in the `kv` store: `key`, `meta` and `session:<name>` for the auth storage adapter.
 */
const DB_NAME = 'rafiq-sync';
const STORE = 'kv';
const KEY = 'key';
const META = 'meta';
const SESSION_PREFIX = 'session:';
const DEFAULT_TIMEOUT_MS = 2000;
const CLEAR_TIMEOUT_MS = 2500;

export interface SyncKey {
  key: CryptoKey;
  salt: string;
  /** PBKDF2 iterations used to derive `key`. */
  iter: number;
}

export interface SyncMeta {
  /** Version of the cloud copy last seen; 0 = none. */
  version: number;
  lastSyncedAt?: string;
}

function available(): boolean {
  return typeof globalThis.indexedDB !== 'undefined' && globalThis.indexedDB !== null;
}

/**
 * Opens the database, runs `work` inside one transaction and resolves with its result once the transaction has
 * completed. Rejects on any error, abort, block or timeout, never throws synchronously, and always closes the
 * connection.
 */
function run<T>(mode: IDBTransactionMode, timeoutMs: number, work: (store: IDBObjectStore) => () => T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let db: IDBDatabase | undefined;
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (error?: unknown, value?: T) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        db?.close();
      } catch {
        // already closed
      }
      if (error !== undefined) reject(error);
      else resolve(value as T);
    };

    try {
      if (!available()) throw new Error('IndexedDB is not available');
      timer = setTimeout(() => finish(new Error('IndexedDB timed out')), timeoutMs);
      const request = globalThis.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      };
      request.onblocked = () => finish(new Error('IndexedDB open was blocked'));
      request.onerror = () => finish(request.error ?? new Error('IndexedDB open failed'));
      request.onsuccess = () => {
        db = request.result;
        db.onversionchange = () => {
          db?.close();
          finish(new Error('IndexedDB version changed'));
        };
        if (settled) {
          // timed out or blocked earlier: do not leave this connection open
          db.close();
          return;
        }
        let tx: IDBTransaction | undefined;
        try {
          const opened =
            mode === 'readwrite' ? db.transaction(STORE, mode, { durability: 'strict' }) : db.transaction(STORE, mode);
          tx = opened;
          const result = work(opened.objectStore(STORE));
          opened.oncomplete = () => finish(undefined, result());
          opened.onerror = () => finish(opened.error ?? new Error('IndexedDB transaction failed'));
          opened.onabort = () => finish(opened.error ?? new Error('IndexedDB transaction aborted'));
        } catch (error) {
          try {
            // a throw inside the body must not let a partial transaction auto-commit
            tx?.abort();
          } catch {
            // already finished
          }
          finish(error ?? new Error('IndexedDB transaction failed'));
        }
      };
    } catch (error) {
      finish(error ?? new Error('IndexedDB failed'));
    }
  });
}

function isSyncKey(value: unknown): value is SyncKey {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<SyncKey>;
  return (
    typeof CryptoKey !== 'undefined' &&
    v.key instanceof CryptoKey &&
    typeof v.salt === 'string' &&
    typeof v.iter === 'number'
  );
}

/** The cached key, or null when there is none, it is unreadable or IndexedDB is unavailable. */
export function loadSyncKey(): Promise<SyncKey | null> {
  return run('readonly', DEFAULT_TIMEOUT_MS, (store) => {
    const request = store.get(KEY);
    return () => (isSyncKey(request.result) ? request.result : null);
  }).catch(() => null);
}

export function saveSyncKey(k: SyncKey): Promise<void> {
  return run('readwrite', DEFAULT_TIMEOUT_MS, (store) => {
    store.put({ key: k.key, salt: k.salt, iter: k.iter }, KEY);
    return () => undefined;
  });
}

export function clearSyncKey(): Promise<void> {
  return run('readwrite', DEFAULT_TIMEOUT_MS, (store) => {
    store.delete(KEY);
    return () => undefined;
  });
}

/** The last-seen cloud version; `{ version: 0 }` when nothing is stored or IndexedDB fails. */
export function loadSyncMeta(): Promise<SyncMeta> {
  return run('readonly', DEFAULT_TIMEOUT_MS, (store) => {
    const request = store.get(META);
    return (): SyncMeta => {
      const v = request.result as Partial<SyncMeta> | undefined;
      if (!v || typeof v.version !== 'number') return { version: 0 };
      return typeof v.lastSyncedAt === 'string' ? { version: v.version, lastSyncedAt: v.lastSyncedAt } : { version: v.version };
    };
  }).catch((): SyncMeta => ({ version: 0 }));
}

export function saveSyncMeta(m: SyncMeta): Promise<void> {
  return run('readwrite', DEFAULT_TIMEOUT_MS, (store) => {
    store.put(m, META);
    return () => undefined;
  });
}

/** The async `storage` adapter for supabase-js auth. A read that fails reads as "no session". */
export function createSessionStorage(): {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
} {
  return {
    getItem: (name) =>
      run('readonly', DEFAULT_TIMEOUT_MS, (store) => {
        const request = store.get(SESSION_PREFIX + name);
        return () => (typeof request.result === 'string' ? request.result : null);
      }).catch(() => null),
    setItem: (name, value) =>
      run('readwrite', DEFAULT_TIMEOUT_MS, (store) => {
        store.put(value, SESSION_PREFIX + name);
        return () => undefined;
      }),
    removeItem: (name) =>
      run('readwrite', DEFAULT_TIMEOUT_MS, (store) => {
        store.delete(SESSION_PREFIX + name);
        return () => undefined;
      }),
  };
}

/** Deletes the key, the meta and every session item. Never rejects and resolves within `timeoutMs`. */
export function clearSyncIdentity(timeoutMs: number = CLEAR_TIMEOUT_MS): Promise<void> {
  return run('readwrite', timeoutMs, (store) => {
    store.delete(KEY);
    store.delete(META);
    store.delete(IDBKeyRange.bound(SESSION_PREFIX, SESSION_PREFIX + '￿'));
    return () => undefined;
  }).then(
    () => undefined,
    () => undefined,
  );
}
