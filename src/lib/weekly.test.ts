import { weeklyQuestions } from '../content/weeklyQuestions';
import { createMemoryRepo } from '../db/memoryRepo';
import type { Repo } from '../db/repo';
import type { Checkin, PracticeRecord } from '../db/schema';
import { addDays } from './dates';
import { ensureWeeklyReview, generateWeeklyReview, reviewWeekStart } from './weekly';

const checkin = (day: string, emotions: string[], intensity: number): Checkin => ({
  id: `${day}-${emotions.join('')}-${intensity}`,
  at: `${day}T10:00:00.000Z`,
  day,
  emotions,
  intensity,
  tags: [],
  forNextSession: false,
  updatedAt: '',
});

const practice = (stepId: number, completed: Date | null): PracticeRecord => ({
  id: `p${stepId}-${completed?.toISOString() ?? 'draft'}`,
  practiceId: 'x',
  stepId,
  startedAt: new Date(2026, 9, 25).toISOString(),
  ...(completed ? { completedAt: completed.toISOString() } : {}),
  answers: {},
  share: false,
  forNextSession: false,
  updatedAt: '',
});

describe('reviewWeekStart', () => {
  it('is the Saturday of the previous week', () => {
    expect(reviewWeekStart(new Date(2026, 9, 31))).toBe('2026-10-24');
    expect(reviewWeekStart(new Date(2026, 10, 3))).toBe('2026-10-24');
    expect(reviewWeekStart(new Date(2026, 10, 6))).toBe('2026-10-24');
    expect(reviewWeekStart(new Date(2026, 10, 7))).toBe('2026-10-31');
  });
});

describe('generateWeeklyReview', () => {
  const weekStart = '2026-10-24';

  it('keeps the three most frequent emotions, ordered by count then id', () => {
    const week = [
      checkin('2026-10-24', ['anxiety', 'sadness'], 5),
      checkin('2026-10-25', ['anxiety', 'anger'], 5),
      checkin('2026-10-26', ['anxiety', 'calm'], 5),
      checkin('2026-10-27', ['sadness'], 5),
    ];
    const { topEmotions } = generateWeeklyReview(week, [], weekStart);
    expect(topEmotions).toEqual([
      { id: 'anxiety', count: 3 },
      { id: 'sadness', count: 2 },
      { id: 'anger', count: 1 },
    ]);
  });

  it('ignores check-ins outside the week', () => {
    const items = [
      checkin('2026-10-23', ['anger'], 9),
      checkin('2026-10-24', ['calm'], 2),
      checkin('2026-10-30', ['calm'], 2),
      checkin('2026-10-31', ['anger'], 9),
    ];
    expect(generateWeeklyReview(items, [], weekStart).topEmotions).toEqual([{ id: 'calm', count: 2 }]);
  });

  it('judges the trend from each day’s highest intensity', () => {
    const rising = [
      checkin('2026-10-24', ['sadness'], 2),
      checkin('2026-10-25', ['sadness'], 2),
      checkin('2026-10-28', ['sadness'], 8),
      checkin('2026-10-29', ['sadness'], 8),
    ];
    expect(generateWeeklyReview(rising, [], weekStart).trend).toBe('up');

    const sameDay = [checkin('2026-10-24', ['sadness'], 2), checkin('2026-10-24', ['anger'], 9)];
    expect(generateWeeklyReview(sameDay, [], weekStart).trend).toBe('flat');
  });

  it('lists the distinct steps practised, sorted, from practices finished that week', () => {
    const practices = [
      practice(3, new Date(2026, 9, 27, 9)),
      practice(1, new Date(2026, 9, 28, 9)),
      practice(3, new Date(2026, 9, 29, 9)),
      practice(2, new Date(2026, 9, 20, 9)),
      practice(4, new Date(2026, 9, 31, 9)),
      practice(5, null),
    ];
    expect(generateWeeklyReview([], practices, weekStart).stepsPracticed).toEqual([1, 3]);
  });

  it('picks the question by week number and wraps around the list', () => {
    const first = generateWeeklyReview([], [], '2026-01-03').question;
    expect(first).toBe(weeklyQuestions[0]);
    expect(generateWeeklyReview([], [], '2026-01-10').question).toBe(weeklyQuestions[1]);
    const wrapped = addDays('2026-01-03', 7 * weeklyQuestions.length);
    expect(generateWeeklyReview([], [], wrapped).question).toBe(weeklyQuestions[0]);
  });
});

describe('weeklyQuestions', () => {
  it('has at least six distinct questions, the first one fixed by the plan', () => {
    expect(weeklyQuestions.length).toBeGreaterThanOrEqual(6);
    expect(new Set(weeklyQuestions).size).toBe(weeklyQuestions.length);
    expect(weeklyQuestions[0]).toBe('متى شعرتُ بأنني أقرب ما أكون إلى نفسي؟');
  });
});

describe('ensureWeeklyReview', () => {
  const add = (repo: Repo, day: string) =>
    repo.addCheckin({
      at: `${day}T10:00:00.000Z`,
      day,
      emotions: ['sadness'],
      intensity: 5,
      tags: [],
      forNextSession: false,
    });

  it('creates one review for the previous week and does not create another on a second call', async () => {
    const repo = createMemoryRepo();
    await add(repo, '2026-10-26');
    const first = await ensureWeeklyReview(repo, new Date(2026, 9, 31));
    const second = await ensureWeeklyReview(repo, new Date(2026, 10, 2));

    expect(first?.weekStart).toBe('2026-10-24');
    expect(second?.id).toBe(first?.id);
    expect(await repo.listWeeklyReviews()).toHaveLength(1);
    expect(first?.share).toBe(false);
  });

  it('creates nothing when the previous week has no check-in', async () => {
    const repo = createMemoryRepo();
    await add(repo, '2026-10-31');
    expect(await ensureWeeklyReview(repo, new Date(2026, 9, 31))).toBeUndefined();
    expect(await repo.listWeeklyReviews()).toHaveLength(0);
  });
});
