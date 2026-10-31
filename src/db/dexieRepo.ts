import Dexie, { type Table } from 'dexie';
import type { Repo } from './repo';
import { createRepo, type Store } from './repoCore';

export class RafiqDB extends Dexie {
  constructor(name = 'rafiq') {
    super(name);
    this.version(1).stores({
      checkins: 'id, day, at',
      practices: 'id, practiceId, stepId, startedAt',
      followups: 'id, practiceRecordId',
      letters: 'id',
      weeklyReviews: 'id, weekStart',
      sessions: 'id, date',
      stepProgress: 'stepId',
      soothingList: 'id',
      settings: 'id',
      agendaPoints: 'id',
    });
  }
}

export function createDexieStore(db: RafiqDB): Store {
  return {
    all: (table) => db.table(table).toArray(),
    get: (table, key) => db.table(table).get(key),
    put: async (table, row) => {
      await db.table(table).put(row);
    },
    clear: async (table) => {
      await db.table(table).clear();
    },
    // Dexie's overloads for `transaction` blow up the type checker; this loose shape is all we use.
    transaction: <T>(fn: () => Promise<T>) =>
      (db.transaction as unknown as (mode: 'rw', tables: Table[], scope: () => Promise<T>) => Promise<T>).call(
        db,
        'rw',
        db.tables as unknown as Table[],
        fn,
      ),
  };
}

export function createDexieRepo(db: RafiqDB): Repo {
  return createRepo(createDexieStore(db));
}
