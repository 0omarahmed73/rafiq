import { YEAR_GOALS, YEAR_MONTHS, YEAR_REVIEW_QUESTIONS } from '../../content/yearPlan';
import { goalKey, monthLabel, monthPercent, noteKey, overall, planTitle, reviewKey, taskKey, toMap } from './progress';

describe('year plan content', () => {
  it('carries the whole plan: 12 goals, 12 months of 4 weeks, 8 review questions', () => {
    expect(YEAR_GOALS).toHaveLength(12);
    expect(YEAR_REVIEW_QUESTIONS).toHaveLength(8);
    expect(YEAR_MONTHS).toHaveLength(12);
    expect(YEAR_MONTHS.every((m) => m.weeks.length === 4 && m.weeks.every((w) => w.tasks.length >= 3))).toBe(true);
    expect(YEAR_MONTHS[0].name).toBe('أكتوبر 2026');
    expect(YEAR_MONTHS[11].name).toBe('سبتمبر 2027');
  });
});

describe('progress', () => {
  it('names each thing answered with a stable key', () => {
    expect([taskKey(1, 2, 3), goalKey(4), noteKey(5), reviewKey(6)]).toEqual(['t:1:2:3', 'g:4', 'n:m5', 'r:6']);
  });

  it('counts nothing done for an empty plan', () => {
    const o = overall(toMap([]));
    expect(o.tasksDone).toBe(0);
    expect(o.tasksTotal).toBeGreaterThan(100);
    expect(o.percent).toBe(0);
    expect(o.goalsDone).toBe(0);
    expect(o.goalsTotal).toBe(12);
  });

  it('counts only true task and goal values, ignoring unchecked and note entries', () => {
    const o = overall(
      toMap([
        { id: taskKey(0, 0, 0), value: true, updatedAt: '' },
        { id: taskKey(0, 0, 1), value: false, updatedAt: '' },
        { id: goalKey(2), value: true, updatedAt: '' },
        { id: noteKey(0), value: 'نص', updatedAt: '' },
      ]),
    );
    expect(o.tasksDone).toBe(1);
    expect(o.goalsDone).toBe(1);
  });

  it('gives each month its own rounded percentage', () => {
    const tasks = YEAR_MONTHS[0].weeks.reduce((n, w) => n + w.tasks.length, 0);
    const map = toMap([{ id: taskKey(0, 0, 0), value: true, updatedAt: '' }]);
    expect(monthPercent(map, 0)).toBe(Math.round(100 / tasks));
    expect(monthPercent(map, 1)).toBe(0);
  });
});

describe('plan settings', () => {
  it('titles the plan with the age in words', () => {
    expect(planTitle(25)).toBe('عامي الخامس والعشرون');
    expect(planTitle(31)).toBe('عامي الحادي والثلاثون');
  });

  it('names twelve months from the chosen start, crossing the year', () => {
    expect(monthLabel('2026-10', 0)).toBe('أكتوبر ٢٠٢٦');
    expect(monthLabel('2026-10', 3)).toBe('يناير ٢٠٢٧');
    expect(monthLabel('2026-10', 11)).toBe('سبتمبر ٢٠٢٧');
    expect(monthLabel('2027-03', 11)).toBe('فبراير ٢٠٢٨');
  });
});
