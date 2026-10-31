import type { DayKey } from '../lib/dates';
import type {
  AgendaPoint,
  AllData,
  Checkin,
  Followup,
  Letter,
  PracticeRecord,
  Session,
  Settings,
  SoothingItem,
  StepProgress,
  WeeklyReview,
  YearPlanEntry,
} from './schema';

/** A record as the caller supplies it: the repo stamps `updatedAt` on every write. */
export type Draft<T> = Omit<T, 'updatedAt'>;
/** A new record: the repo also assigns the `id`. */
export type NewRecord<T> = Omit<T, 'updatedAt' | 'id'>;

export interface DayRange {
  from: DayKey;
  to: DayKey;
}

export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface Repo {
  addCheckin(c: NewRecord<Checkin>): Promise<Checkin>;
  /** Inclusive on both bounds, ordered by time. */
  listCheckins(range: DayRange): Promise<Checkin[]>;

  /** Upsert by `id`. */
  savePractice(p: Draft<PracticeRecord>): Promise<void>;
  /** The latest practice with this `practiceId` that has no `completedAt`. */
  getDraft(practiceId: string): Promise<PracticeRecord | undefined>;
  /** Filtered by the day of `completedAt ?? startedAt`; drafts are included. */
  listPractices(range?: DayRange): Promise<PracticeRecord[]>;

  addFollowup(f: NewRecord<Followup>): Promise<Followup>;
  listFollowups(): Promise<Followup[]>;

  addLetter(l: NewRecord<Letter>): Promise<Letter>;
  listLetters(): Promise<Letter[]>;

  saveWeeklyReview(r: Draft<WeeklyReview>): Promise<void>;
  listWeeklyReviews(): Promise<WeeklyReview[]>;

  saveSession(s: Draft<Session>): Promise<void>;
  /** Newest first. */
  listSessions(): Promise<Session[]>;

  /** Never stored until saved: a missing step reads as `notStarted`. */
  getStepProgress(stepId: number): Promise<StepProgress>;
  saveStepProgress(p: Draft<StepProgress>): Promise<void>;

  listSoothing(): Promise<SoothingItem[]>;
  /** A text already in the list is not added again. */
  addSoothing(text: string, source: SoothingItem['source']): Promise<SoothingItem>;

  getSettings(): Promise<Settings>;
  saveSettings(s: Draft<Settings>): Promise<void>;

  listAgendaPoints(): Promise<AgendaPoint[]>;
  saveAgendaPoint(p: Draft<AgendaPoint>): Promise<void>;
  /** Removing an id that is not there does nothing. */
  deleteAgendaPoint(id: string): Promise<void>;

  listYearPlan(): Promise<YearPlanEntry[]>;
  /** Upsert by `id`. */
  saveYearPlanEntry(e: Draft<YearPlanEntry>): Promise<void>;

  exportAll(): Promise<AllData>;
  /** Atomic: all or nothing. */
  replaceAll(d: AllData): Promise<void>;
  /** Atomic. Keeps the record with the later `updatedAt`. */
  mergeAll(d: AllData): Promise<void>;
}
