import { z } from 'zod';
import type { Repo } from './repo';
import type { AllData } from './schema';

export class BackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupError';
  }
}

const INVALID = 'الملف غير صالح';
const UNSUPPORTED = 'إصدار الملف غير مدعوم';

const str = z.string();
const id = z.string().min(1);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const intensity = z.number().int().min(0).max(10);
const stamp = { updatedAt: str };

const Checkin = z.object({
  id,
  at: id,
  day,
  emotions: z.array(str),
  intensity,
  tags: z.array(str),
  note: str.optional(),
  forNextSession: z.boolean(),
  stepId: z.number().int().optional(),
  ...stamp,
});

const PracticeRecord = z.object({
  id,
  practiceId: id,
  stepId: z.number().int(),
  startedAt: id,
  completedAt: str.optional(),
  answers: z.record(z.unknown()),
  share: z.boolean(),
  forNextSession: z.boolean(),
  ...stamp,
});

const Followup = z.object({
  id,
  practiceRecordId: id,
  tried: z.array(str),
  helped: z.enum(['much', 'little', 'no']),
  intensityBefore: intensity,
  intensityAfter: intensity,
  note: str.optional(),
  at: id,
  ...stamp,
});

const Letter = z.object({
  id,
  kind: z.enum(['self', 'gratitude', 'forgiveness']),
  text: str,
  at: id,
  share: z.boolean(),
  ...stamp,
});

const WeeklyReview = z.object({
  id,
  weekStart: day,
  summary: z.object({
    topEmotions: z.array(z.object({ id: str, count: z.number().int() })),
    trend: z.enum(['up', 'flat', 'down']),
    stepsPracticed: z.array(z.number().int()),
    question: str,
  }),
  answer: str.optional(),
  share: z.boolean(),
  ...stamp,
});

const Session = z.object({
  id,
  date: day,
  therapistSaid: str,
  takeaway: str,
  homework: z.array(z.object({ text: str, done: z.boolean() })),
  createdAt: id,
  ...stamp,
});

const StepProgress = z.object({
  stepId: z.number().int(),
  status: z.enum(['notStarted', 'inProgress', 'done']),
  daysPracticed: z.array(day),
  readiness: z.object({ answers: z.array(z.number()), at: str }).optional(),
  decision: z
    .object({ acceptanceChoice: z.enum(['keep', 'change']), reasons: z.array(str) })
    .optional(),
  ...stamp,
});

const SoothingItem = z.object({
  id,
  text: str,
  source: z.enum(['step1', 'step9', 'user']),
  ...stamp,
});

const Settings = z.object({
  id: z.literal('settings'),
  reminderTime: str.optional(),
  theme: z.enum(['system', 'light', 'dark']),
  accent: str.optional(),
  disclaimerAcceptedAt: str.optional(),
  lastBackupAt: str.optional(),
  lastReminderDay: day.optional(),
  ...stamp,
});

const AgendaPoint = z.object({ id, text: str, day, done: z.boolean(), ...stamp });

const YearPlanEntry = z.object({ id, value: z.union([z.boolean(), str]), ...stamp });

const Backup = z.object({
  version: z.literal(1),
  exportedAt: str,
  data: z.object({
    checkins: z.array(Checkin),
    practices: z.array(PracticeRecord),
    followups: z.array(Followup),
    letters: z.array(Letter),
    weeklyReviews: z.array(WeeklyReview),
    sessions: z.array(Session),
    stepProgress: z.array(StepProgress),
    soothingList: z.array(SoothingItem),
    settings: z.array(Settings).max(1),
    agendaPoints: z.array(AgendaPoint),
    yearPlan: z.array(YearPlanEntry).default([]),
  }),
});

export interface BackupFile {
  version: 1;
  exportedAt: string;
  data: AllData;
}

export async function exportBackup(repo: Repo): Promise<BackupFile> {
  return { version: 1, exportedAt: new Date().toISOString(), data: await repo.exportAll() };
}

/**
 * Restores a backup given as text or as a parsed object. The file is fully validated before the
 * repo is touched, and the write itself is atomic, so a bad file changes nothing.
 */
export async function importBackup(repo: Repo, file: unknown, mode: 'replace' | 'merge'): Promise<void> {
  let value = file;
  if (typeof file === 'string') {
    try {
      value = JSON.parse(file);
    } catch {
      throw new BackupError(INVALID);
    }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BackupError(INVALID);

  const version = (value as { version?: unknown }).version;
  if (version !== undefined && version !== 1) throw new BackupError(UNSUPPORTED);

  const parsed = Backup.safeParse(value);
  if (!parsed.success) throw new BackupError(INVALID);

  const data = parsed.data.data as AllData;
  await (mode === 'replace' ? repo.replaceAll(data) : repo.mergeAll(data));
}
