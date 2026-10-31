import { createDexieRepo, RafiqDB } from './dexieRepo';
import { createMemoryRepo } from './memoryRepo';
import type { Repo } from './repo';

async function openDexie(): Promise<RafiqDB> {
  const db = new RafiqDB();
  await db.open();
  return db;
}

/**
 * Opens IndexedDB. When it is unavailable (private mode, blocked storage) the app
 * still runs on an in-memory repo and `persistent` is false so the UI can warn.
 */
export async function openDb(
  open: () => Promise<RafiqDB> = openDexie,
): Promise<{ repo: Repo; persistent: boolean }> {
  try {
    return { repo: createDexieRepo(await open()), persistent: true };
  } catch {
    return { repo: createMemoryRepo(), persistent: false };
  }
}
