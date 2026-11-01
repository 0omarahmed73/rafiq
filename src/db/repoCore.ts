import { dayKey } from '../lib/dates';
import { MAX_PHOTOS } from '../lib/image';
import { newId, type DayRange, type Draft, type NewRecord, type Repo } from './repo';
import type {
  AgendaPoint,
  AllData,
  Checkin,
  Followup,
  Homework,
  HomeworkImage,
  Letter,
  Note,
  PracticeRecord,
  Settings,
  SoothingItem,
  SyncTombstone,
  StepProgress,
  TableName,
  SyncableTableName,
} from './schema';

/** The minimal storage a Repo needs; Dexie and an in-memory Map both implement it. */
export interface Store {
  all<T>(table: TableName): Promise<T[]>;
  get<T>(table: TableName, key: string | number): Promise<T | undefined>;
  put(table: TableName, row: unknown): Promise<void>;
  remove(table: TableName, key: string | number): Promise<void>;
  clear(table: TableName): Promise<void>;
  /** Rows whose indexed `field` equals `value`; reads only those rows, not the whole table. */
  where<T>(table: TableName, field: string, value: string | number): Promise<T[]>;
  /** Primary keys of the rows whose indexed `field` equals `value`, without reading the rows. */
  keysWhere(table: TableName, field: string, value: string | number): Promise<(string | number)[]>;
  /** How many rows have the indexed `field` equal to `value`, without reading them. */
  countWhere(table: TableName, field: string, value: string | number): Promise<number>;
  /** Runs `fn` atomically; a throw leaves the store unchanged. */
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

export const DATA_TABLES: SyncableTableName[] = [
  'checkins',
  'practices',
  'followups',
  'letters',
  'weeklyReviews',
  'sessions',
  'stepProgress',
  'soothingList',
  'settings',
  'agendaPoints',
  'yearPlan',
  'homework',
  'homeworkImages',
  'notes',
];

export const TABLES: TableName[] = [...DATA_TABLES, 'syncTombstones'];

/** Primary key field of each table. */
export const KEY_FIELD: Record<TableName, 'id' | 'stepId'> = {
  checkins: 'id',
  practices: 'id',
  followups: 'id',
  letters: 'id',
  weeklyReviews: 'id',
  sessions: 'id',
  stepProgress: 'stepId',
  soothingList: 'id',
  settings: 'id',
  agendaPoints: 'id',
  yearPlan: 'id',
  homework: 'id',
  homeworkImages: 'id',
  notes: 'id',
  syncTombstones: 'id',
};

const nowIso = () => new Date().toISOString();
const inRange = (day: string, r: DayRange) => day >= r.from && day <= r.to;
const tombstoneId = (table: SyncableTableName, recordId: string) => `${table}:${encodeURIComponent(recordId)}`;

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function choose<T extends { updatedAt: string }>(a: T | undefined, b: T | undefined): T | undefined {
  if (!a) return b;
  if (!b) return a;
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
  return stableStringify(a) >= stableStringify(b) ? a : b;
}

function recordKey(table: SyncableTableName, row: Record<string, unknown>): string {
  return String(row[KEY_FIELD[table]]);
}

function tombstoneFor(table: SyncableTableName, recordId: string, deletedAt = nowIso()): SyncTombstone {
  return { id: tombstoneId(table, recordId), table, recordId, deletedAt, updatedAt: deletedAt };
}

async function markDeleted(store: Store, table: SyncableTableName, recordId: string, recordUpdatedAt: string): Promise<void> {
  const id = tombstoneId(table, recordId);
  const previous = await store.get<SyncTombstone>('syncTombstones', id);
  const deletedAt = [nowIso(), recordUpdatedAt, previous?.updatedAt ?? ''].sort().at(-1)!;
  await store.put('syncTombstones', tombstoneFor(table, recordId, deletedAt));
}

/** Merge two snapshots deterministically. A delete wins an equal-time update. */
export function mergeSnapshots(local: AllData, incoming: AllData): AllData {
  const result = Object.fromEntries(DATA_TABLES.map((table) => [table, []])) as unknown as AllData;
  const tombstones = new Map<string, SyncTombstone>();
  for (const marker of [...(local.syncTombstones ?? []), ...(incoming.syncTombstones ?? [])]) {
    const id = tombstoneId(marker.table, marker.recordId);
    const normalized = { ...marker, id };
    const key = `${marker.table}\u0000${marker.recordId}`;
    tombstones.set(key, choose(tombstones.get(key), normalized)!);
  }

  for (const table of DATA_TABLES) {
    const localRows = local[table] as unknown as Record<string, unknown>[];
    const incomingRows = incoming[table] as unknown as Record<string, unknown>[];
    const candidates = new Map<string, Record<string, unknown>>();
    for (const row of [...(localRows ?? []), ...(incomingRows ?? [])]) {
      const key = recordKey(table, row);
      const current = candidates.get(key) as (Record<string, unknown> & { updatedAt: string }) | undefined;
      candidates.set(key, choose(current, row as Record<string, unknown> & { updatedAt: string })!);
    }

    for (const [key, row] of candidates) {
      const markerKey = `${table}\u0000${key}`;
      const marker = tombstones.get(markerKey);
      if (marker && marker.updatedAt >= String(row.updatedAt)) continue;
      (result[table] as unknown as Record<string, unknown>[]).push(row);
      if (marker) tombstones.delete(markerKey);
    }
    (result[table] as unknown as Record<string, unknown>[]).sort((a, b) => {
      const ak = recordKey(table, a);
      const bk = recordKey(table, b);
      return ak < bk ? -1 : ak > bk ? 1 : 0;
    });
  }
  result.syncTombstones = [...tombstones.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return result;
}

export function createRepo(store: Store): Repo {
  async function write<T extends { updatedAt: string }>(table: TableName, row: Draft<T>): Promise<T> {
    const rec = { ...row, updatedAt: nowIso() } as T;
    await store.put(table, rec);
    if (table !== 'syncTombstones') {
      const syncTable = table as SyncableTableName;
      const id = String((rec as unknown as Record<string, unknown>)[KEY_FIELD[table]]);
      const marker = await store.get<SyncTombstone>('syncTombstones', tombstoneId(syncTable, id));
      if (marker && rec.updatedAt > marker.updatedAt) await store.remove('syncTombstones', marker.id);
    }
    return rec;
  }
  async function create<T extends { id: string; updatedAt: string }>(
    table: TableName,
    row: NewRecord<T>,
  ): Promise<T> {
    return write<T>(table, { ...row, id: newId() } as unknown as Draft<T>);
  }
  const list = <T>(table: TableName) => store.all<T>(table);

  return {
    addCheckin: (c) => create<Checkin>('checkins', c),
    async listCheckins(range) {
      const rows = await list<Checkin>('checkins');
      return rows.filter((c) => inRange(c.day, range)).sort((a, b) => a.at.localeCompare(b.at));
    },

    async savePractice(p) {
      await write<PracticeRecord>('practices', p);
    },
    async getDraft(practiceId) {
      const rows = await list<PracticeRecord>('practices');
      return rows
        .filter((p) => p.practiceId === practiceId && !p.completedAt)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    },
    async listPractices(range) {
      const rows = await list<PracticeRecord>('practices');
      return rows
        .filter((p) => !range || inRange(dayKey(new Date(p.completedAt ?? p.startedAt)), range))
        .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
    },

    addFollowup: (f) => create<Followup>('followups', f),
    listFollowups: () => list<Followup>('followups'),

    addLetter: (l) => create<Letter>('letters', l),
    listLetters: () => list<Letter>('letters'),

    async saveWeeklyReview(r) {
      await write('weeklyReviews', r);
    },
    async listWeeklyReviews() {
      const rows = await list<{ weekStart: string }>('weeklyReviews');
      return rows.sort((a, b) => a.weekStart.localeCompare(b.weekStart)) as never;
    },

    async saveSession(s) {
      await write('sessions', s);
    },
    async listSessions() {
      const rows = await list<{ date: string }>('sessions');
      return rows.sort((a, b) => b.date.localeCompare(a.date)) as never;
    },

    async getStepProgress(stepId) {
      const found = await store.get<StepProgress>('stepProgress', stepId);
      return found ?? { stepId, status: 'notStarted', daysPracticed: [], updatedAt: '' };
    },
    async saveStepProgress(p) {
      await write<StepProgress>('stepProgress', p);
    },

    listSoothing: () => list<SoothingItem>('soothingList'),
    async addSoothing(text, source) {
      const clean = text.trim();
      const existing = (await list<SoothingItem>('soothingList')).find((s) => s.text === clean);
      if (existing) return existing;
      return create<SoothingItem>('soothingList', { text: clean, source });
    },

    async getSettings() {
      const found = await store.get<Settings>('settings', 'settings');
      return found ?? { id: 'settings', theme: 'system', updatedAt: '' };
    },
    async saveSettings(s) {
      await write<Settings>('settings', s);
    },

    listAgendaPoints: () => list('agendaPoints'),
    async saveAgendaPoint(p) {
      await write('agendaPoints', p);
    },

    listYearPlan: () => list('yearPlan'),
    async saveYearPlanEntry(e) {
      await write('yearPlan', e);
    },

    async deletePractice(id) {
      await store.transaction(async () => {
        const found = await store.get<PracticeRecord>('practices', id);
        if (!found) return;
        await store.remove('practices', id);
        await markDeleted(store, 'practices', id, found.updatedAt);
      });
    },
    async saveHomework(h) {
      await write<Homework>('homework', h);
    },
    async getHomework(id) {
      return store.get<Homework>('homework', id);
    },
    async listHomework() {
      const rows = await list<Homework>('homework');
      return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async listHomeworkBySession(sessionId) {
      const rows = await list<Homework>('homework');
      return rows.filter((h) => h.sessionId === sessionId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    deleteHomework: (id) =>
      store.transaction(async () => {
        const homework = await store.get<Homework>('homework', id);
        if (homework) await markDeleted(store, 'homework', id, homework.updatedAt);
        for (const key of await store.keysWhere('homeworkImages', 'homeworkId', id)) {
          const image = await store.get<HomeworkImage>('homeworkImages', key);
          if (image) await markDeleted(store, 'homeworkImages', String(key), image.updatedAt);
          await store.remove('homeworkImages', key);
        }
        await store.remove('homework', id);
      }),
    async saveHomeworkImage(i) {
      await store.transaction(async () => {
        const existing = await store.get<HomeworkImage>('homeworkImages', i.id);
        if (!existing || existing.homeworkId !== i.homeworkId) {
          if ((await store.countWhere('homeworkImages', 'homeworkId', i.homeworkId)) >= MAX_PHOTOS) {
            throw new Error('Homework photo limit reached');
          }
        }
        await write<HomeworkImage>('homeworkImages', { ...i, kind: i.kind ?? 'prompt' });
      });
    },
    async listHomeworkImages(homeworkId) {
      const rows = await store.where<HomeworkImage>('homeworkImages', 'homeworkId', homeworkId);
      return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async countHomeworkImages() {
      const counts: Record<string, number> = {};
      for (const h of await list<Homework>('homework')) {
        const n = await store.countWhere('homeworkImages', 'homeworkId', h.id);
        if (n > 0) counts[h.id] = n;
      }
      return counts;
    },
    async deleteHomeworkImage(id) {
      await store.transaction(async () => {
        const image = await store.get<HomeworkImage>('homeworkImages', id);
        if (!image) return;
        await store.remove('homeworkImages', id);
        await markDeleted(store, 'homeworkImages', id, image.updatedAt);
      });
    },
    async saveNote(n) {
      await write<Note>('notes', n);
    },
    async listNotes() {
      const rows = await list<Note>('notes');
      return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async deleteNote(id) {
      await store.transaction(async () => {
        const note = await store.get<Note>('notes', id);
        if (!note) return;
        await store.remove('notes', id);
        await markDeleted(store, 'notes', id, note.updatedAt);
      });
    },
    archiveNotes: () =>
      store.transaction(async () => {
        const archivedAt = nowIso();
        const current = (await list<Note>('notes')).filter((n) => !n.archivedAt);
        for (const note of current) await write<Note>('notes', { ...note, archivedAt });
        return current.length;
      }),
    async deleteAgendaPoint(id) {
      await store.transaction(async () => {
        const point = await store.get<AgendaPoint>('agendaPoints', id);
        if (!point) return;
        await store.remove('agendaPoints', id);
        await markDeleted(store, 'agendaPoints', id, point.updatedAt);
      });
    },

    async exportAll() {
      const out: Record<string, unknown[]> = {};
      for (const t of TABLES) out[t] = await list(t);
      return out as unknown as AllData;
    },
    replaceAll: (d) =>
      store.transaction(async () => {
        for (const t of TABLES) {
          await store.clear(t);
          for (const row of d[t] ?? []) await store.put(t, row);
        }
      }),
    mergeAll: (d) =>
      store.transaction(async () => {
        const local = {} as AllData;
        for (const table of TABLES) (local as unknown as Record<string, unknown>)[table] = await list(table);
        const merged = mergeSnapshots(local, d);
        for (const table of TABLES) {
          await store.clear(table);
          for (const row of merged[table] ?? []) await store.put(table, row);
        }
      }),
  };
}
