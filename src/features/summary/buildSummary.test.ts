import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { buildSummary, type SummarySwitches } from './buildSummary';

const range = { from: '2026-10-01', to: '2026-10-31' };
const all: SummarySwitches = { checkins: true, curve: true, weeklyReviews: true, practices: true, tagged: true };
const none: SummarySwitches = { checkins: false, curve: false, weeklyReviews: false, practices: false, tagged: false };
const only = (key: keyof SummarySwitches): SummarySwitches => ({ ...none, [key]: true });

const checkin = (repo: Repo, day: string, over: Record<string, unknown> = {}) =>
  repo.addCheckin({
    at: `${day}T10:00:00.000Z`,
    day,
    emotions: ['sadness'],
    intensity: 5,
    tags: [],
    forNextSession: false,
    ...over,
  });

const practice = (repo: Repo, id: string, over: Record<string, unknown> = {}) =>
  repo.savePractice({
    id,
    practiceId: 'validate',
    stepId: 1,
    startedAt: new Date(2026, 9, 20, 9).toISOString(),
    completedAt: new Date(2026, 9, 20, 9, 5).toISOString(),
    answers: {},
    share: false,
    forNextSession: false,
    ...over,
  });

describe('buildSummary', () => {
  it('never includes a practice that is neither shared nor flagged, whatever the switches', async () => {
    const repo = createMemoryRepo();
    await practice(repo, 'private');
    const model = await buildSummary(repo, range, all);
    expect(model.practices).toHaveLength(0);
    expect(model.tagged).toHaveLength(0);
  });

  it('includes a shared practice only when the practices switch is on', async () => {
    const repo = createMemoryRepo();
    await practice(repo, 'shared', { share: true });
    expect((await buildSummary(repo, range, only('practices'))).practices.map((p) => p.id)).toEqual(['shared']);
    expect((await buildSummary(repo, range, only('tagged'))).practices).toHaveLength(0);
    expect((await buildSummary(repo, range, none)).practices).toHaveLength(0);
  });

  it('includes flagged check-ins and practices only when the tagged switch is on', async () => {
    const repo = createMemoryRepo();
    await checkin(repo, '2026-10-12', { forNextSession: true });
    await practice(repo, 'flagged', { forNextSession: true });

    const on = await buildSummary(repo, range, only('tagged'));
    expect(on.tagged).toHaveLength(2);
    expect((await buildSummary(repo, range, only('checkins'))).tagged).toHaveLength(0);
    expect((await buildSummary(repo, range, none)).tagged).toHaveLength(0);
  });

  it('does not repeat a flagged item that is already shown elsewhere', async () => {
    const repo = createMemoryRepo();
    await checkin(repo, '2026-10-12', { forNextSession: true });
    await practice(repo, 'flagged', { forNextSession: true, share: true });
    const model = await buildSummary(repo, range, all);
    expect(model.checkins).toHaveLength(1);
    expect(model.practices).toHaveLength(1);
    expect(model.tagged).toHaveLength(0);
  });

  it('includes a weekly review only when it is shared and the switch is on', async () => {
    const repo = createMemoryRepo();
    const summary = { topEmotions: [], trend: 'flat' as const, stepsPracticed: [], question: 'سؤال' };
    await repo.saveWeeklyReview({ id: 'w1', weekStart: '2026-10-24', summary, share: true });
    await repo.saveWeeklyReview({ id: 'w2', weekStart: '2026-10-17', summary, share: false });
    expect((await buildSummary(repo, range, only('weeklyReviews'))).weeklyReviews.map((r) => r.id)).toEqual(['w1']);
    expect((await buildSummary(repo, range, none)).weeklyReviews).toHaveLength(0);
  });

  it('keeps only check-ins inside the date range', async () => {
    const repo = createMemoryRepo();
    await checkin(repo, '2026-09-30');
    await checkin(repo, '2026-10-01');
    await checkin(repo, '2026-10-31');
    await checkin(repo, '2026-11-01');
    const model = await buildSummary(repo, range, only('checkins'));
    expect(model.checkins.map((c) => c.day)).toEqual(['2026-10-01', '2026-10-31']);
    expect(model.totals.daysLogged).toBe(2);
  });

  it('builds the curve from each day’s highest intensity, oldest first', async () => {
    const repo = createMemoryRepo();
    await checkin(repo, '2026-10-05', { intensity: 3 });
    await checkin(repo, '2026-10-05', { intensity: 8, at: '2026-10-05T18:00:00.000Z' });
    await checkin(repo, '2026-10-02', { intensity: 4 });
    const model = await buildSummary(repo, range, only('curve'));
    expect(model.curve).toEqual([
      { day: '2026-10-02', max: 4 },
      { day: '2026-10-05', max: 8 },
    ]);
  });

  it('reports the most frequent emotion and the current step', async () => {
    const repo = createMemoryRepo();
    await checkin(repo, '2026-10-02', { emotions: ['anxiety', 'sadness'] });
    await checkin(repo, '2026-10-03', { emotions: ['anxiety'] });
    await repo.saveStepProgress({ stepId: 1, status: 'done', daysPracticed: [] });
    const model = await buildSummary(repo, range, none);
    expect(model.totals.topEmotion).toBe('anxiety');
    expect(model.totals.currentStep).toBe(2);
  });

  it('has no sessions in the model', async () => {
    const repo = createMemoryRepo();
    await repo.saveSession({ id: 's', date: '2026-10-10', therapistSaid: 'سرّي', takeaway: '', homework: [], createdAt: '2026-10-10T09:00:00.000Z' });
    const model = await buildSummary(repo, range, all);
    expect(Object.keys(model)).not.toContain('sessions');
    expect(JSON.stringify(model)).not.toContain('سرّي');
  });

  it('returns an empty but valid model for a range with no data', async () => {
    const model = await buildSummary(createMemoryRepo(), range, all);
    expect(model.totals.daysLogged).toBe(0);
    expect(model.totals.topEmotion).toBeUndefined();
    expect(model.totals.currentStep).toBe(1);
    expect([model.checkins, model.curve, model.weeklyReviews, model.practices, model.tagged].every((a) => a.length === 0)).toBe(true);
  });
});
