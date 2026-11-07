import type { LockRecord } from './lockStore';

/**
 * Remembers, in IndexedDB, which lock records an erase removed, so a removed record that comes back from disk is
 * treated as no lock.
 *
 * Why: Android WebView writes localStorage to disk late (on the emulator, none of a whole session's writes had
 * reached the disk), so after a force-stop an erased record, or an even older PIN that is still on disk, can come
 * back. IndexedDB commits each transaction to disk, the same way the database erase itself survives. So every
 * record the app holds is noted here, an erase marks all of them erased, and each start drops a stored record that
 * was marked.
 *
 * Only the PIN's salt is kept (16 random bytes made for that one secret; it says nothing about the PIN), never a
 * hash. A new set-up or PIN change gets a fresh salt, so a new lock never matches. Entries written by the first
 * version of this module were `salt:hash`; they are read as their salt and rewritten as salts on the next write.
 *
 * Limits (open owner decision, recorded in HANDOFF):
 * - This covers ERASE only. ANY localStorage write of the lock (set-up, PIN change, turning off, the failure count
 *   and blockedUntil) can be lost the same way if Android force-stops the app before the WebView writes it out.
 *   The durable fix is to move the lock record itself to IndexedDB or a native plugin.
 * - Fail-open case: after an erase marks record A, if the person sets up lock B and B's write is lost, the stale A
 *   that comes back from disk is dropped on start and the app opens with no lock. (Before this module, the stale A
 *   came back and kept the app locked with the old PIN over an empty app.) This is accepted and kept.
 *
 * Every error here is swallowed: this is a safeguard, and an erase must still work without it.
 */
const DB_NAME = 'rafiq.lock.erased';
const STORE = 'erased';
const ERASED = 'pins';
const SEEN = 'seen';
const KEEP = 50;

function marker(record: LockRecord): string {
  return record.pin.salt;
}

/** Reads a stored list as salts; a legacy `salt:hash` entry counts as its salt. */
function salts(value: unknown): { list: string[]; legacy: boolean } {
  if (!Array.isArray(value)) return { list: [], legacy: false };
  let legacy = false;
  const list = value
    .filter((p): p is string => typeof p === 'string')
    .map((p) => {
      if (!p.includes(':')) return p;
      legacy = true;
      return p.slice(0, p.indexOf(':'));
    });
  return { list: [...new Set(list)], legacy };
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * In ONE readwrite transaction: reads the lists named in `read`, lets `change` compute the new value of `key`
 * from them, and writes it when it differs (or when a legacy entry must be rewritten). Resolves once on disk.
 */
async function readModifyWrite(
  read: string[],
  key: string,
  change: (lists: Record<string, string[]>) => string[],
): Promise<void> {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite', { durability: 'strict' });
      const store = tx.objectStore(STORE);
      const lists: Record<string, string[]> = {};
      let legacy = false;
      let pending = read.length;
      for (const name of read) {
        const get = store.get(name);
        get.onsuccess = () => {
          const parsed = salts(get.result);
          lists[name] = parsed.list;
          if (name === key) legacy = parsed.legacy;
          if (--pending > 0) return;
          const before = lists[key] ?? [];
          const next = change(lists).slice(0, KEEP);
          const same = next.length === before.length && next.every((p, i) => p === before[i]);
          if (!same || legacy) store.put(next, key);
        };
      }
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Notes a record the app holds, so a later erase also covers it if it is the copy still on disk. */
export async function noteLock(record: LockRecord): Promise<void> {
  try {
    const add = marker(record);
    await readModifyWrite([SEEN], SEEN, ({ [SEEN]: seen }) => (seen.includes(add) ? seen : [add, ...seen]));
  } catch {
    // no durable store: an erase covers only the records it is given
  }
}

/** Marks these records, and every record noted before, as erased; resolves once that is on disk. */
export async function rememberErased(records: LockRecord[]): Promise<void> {
  try {
    await readModifyWrite([ERASED, SEEN], ERASED, ({ [ERASED]: erased, [SEEN]: seen }) => [
      ...new Set([...records.map(marker), ...seen, ...erased]),
    ]);
  } catch {
    // no durable store: the erase goes on without the safeguard
  }
}

/** True when an erase removed this record before; false when unsure. */
export async function wasErased(record: LockRecord): Promise<boolean> {
  try {
    const db = await open();
    try {
      const value = await new Promise<unknown>((resolve, reject) => {
        const get = db.transaction(STORE, 'readonly').objectStore(STORE).get(ERASED);
        get.onsuccess = () => resolve(get.result);
        get.onerror = () => reject(get.error);
      });
      return salts(value).list.includes(marker(record));
    } finally {
      db.close();
    }
  } catch {
    return false;
  }
}
