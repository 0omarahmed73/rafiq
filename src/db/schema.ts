import type { DayKey } from '../lib/dates';

/** Every stored record carries the time of its last write (ISO). Backup merge uses it. */
export interface Stamped {
  updatedAt: string;
}

export interface Checkin extends Stamped {
  id: string;
  at: string;
  day: DayKey;
  emotions: string[];
  /** Integer 0..10. */
  intensity: number;
  tags: string[];
  note?: string;
  forNextSession: boolean;
  stepId?: number;
}

export interface PracticeRecord extends Stamped {
  id: string;
  practiceId: string;
  stepId: number;
  startedAt: string;
  /** Absent while the practice is a draft. */
  completedAt?: string;
  answers: Record<string, unknown>;
  share: boolean;
  forNextSession: boolean;
}

export interface Followup extends Stamped {
  id: string;
  practiceRecordId: string;
  tried: string[];
  helped: 'much' | 'little' | 'no';
  intensityBefore: number;
  intensityAfter: number;
  note?: string;
  at: string;
}

export interface Letter extends Stamped {
  id: string;
  kind: 'self' | 'gratitude' | 'forgiveness';
  text: string;
  at: string;
  share: boolean;
}

export interface WeeklySummary {
  topEmotions: { id: string; count: number }[];
  trend: 'up' | 'flat' | 'down';
  stepsPracticed: number[];
  question: string;
}

export interface WeeklyReview extends Stamped {
  id: string;
  weekStart: DayKey;
  summary: WeeklySummary;
  answer?: string;
  share: boolean;
}

export interface HomeworkItem {
  text: string;
  done: boolean;
}

export interface Session extends Stamped {
  id: string;
  date: DayKey;
  therapistSaid: string;
  takeaway: string;
  homework: HomeworkItem[];
  createdAt: string;
}

/** One piece of homework from a session. The old `Session.homework` array is kept only for data made before this existed. */
export interface Homework extends Stamped {
  id: string;
  sessionId: string;
  /** The title: what the homework is. */
  text: string;
  notes?: string;
  answer?: string;
  done: boolean;
  createdAt: string;
}

/** A shrunk photo of a homework, stored as a data URL. Kept apart so listing homework never loads photos. */
export interface HomeworkImage extends Stamped {
  id: string;
  homeworkId: string;
  dataUrl: string;
  createdAt: string;
}

export interface StepProgress extends Stamped {
  stepId: number;
  status: 'notStarted' | 'inProgress' | 'done';
  daysPracticed: DayKey[];
  readiness?: { answers: number[]; at: string };
  decision?: { acceptanceChoice: 'keep' | 'change'; reasons: string[] };
}

export interface SoothingItem extends Stamped {
  id: string;
  text: string;
  source: 'step1' | 'step9' | 'user';
}

export interface Settings extends Stamped {
  id: 'settings';
  reminderTime?: string;
  theme: 'system' | 'light' | 'dark';
  /** Favourite accent colour id (see lib/accents); an unknown value reads as teal. */
  accent?: string;
  /** Age during the yearly plan, for its title «عامي …». Absent reads as 25. */
  /** «معلوماتي»: shown at the top of the therapist summary (name, therapist) and in Settings. */
  displayName?: string;
  therapistName?: string;
  trustedName?: string;
  trustedPhone?: string;
  planAge?: number;
  /** First month of the yearly plan, `YYYY-MM`. Absent reads as 2026-10. */
  planStart?: string;
  disclaimerAcceptedAt?: string;
  lastBackupAt?: string;
  /** Day the daily reminder was last shown, so it appears once a day. */
  lastReminderDay?: DayKey;
}

export interface AgendaPoint extends Stamped {
  id: string;
  text: string;
  day: DayKey;
  done: boolean;
}

/**
 * One answer in the yearly plan. `id` names the thing answered: `t:month:week:task` (done),
 * `g:goal` (done), `d:month:week:task` (note), `n:m<month>` (month note), `r:<question>` (review).
 */
export interface YearPlanEntry extends Stamped {
  id: string;
  value: boolean | string;
}

/** Every table, as stored. `settings` holds zero or one row. */
export interface AllData {
  checkins: Checkin[];
  practices: PracticeRecord[];
  followups: Followup[];
  letters: Letter[];
  weeklyReviews: WeeklyReview[];
  sessions: Session[];
  stepProgress: StepProgress[];
  soothingList: SoothingItem[];
  settings: Settings[];
  agendaPoints: AgendaPoint[];
  yearPlan: YearPlanEntry[];
  homework: Homework[];
  homeworkImages: HomeworkImage[];
}

export type TableName = keyof AllData;
