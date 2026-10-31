import Dexie, { type Table } from 'dexie';
import type { Repo } from './repo';
import { legacyHomework } from './legacyHomework';
import type { Session } from './schema';
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
    this.version(2).stores({ yearPlan: 'id' });
    this.version(3)
      .stores({ homework: 'id, sessionId, createdAt', homeworkImages: 'id, homeworkId' })
      .upgrade(async (tx) => {
        // Homework used to be a list of {text, done} inside each session; it becomes its own records.
        for (const session of (await tx.table('sessions').toArray()) as Session[]) {
          if (!session.homework?.length) continue;
          await tx.table('homework').bulkPut(legacyHomework(session));
          await tx.table('sessions').put({ ...session, homework: [] });
        }
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
    remove: async (table, key) => {
      await db.table(table).delete(key);
    },
    clear: async (table) => {
      await db.table(table).clear();
    },
    where: (table, field, value) => db.table(table).where(field).equals(value).toArray(),
    keysWhere: async (table, field, value) => (await db.table(table).where(field).equals(value).primaryKeys()) as (string | number)[],
    countWhere: (table, field, value) => db.table(table).where(field).equals(value).count(),
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
