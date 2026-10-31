import { createDexieStore, RafiqDB } from './dexieRepo';
import { createMemoryStore } from './memoryRepo';
import type { Repo } from './repo';
import { createRepo, type Store } from './repoCore';

let counter = 0;
const factories: [string, () => Store][] = [
  ['dexie', () => createDexieStore(new RafiqDB(`rafiq-test-${counter++}`))],
  ['memory', () => createMemoryStore()],
];

const checkin = (over: Record<string, unknown> = {}) => ({
  at: '2026-10-31T10:00:00.000Z',
  day: '2026-10-31',
  emotions: ['sadness'],
  intensity: 5,
  tags: [] as string[],
  forNextSession: false,
  ...over,
});

const practice = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  practiceId: 'validate',
  stepId: 1,
  startedAt: '2026-10-31T10:00:00.000Z',
  answers: {} as Record<string, unknown>,
  share: false,
  forNextSession: false,
  ...over,
});

describe.each(factories)('Repo contract (%s)', (_name, makeStore) => {
  let store: Store;
  let repo: Repo;

  beforeEach(() => {
    store = makeStore();
    repo = createRepo(store);
  });

  it('assigns an id and updatedAt when a check-in is added', async () => {
    const saved = await repo.addCheckin(checkin());
    expect(saved.id).toBeTruthy();
    expect(saved.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('lists check-ins inclusive of both bounds, excluding other days, ordered by time', async () => {
    await repo.addCheckin(checkin({ day: '2026-10-30', at: '2026-10-30T09:00:00.000Z' }));
    await repo.addCheckin(checkin({ day: '2026-10-31', at: '2026-10-31T18:00:00.000Z', note: 'late' }));
    await repo.addCheckin(checkin({ day: '2026-10-31', at: '2026-10-31T08:00:00.000Z', note: 'early' }));
    await repo.addCheckin(checkin({ day: '2026-11-01', at: '2026-11-01T09:00:00.000Z' }));

    const one = await repo.listCheckins({ from: '2026-10-31', to: '2026-10-31' });
    expect(one.map((c) => c.note)).toEqual(['early', 'late']);

    const all = await repo.listCheckins({ from: '2026-10-30', to: '2026-11-01' });
    expect(all).toHaveLength(4);
  });

  it('keeps one practice when the same id is saved twice', async () => {
    await repo.savePractice(practice({ answers: { a: 1 } }));
    await repo.savePractice(practice({ answers: { a: 2 } }));
    const list = await repo.listPractices();
    expect(list).toHaveLength(1);
    expect(list[0].answers).toEqual({ a: 2 });
  });

  it('returns the unfinished practice as a draft and none once it is completed', async () => {
    await repo.savePractice(practice());
    expect((await repo.getDraft('validate'))?.id).toBe('p1');
    await repo.savePractice(practice({ completedAt: '2026-10-31T10:05:00.000Z' }));
    expect(await repo.getDraft('validate')).toBeUndefined();
  });

  it('defaults a step to notStarted with no days practised', async () => {
    const p = await repo.getStepProgress(3);
    expect(p.status).toBe('notStarted');
    expect(p.daysPracticed).toEqual([]);
    expect(p.stepId).toBe(3);
  });

  it('defaults settings to the system theme', async () => {
    expect((await repo.getSettings()).theme).toBe('system');
  });

  it('does not store the same soothing text twice', async () => {
    await repo.addSoothing('الرسم', 'user');
    await repo.addSoothing('الرسم', 'step1');
    expect(await repo.listSoothing()).toHaveLength(1);
  });

  it('round-trips every table through exportAll and replaceAll, dropping extra rows', async () => {
    await repo.addCheckin(checkin());
    await repo.savePractice(practice());
    await repo.addLetter({ kind: 'self', text: 'x', at: '2026-10-31T10:00:00.000Z', share: false });
    await repo.saveStepProgress({ stepId: 2, status: 'inProgress', daysPracticed: ['2026-10-31'] });
    await repo.addSoothing('مسلسلي', 'step1');
    await repo.saveAgendaPoint({ id: 'ap1', text: 'نقطة', day: '2026-10-31', done: false });
    const snapshot = await repo.exportAll();

    await repo.addCheckin(checkin({ note: 'extra' }));
    await repo.replaceAll(snapshot);

    expect(await repo.exportAll()).toEqual(snapshot);
  });

  it('merges by keeping the record with the later updatedAt and records only present locally', async () => {
    const local = await repo.addCheckin(checkin({ note: 'local' }));
    const onlyLocal = await repo.addCheckin(checkin({ note: 'only-local', at: '2026-10-31T11:00:00.000Z' }));
    const snapshot = await repo.exportAll();

    const newer = { ...local, note: 'incoming-newer', updatedAt: '2999-01-01T00:00:00.000Z' };
    await repo.mergeAll({ ...snapshot, checkins: [newer] });
    let notes = (await repo.exportAll()).checkins.map((c) => c.note).sort();
    expect(notes).toEqual(['incoming-newer', 'only-local']);

    const older = { ...local, note: 'incoming-older', updatedAt: '2000-01-01T00:00:00.000Z' };
    await repo.mergeAll({ ...snapshot, checkins: [older] });
    notes = (await repo.exportAll()).checkins.map((c) => c.note).sort();
    expect(notes).toEqual(['incoming-newer', 'only-local']);
    expect(onlyLocal.id).toBeTruthy();
  });

  it('leaves the store unchanged when a transaction fails', async () => {
    await expect(
      store.transaction(async () => {
        await store.put('letters', {
          id: 'l1',
          kind: 'self',
          text: 'x',
          at: '2026-10-31T10:00:00.000Z',
          share: false,
          updatedAt: '2026-10-31T10:00:00.000Z',
        });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await repo.listLetters()).toHaveLength(0);
  });

  describe('year plan', () => {
    it('starts empty', async () => {
      expect(await repo.listYearPlan()).toEqual([]);
    });

    it('keeps one entry per id, the latest write winning', async () => {
      await repo.saveYearPlanEntry({ id: 't:0:0:0', value: true });
      await repo.saveYearPlanEntry({ id: 't:0:0:0', value: false });
      await repo.saveYearPlanEntry({ id: 'n:m1', value: 'نص' });
      const rows = await repo.listYearPlan();
      expect(rows.map((r) => [r.id, r.value]).sort()).toEqual([
        ['n:m1', 'نص'],
        ['t:0:0:0', false],
      ]);
      expect(rows[0].updatedAt).toMatch(/^\d{4}-/);
    });
  });

  describe('agenda points', () => {
    it('deletes one point and leaves the others', async () => {
      await repo.saveAgendaPoint({ id: 'a1', text: 'أولى', day: '2026-10-30', done: false });
      await repo.saveAgendaPoint({ id: 'a2', text: 'ثانية', day: '2026-10-30', done: false });
      await repo.deleteAgendaPoint('a1');
      expect((await repo.listAgendaPoints()).map((p) => p.id)).toEqual(['a2']);
    });

    it('ignores an id that does not exist', async () => {
      await expect(repo.deleteAgendaPoint('missing')).resolves.toBeUndefined();
    });
  });
});
