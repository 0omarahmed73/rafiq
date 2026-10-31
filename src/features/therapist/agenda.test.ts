import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { agendaItems } from './agenda';

const checkin = (repo: Repo, day: string, over: Record<string, unknown> = {}) =>
  repo.addCheckin({
    at: `${day}T10:00:00.000Z`,
    day,
    emotions: ['sadness'],
    intensity: 6,
    tags: [],
    forNextSession: true,
    ...over,
  });

const session = (repo: Repo, date: string) =>
  repo.saveSession({ id: `s-${date}`, date, therapistSaid: '', takeaway: '', homework: [], createdAt: `${date}T09:00:00.000Z` });

describe('agendaItems', () => {
  it('includes only check-ins and practices flagged for the next session', async () => {
    const repo = createMemoryRepo();
    await checkin(repo, '2026-10-28');
    await checkin(repo, '2026-10-29', { forNextSession: false });
    await repo.savePractice({
      id: 'p1',
      practiceId: 'validate',
      stepId: 1,
      startedAt: new Date(2026, 9, 30, 9).toISOString(),
      completedAt: new Date(2026, 9, 30, 9, 5).toISOString(),
      answers: {},
      share: false,
      forNextSession: true,
    });
    await repo.savePractice({
      id: 'p2',
      practiceId: 'accept',
      stepId: 2,
      startedAt: new Date(2026, 9, 30, 10).toISOString(),
      completedAt: new Date(2026, 9, 30, 10, 5).toISOString(),
      answers: {},
      share: true,
      forNextSession: false,
    });

    const items = await agendaItems(repo);
    expect(items.map((i) => i.kind).sort()).toEqual(['checkin', 'practice']);
    expect(items.find((i) => i.kind === 'practice')?.label).toBe('تصديق المشاعر');
    expect(items.find((i) => i.kind === 'checkin')?.label).toContain('حزن');
  });

  it('leaves out what happened on or before the latest session and keeps what came after', async () => {
    const repo = createMemoryRepo();
    await session(repo, '2026-10-27');
    await checkin(repo, '2026-10-26');
    await checkin(repo, '2026-10-27');
    await checkin(repo, '2026-10-28');

    const items = await agendaItems(repo);
    expect(items.map((i) => i.day)).toEqual(['2026-10-28']);
  });

  it('uses the latest of several sessions', async () => {
    const repo = createMemoryRepo();
    await session(repo, '2026-10-20');
    await session(repo, '2026-10-27');
    await checkin(repo, '2026-10-24');
    expect(await agendaItems(repo)).toHaveLength(0);
  });

  it('includes open agenda points and leaves out done ones', async () => {
    const repo = createMemoryRepo();
    await repo.saveAgendaPoint({ id: 'a1', text: 'نقطة مفتوحة', day: '2026-10-30', done: false });
    await repo.saveAgendaPoint({ id: 'a2', text: 'نقطة منتهية', day: '2026-10-30', done: true });
    const items = await agendaItems(repo);
    expect(items.map((i) => [i.kind, i.label])).toEqual([['point', 'نقطة مفتوحة']]);
  });

  it('leaves out agenda points written before the latest session', async () => {
    const repo = createMemoryRepo();
    await session(repo, '2026-10-27');
    await repo.saveAgendaPoint({ id: 'a1', text: 'قديمة', day: '2026-10-26', done: false });
    await repo.saveAgendaPoint({ id: 'a2', text: 'جديدة', day: '2026-10-29', done: false });
    expect((await agendaItems(repo)).map((i) => i.label)).toEqual(['جديدة']);
  });

  it('lists the newest first', async () => {
    const repo = createMemoryRepo();
    await checkin(repo, '2026-10-28');
    await repo.saveAgendaPoint({ id: 'a1', text: 'نقطة', day: '2026-10-30', done: false });
    await checkin(repo, '2026-10-29');
    expect((await agendaItems(repo)).map((i) => i.day)).toEqual(['2026-10-30', '2026-10-29', '2026-10-28']);
  });
});
