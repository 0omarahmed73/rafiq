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
    expect((await repo.getSettings()).currentCountryCode).toBeUndefined();
  });

  it('stores an optional country code without defaulting one', async () => {
    await repo.saveSettings({ id: 'settings', theme: 'system', currentCountryCode: 'EG' });
    expect((await repo.getSettings()).currentCountryCode).toBe('EG');
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

  it('propagates deletion tombstones in either merge direction', async () => {
    await repo.savePractice(practice({ id: 'delete-me' }));
    const beforeDelete = await repo.exportAll();
    await repo.deletePractice('delete-me');
    const afterDelete = await repo.exportAll();
    expect(afterDelete.syncTombstones).toHaveLength(1);
    expect(afterDelete.syncTombstones[0]).toMatchObject({ table: 'practices', recordId: 'delete-me' });

    await repo.mergeAll(beforeDelete);
    expect((await repo.listPractices()).map((p) => p.id)).not.toContain('delete-me');

    const other = createRepo(makeStore());
    await other.mergeAll(beforeDelete);
    await other.mergeAll(afterDelete);
    expect((await other.listPractices()).map((p) => p.id)).not.toContain('delete-me');
    expect((await other.exportAll()).syncTombstones).toHaveLength(1);
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

  describe('deleting a practice record', () => {
    it('removes only that record, drafts and finished ones alike', async () => {
      await repo.savePractice(practice({ id: 'keep', completedAt: '2026-10-31T10:05:00.000Z' }));
      await repo.savePractice(practice({ id: 'gone', completedAt: '2026-10-31T10:06:00.000Z' }));
      await repo.savePractice(practice({ id: 'draft', practiceId: 'accept' }));
      await repo.deletePractice('gone');
      await repo.deletePractice('draft');
      expect((await repo.listPractices()).map((p) => p.id)).toEqual(['keep']);
      expect(await repo.getDraft('accept')).toBeUndefined();
    });

    it('ignores an id that does not exist', async () => {
      await expect(repo.deletePractice('missing')).resolves.toBeUndefined();
    });
  });

  describe('homework', () => {
    const hw = (over: Record<string, unknown> = {}) => ({
      id: 'h1',
      sessionId: 's1',
      text: 'أقرأ الفصل',
      done: false,
      createdAt: '2026-10-27T09:00:00.000Z',
      ...over,
    });
    const img = (over: Record<string, unknown> = {}) => ({
      id: 'i1',
      homeworkId: 'h1',
      dataUrl: 'data:image/jpeg;base64,AAAA',
      createdAt: '2026-10-27T09:00:00.000Z',
      ...over,
    });

    it('saves, gets and lists homework newest first', async () => {
      await repo.saveHomework(hw({ id: 'old', createdAt: '2026-10-01T09:00:00.000Z' }));
      await repo.saveHomework(hw({ id: 'new', createdAt: '2026-10-30T09:00:00.000Z' }));
      expect((await repo.listHomework()).map((h) => h.id)).toEqual(['new', 'old']);
      expect(await repo.getHomework('new')).toMatchObject({ id: 'new', text: 'أقرأ الفصل' });
      expect((await repo.getHomework('new'))!.updatedAt).toMatch(/^\d{4}-/);
      expect(await repo.getHomework('missing')).toBeUndefined();
    });

    it('lists homework by session, oldest first', async () => {
      await repo.saveHomework(hw({ id: 'b', createdAt: '2026-10-28T09:00:00.000Z' }));
      await repo.saveHomework(hw({ id: 'a', createdAt: '2026-10-27T09:00:00.000Z' }));
      await repo.saveHomework(hw({ id: 'other', sessionId: 's2' }));
      expect((await repo.listHomeworkBySession('s1')).map((h) => h.id)).toEqual(['a', 'b']);
    });

    it('lists the images of one homework, oldest first', async () => {
      await repo.saveHomeworkImage(img({ id: 'second', createdAt: '2026-10-27T10:00:00.000Z' }));
      await repo.saveHomeworkImage(img({ id: 'first', createdAt: '2026-10-27T09:00:00.000Z' }));
      await repo.saveHomeworkImage(img({ id: 'x', homeworkId: 'h2' }));
      expect((await repo.listHomeworkImages('h1')).map((i) => i.id)).toEqual(['first', 'second']);
    });

    it('deleting a homework deletes its images and no one elses', async () => {
      await repo.saveHomework(hw({ id: 'h1' }));
      await repo.saveHomework(hw({ id: 'h2' }));
      await repo.saveHomeworkImage(img({ id: 'a', homeworkId: 'h1' }));
      await repo.saveHomeworkImage(img({ id: 'b', homeworkId: 'h2' }));
      await repo.deleteHomework('h1');
      expect((await repo.listHomework()).map((h) => h.id)).toEqual(['h2']);
      expect((await repo.exportAll()).homeworkImages.map((i) => i.id)).toEqual(['b']);
      expect((await repo.exportAll()).syncTombstones.map((t) => [t.table, t.recordId]).sort()).toEqual([
        ['homework', 'h1'],
        ['homeworkImages', 'a'],
      ]);
    });

    it('counts images per homework without returning them', async () => {
      await repo.saveHomework(hw({ id: 'h1' }));
      await repo.saveHomework(hw({ id: 'h2' }));
      await repo.saveHomework(hw({ id: 'h3' }));
      await repo.saveHomeworkImage(img({ id: 'a', homeworkId: 'h1' }));
      await repo.saveHomeworkImage(img({ id: 'b', homeworkId: 'h1' }));
      await repo.saveHomeworkImage(img({ id: 'c', homeworkId: 'h2' }));
      expect(await repo.countHomeworkImages()).toEqual({ h1: 2, h2: 1 });
    });

    it('deletes one image and ignores a missing id', async () => {
      await repo.saveHomeworkImage(img({ id: 'a' }));
      await repo.deleteHomeworkImage('a');
      await expect(repo.deleteHomeworkImage('a')).resolves.toBeUndefined();
      await expect(repo.deleteHomework('missing')).resolves.toBeUndefined();
      expect(await repo.listHomeworkImages('h1')).toEqual([]);
    });

    it('exports homework and images with the rest of the data', async () => {
      await repo.saveHomework(hw());
      await repo.saveHomeworkImage(img());
      const all = await repo.exportAll();
      expect(all.homework).toHaveLength(1);
      expect(all.homeworkImages).toHaveLength(1);
      expect(all.homeworkImages[0].kind).toBe('prompt');
    });

    it('shares a six-photo total across prompt and answer images', async () => {
      for (let i = 0; i < 6; i += 1) await repo.saveHomeworkImage(img({ id: `prompt-${i}` }));
      await expect(repo.saveHomeworkImage(img({ id: 'answer-1', kind: 'answer' }))).rejects.toThrow('Homework photo limit reached');
      await repo.deleteHomeworkImage('prompt-0');
      await repo.saveHomeworkImage(img({ id: 'answer-1', kind: 'answer' }));
      expect((await repo.listHomeworkImages('h1')).map((image) => image.kind).sort()).toEqual(['answer', 'prompt', 'prompt', 'prompt', 'prompt', 'prompt']);
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
