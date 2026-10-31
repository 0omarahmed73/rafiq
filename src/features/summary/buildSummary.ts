import type { DayRange, Repo } from '../../db/repo';
import type { Checkin, PracticeRecord, WeeklyReview } from '../../db/schema';
import type { DayKey } from '../../lib/dates';
import { currentStepId } from '../step/stepStatus';

export interface SummarySwitches {
  checkins: boolean;
  curve: boolean;
  weeklyReviews: boolean;
  practices: boolean;
  tagged: boolean;
}

/** What the therapist summary may contain. Session notes are deliberately not part of it. */
export interface SummaryModel {
  range: DayRange;
  totals: { daysLogged: number; topEmotion?: string; currentStep: number };
  checkins: Checkin[];
  curve: { day: DayKey; max: number }[];
  weeklyReviews: WeeklyReview[];
  practices: PracticeRecord[];
  /** Items flagged "للنقاش في الجلسة القادمة" that are not already shown in another section. */
  tagged: (Checkin | PracticeRecord)[];
}

export async function buildSummary(
  repo: Repo,
  range: DayRange,
  sw: SummarySwitches,
): Promise<SummaryModel> {
  const inRange = (day: DayKey) => day >= range.from && day <= range.to;
  const allCheckins = await repo.listCheckins(range);
  const completed = (await repo.listPractices(range)).filter((p) => p.completedAt);

  const counts = new Map<string, number>();
  for (const c of allCheckins) for (const e of c.emotions) counts.set(e, (counts.get(e) ?? 0) + 1);
  const topEmotion = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];

  const checkins = sw.checkins ? allCheckins : [];
  const practices = sw.practices ? completed.filter((p) => p.share) : [];

  const maxByDay = new Map<DayKey, number>();
  for (const c of allCheckins) maxByDay.set(c.day, Math.max(maxByDay.get(c.day) ?? 0, c.intensity));
  const curve = sw.curve
    ? [...maxByDay].sort(([a], [b]) => a.localeCompare(b)).map(([day, max]) => ({ day, max }))
    : [];

  const weeklyReviews = sw.weeklyReviews
    ? (await repo.listWeeklyReviews()).filter((r) => r.share && inRange(r.weekStart))
    : [];

  const shownIds = new Set([...checkins.map((c) => c.id), ...practices.map((p) => p.id)]);
  const tagged = sw.tagged
    ? [
        ...allCheckins.filter((c) => c.forNextSession && !shownIds.has(c.id)),
        ...completed.filter((p) => p.forNextSession && !shownIds.has(p.id)),
      ]
    : [];

  return {
    range,
    totals: {
      daysLogged: maxByDay.size,
      ...(topEmotion ? { topEmotion } : {}),
      currentStep: await currentStepId(repo),
    },
    checkins,
    curve,
    weeklyReviews,
    practices,
    tagged,
  };
}
