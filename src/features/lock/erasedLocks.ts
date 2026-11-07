import type { LockRecord } from './lockStore';

/**
 * Remembers, in IndexedDB, the PINs of lock records that an erase removed.
 *
 * Android WebView writes localStorage to disk late (on the emulator, none of a whole session's writes had reached
 * the disk), so after a force-stop an erased record, or an even older PIN that is still on disk, can come back.
 * IndexedDB commits each transaction to disk, the same way the database erase itself survives. So every PIN the
 * app holds is noted here, an erase marks all of them erased, and the next start drops any record with one of them.
 * Every error here is swallowed: this is a safeguard, and an erase must still work without it.
 */
const DB_NAME = 'rafiq.lock.erased';
const STORE = 'erased';
const ERASED = 'pins';
const SEEN = 'seen';
const KEEP = 50;

function fingerprint(record: LockRecord): string {
  return `${record.pin.salt}:${record.pin.hash}`;
}

function done(request: IDBRequest | IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    if ('oncomplete' in request) {
      request.oncomplete = () => resolve();
      request.onabort = () => reject(request.error);
    } else {
      request.onsuccess = () => resolve();
    }
    request.onerror = () => reject(request.error);
  });
}

async function open(): Promise<IDBDatabase> {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE);
  await done(request);
  return request.result;
}

async function readPins(db: IDBDatabase, key: string): Promise<string[]> {
  const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
  await done(request);
  const value: unknown = request.result;
  return Array.isArray(value) ? value.filter((p): p is string => typeof p === 'string') : [];
}

async function addPins(key: string, add: string[]): Promise<void> {
  const db = await open();
  try {
    const pins = await readPins(db, key);
    if (add.every((p) => pins.includes(p))) return;
    const tx = db.transaction(STORE, 'readwrite', { durability: 'strict' });
    tx.objectStore(STORE).put([...new Set([...add, ...pins])].slice(0, KEEP), key);
    await done(tx);
  } finally {
    db.close();
  }
}

/** Notes a PIN the app holds, so a later erase also covers it if it is the copy still on disk. */
export async function noteLock(record: LockRecord): Promise<void> {
  try {
    await addPins(SEEN, [fingerprint(record)]);
  } catch {
    // no durable store: an erase covers only the records it is given
  }
}

/** Marks these records' PINs, and every PIN noted before, as erased; resolves once that is on disk. */
export async function rememberErased(records: LockRecord[]): Promise<void> {
  let seen: string[] = [];
  try {
    const db = await open();
    try {
      seen = await readPins(db, SEEN);
    } finally {
      db.close();
    }
  } catch {
    // erase what we were given
  }
  try {
    await addPins(ERASED, [...records.map(fingerprint), ...seen]);
  } catch {
    // no durable store: the erase goes on without the safeguard
  }
}

/** True when an erase removed this record before; false when unsure. */
export async function wasErased(record: LockRecord): Promise<boolean> {
  try {
    const db = await open();
    try {
      return (await readPins(db, ERASED)).includes(fingerprint(record));
    } finally {
      db.close();
    }
  } catch {
    return false;
  }
}
