import { weeklyQuestions } from '../content/weeklyQuestions';
import { newId, type Repo } from '../db/repo';
import type { Checkin, PracticeRecord, WeeklyReview, WeeklySummary } from '../db/schema';
import { addDays, dayKey, weekStartSaturday, type DayKey } from './dates';
import { trendOf } from './trend';

/** A Saturday; the question for a week is chosen by the number of weeks since this day. */
const QUESTION_EPOCH: DayKey = '2026-01-03';

const toUtcDays = (key: DayKey) => {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
};

/** The Saturday that starts the week before the one `today` falls in. */
export function reviewWeekStart(today: Date): DayKey {
  return addDays(weekStartSaturday(today), -7);
}

function questionFor(weekStart: DayKey): string {
  const weeks = Math.floor((toUtcDays(weekStart) - toUtcDays(QUESTION_EPOCH)) / 7);
  const n = weeklyQuestions.length;
  return weeklyQuestions[((weeks % n) + n) % n];
}

/** Summarises the seven days from `weekStart`; items outside the week are ignored. No AI involved. */
export function generateWeeklyReview(
  checkins: Checkin[],
  practices: PracticeRecord[],
  weekStart: DayKey,
): WeeklySummary {
  const end = addDays(weekStart, 6);
  const inWeek = (day: DayKey) => day >= weekStart && day <= end;
  const week = checkins.filter((c) => inWeek(c.day));

  const counts = new Map<string, number>();
  for (const c of week) for (const e of c.emotions) counts.set(e, (counts.get(e) ?? 0) + 1);
  const topEmotions = [...counts]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .slice(0, 3);

  const maxByDay = new Map<DayKey, number>();
  for (const c of week) maxByDay.set(c.day, Math.max(maxByDay.get(c.day) ?? 0, c.intensity));
  const trend = trendOf([...maxByDay].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v));

  const steps = new Set<number>();
  for (const p of practices) {
    if (p.completedAt && inWeek(dayKey(new Date(p.completedAt)))) steps.add(p.stepId);
  }

  return { topEmotions, trend, stepsPracticed: [...steps].sort((a, b) => a - b), question: questionFor(weekStart) };
}

/**
 * Makes sure the review of the previous week exists (one per week), but only when that week
 * has at least one check-in. Returns it, or undefined when there is nothing to review.
 */
export async function ensureWeeklyReview(repo: Repo, today: Date): Promise<WeeklyReview | undefined> {
  const weekStart = reviewWeekStart(today);
  const find = async () => (await repo.listWeeklyReviews()).find((r) => r.weekStart === weekStart);

  const existing = await find();
  if (existing) return existing;

  const range = { from: weekStart, to: addDays(weekStart, 6) };
  const checkins = await repo.listCheckins(range);
  if (checkins.length === 0) return undefined;

  const practices = await repo.listPractices(range);
  await repo.saveWeeklyReview({
    id: newId(),
    weekStart,
    summary: generateWeeklyReview(checkins, practices, weekStart),
    share: false,
  });
  return find();
}
