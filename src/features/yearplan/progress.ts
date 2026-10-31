import { YEAR_GOALS, YEAR_MONTHS } from '../../content/yearPlan';
import type { YearPlanEntry } from '../../db/schema';
import { formatArabicMonthYear } from '../../lib/dates';
import { ordinalAr } from '../../lib/ordinal';

export const DEFAULT_AGE = 25;
export const DEFAULT_START = '2026-10';

export const planTitle = (age: number) => `عامي ${ordinalAr(age)}`;

/** Label of the plan's `index`-th month (0–11) when it starts at `start` (`YYYY-MM`). */
export function monthLabel(start: string, index: number): string {
  const [y, m] = start.split('-').map(Number);
  const d = new Date(y, m - 1 + index, 1);
  return formatArabicMonthYear(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
}

export type PlanMap = Map<string, boolean | string>;

export const taskKey = (month: number, week: number, task: number) => `t:${month}:${week}:${task}`;
export const detailKey = (month: number, week: number, task: number) => `d:${month}:${week}:${task}`;
export const goalKey = (i: number) => `g:${i}`;
export const noteKey = (month: number) => `n:m${month}`;
export const reviewKey = (i: number) => `r:${i}`;

export const toMap = (entries: YearPlanEntry[]): PlanMap => new Map(entries.map((e) => [e.id, e.value]));

const monthTotals = (map: PlanMap, month: number) => {
  let total = 0;
  let done = 0;
  YEAR_MONTHS[month].weeks.forEach((w, wi) =>
    w.tasks.forEach((_, ti) => {
      total++;
      if (map.get(taskKey(month, wi, ti)) === true) done++;
    }),
  );
  return { total, done };
};

/** Rounded percentage of the month's tasks that are ticked. */
export function monthPercent(map: PlanMap, month: number): number {
  const { total, done } = monthTotals(map, month);
  return total ? Math.round((done / total) * 100) : 0;
}

export function overall(map: PlanMap) {
  let tasksTotal = 0;
  let tasksDone = 0;
  YEAR_MONTHS.forEach((_, mi) => {
    const t = monthTotals(map, mi);
    tasksTotal += t.total;
    tasksDone += t.done;
  });
  const goalsDone = YEAR_GOALS.filter((_, i) => map.get(goalKey(i)) === true).length;
  return {
    tasksDone,
    tasksTotal,
    percent: tasksTotal ? Math.round((tasksDone / tasksTotal) * 100) : 0,
    goalsDone,
    goalsTotal: YEAR_GOALS.length,
  };
}
