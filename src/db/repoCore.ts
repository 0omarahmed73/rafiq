import { dayKey } from '../lib/dates';
import { newId, type DayRange, type Draft, type NewRecord, type Repo } from './repo';
import type {
  AllData,
  Checkin,
  Followup,
  Letter,
  PracticeRecord,
  Settings,
  SoothingItem,
  StepProgress,
  TableName,
} from './schema';

/** The minimal storage a Repo needs; Dexie and an in-memory Map both implement it. */
export interface Store {
  all<T>(table: TableName): Promise<T[]>;
  get<T>(table: TableName, key: string | number): Promise<T | undefined>;
  put(table: TableName, row: unknown): Promise<void>;
  clear(table: TableName): Promise<void>;
  /** Runs `fn` atomically; a throw leaves the store unchanged. */
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

export const TABLES: TableName[] = [
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
];

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
};

const nowIso = () => new Date().toISOString();
const inRange = (day: string, r: DayRange) => day >= r.from && day <= r.to;

export function createRepo(store: Store): Repo {
  async function write<T extends { updatedAt: string }>(table: TableName, row: Draft<T>): Promise<T> {
    const rec = { ...row, updatedAt: nowIso() } as T;
    await store.put(table, rec);
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

    async exportAll() {
      const out: Record<string, unknown[]> = {};
      for (const t of TABLES) out[t] = await list(t);
      return out as unknown as AllData;
    },
    replaceAll: (d) =>
      store.transaction(async () => {
        for (const t of TABLES) {
          await store.clear(t);
          for (const row of d[t]) await store.put(t, row);
        }
      }),
    mergeAll: (d) =>
      store.transaction(async () => {
        for (const t of TABLES) {
          for (const row of d[t] as unknown as Record<string, unknown>[]) {
            const existing = await store.get<{ updatedAt: string }>(t, row[KEY_FIELD[t]] as string | number);
            if (!existing || (row.updatedAt as string) > existing.updatedAt) await store.put(t, row);
          }
        }
      }),
  };
}
