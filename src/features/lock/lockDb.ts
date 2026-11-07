/**
 * The lock record in its own small IndexedDB database. Android WebView writes localStorage to disk late, so a
 * force-stop can lose recent writes; an IndexedDB transaction with strict durability is on disk when it completes.
 * It is separate from the Dexie 'rafiq' database, so backups, exports and the data erase never touch it.
 *
 * Keys in the `kv` store: `lock` (the record, as given) and `initialized` (`true` once anything was written, so an
 * erased lock reads as "initialized, no record").
 */
export const LOCK_DB_NAME = 'rafiq-lock';
const STORE = 'kv';
const LOCK = 'lock';
const INITIALIZED = 'initialized';
const DEFAULT_TIMEOUT_MS = 2000;

export interface LockDbState {
  initialized: boolean;
  record: unknown | undefined;
}

export function lockDbAvailable(): boolean {
  return typeof globalThis.indexedDB !== 'undefined' && globalThis.indexedDB !== null;
}

/**
 * Opens the database, runs `work` inside one transaction and resolves with its result once the transaction has
 * completed. Rejects on any error, abort, block or timeout, and always closes the connection.
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
      if (!lockDbAvailable()) throw new Error('IndexedDB is not available');
      timer = setTimeout(() => finish(new Error('IndexedDB timed out')), timeoutMs);
      const request = globalThis.indexedDB.open(LOCK_DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      };
      request.onblocked = () => finish(new Error('IndexedDB open was blocked'));
      request.onerror = () => finish(request.error ?? new Error('IndexedDB open failed'));
      request.onsuccess = () => {
        db = request.result;
        db.onversionchange = () => db?.close();
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

export function readLockDb(timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<LockDbState> {
  return run('readonly', timeoutMs, (store) => {
    const initialized = store.get(INITIALIZED);
    const lock = store.get(LOCK);
    return () => ({
      initialized: initialized.result === true,
      record: lock.result,
    });
  });
}

/**
 * Writes the record durably. A rejection (especially a timeout) means the outcome is UNKNOWN: the write may still
 * have committed. Callers must treat it as 'unknown', not as 'not written'.
 */
export function writeLockDb(record: unknown, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<void> {
  return run('readwrite', timeoutMs, (store) => {
    store.put(record, LOCK);
    store.put(true, INITIALIZED);
    return () => undefined;
  });
}

/** Erases the record durably. A rejection (especially a timeout) leaves the outcome UNKNOWN, as for writeLockDb. */
export function clearLockDb(timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<void> {
  return run('readwrite', timeoutMs, (store) => {
    store.delete(LOCK);
    store.put(true, INITIALIZED);
    return () => undefined;
  });
}
