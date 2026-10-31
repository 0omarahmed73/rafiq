import { BackupError, exportBackup, importBackup, type BackupFile } from './backup';
import { createMemoryRepo } from './memoryRepo';
import type { Repo } from './repo';

async function populated(): Promise<Repo> {
  const repo = createMemoryRepo();
  await repo.addCheckin({
    at: '2026-10-31T10:00:00.000Z',
    day: '2026-10-31',
    emotions: ['sadness', 'anxiety'],
    intensity: 6,
    tags: ['العمل'],
    note: 'يوم طويل',
    forNextSession: true,
  });
  await repo.savePractice({
    id: 'p1',
    practiceId: 'validate',
    stepId: 1,
    startedAt: '2026-10-31T10:00:00.000Z',
    completedAt: '2026-10-31T10:05:00.000Z',
    answers: { v1: [{ id: 'sadness', intensity: 6 }] },
    share: true,
    forNextSession: false,
  });
  await repo.addFollowup({
    practiceRecordId: 'p1',
    tried: ['breathing'],
    helped: 'much',
    intensityBefore: 9,
    intensityAfter: 3,
    at: '2026-10-31T12:00:00.000Z',
  });
  await repo.addLetter({ kind: 'self', text: 'رسالة', at: '2026-10-31T10:00:00.000Z', share: false });
  await repo.saveWeeklyReview({
    id: 'w1',
    weekStart: '2026-10-24',
    summary: { topEmotions: [{ id: 'sadness', count: 2 }], trend: 'flat', stepsPracticed: [1], question: 'سؤال' },
    answer: 'إجابة',
    share: true,
  });
  await repo.saveSession({
    id: 's1',
    date: '2026-10-27',
    therapistSaid: 'قال',
    takeaway: 'آخذ',
    homework: [],
    createdAt: '2026-10-27T09:00:00.000Z',
  });
  await repo.saveStepProgress({
    stepId: 2,
    status: 'inProgress',
    daysPracticed: ['2026-10-31'],
    readiness: { answers: [4, 4, 3], at: '2026-10-31T11:00:00.000Z' },
    decision: { acceptanceChoice: 'change', reasons: ['سبب'] },
  });
  await repo.addSoothing('الرسم', 'step1');
  await repo.saveSettings({ id: 'settings', theme: 'dark', accent: 'rose' });
  await repo.saveAgendaPoint({ id: 'a1', text: 'نقطة', day: '2026-10-30', done: false });
  await repo.saveHomework({
    id: 'h1',
    sessionId: 's1',
    text: 'أقرأ الفصل',
    notes: 'ملاحظة',
    answer: 'إجابتي',
    done: true,
    createdAt: '2026-10-27T10:00:00.000Z',
  });
  await repo.saveHomeworkImage({
    id: 'i1',
    homeworkId: 'h1',
    dataUrl: 'data:image/jpeg;base64,/9j/AAAA',
    createdAt: '2026-10-27T10:01:00.000Z',
  });
  await repo.saveYearPlanEntry({ id: 't:0:0:1', value: true });
  await repo.saveYearPlanEntry({ id: 'n:m0', value: 'ملاحظة الشهر' });
  return repo;
}

describe('exportBackup', () => {
  it('writes version 1, the export time and every table', async () => {
    const file = await exportBackup(await populated());
    expect(file.version).toBe(1);
    expect(file.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Object.keys(file.data).sort()).toEqual(
      ['agendaPoints', 'checkins', 'followups', 'homework', 'homeworkImages', 'letters', 'practices', 'sessions', 'settings', 'soothingList', 'stepProgress', 'weeklyReviews', 'yearPlan'].sort(),
    );
  });
});

describe('importBackup', () => {
  it('still reads a backup made before the yearly plan existed', async () => {
    const file = await exportBackup(await populated());
    const { yearPlan: _omit, ...older } = file.data;
    const repo = createMemoryRepo();
    await importBackup(repo, { ...file, data: older }, 'replace');
    expect(await repo.listYearPlan()).toEqual([]);
    expect(await repo.listWeeklyReviews()).toHaveLength(1);
  });

  it('round-trips homework and photos', async () => {
    const file = await exportBackup(await populated());
    const target = createMemoryRepo();
    await importBackup(target, JSON.stringify(file), 'replace');
    expect(await target.getHomework('h1')).toMatchObject({ answer: 'إجابتي', notes: 'ملاحظة', done: true, sessionId: 's1' });
    expect((await target.listHomeworkImages('h1')).map((i) => i.dataUrl)).toEqual(['data:image/jpeg;base64,/9j/AAAA']);
  });

  it('reads an old backup that has no homework tables as empty tables', async () => {
    const file = await exportBackup(await populated());
    const { homework: _h, homeworkImages: _i, ...older } = file.data;
    const repo = createMemoryRepo();
    await importBackup(repo, { ...file, data: older }, 'replace');
    expect(await repo.listHomework()).toEqual([]);
    expect((await repo.exportAll()).homeworkImages).toEqual([]);
  });

  it('turns the homework of sessions in an old backup into homework rows, and does not duplicate them on a second import', async () => {
    const file = await exportBackup(await populated());
    const old: BackupFile = structuredClone(file);
    old.data.homework = [];
    old.data.homeworkImages = [];
    old.data.sessions[0] = { ...old.data.sessions[0], homework: [{ text: 'أقرأ', done: false }, { text: 'أكتب', done: true }] };
    const repo = createMemoryRepo();
    await importBackup(repo, old, 'merge');
    await importBackup(repo, old, 'merge');
    const rows = await repo.listHomeworkBySession('s1');
    expect(rows.map((h) => [h.id, h.text, h.done])).toEqual([
      ['legacy-s1-0', 'أقرأ', false],
      ['legacy-s1-1', 'أكتب', true],
    ]);
    expect((await repo.listSessions())[0].homework).toEqual([]);
  });

  it('restores everything from an exported file, as an object or as text', async () => {
    const file = await exportBackup(await populated());

    const fromObject = createMemoryRepo();
    await importBackup(fromObject, file, 'replace');
    expect(await fromObject.exportAll()).toEqual(file.data);

    const fromText = createMemoryRepo();
    await importBackup(fromText, JSON.stringify(file), 'replace');
    expect(await fromText.exportAll()).toEqual(file.data);
  });

  it('replace mode drops what was there before', async () => {
    const file = await exportBackup(await populated());
    const target = createMemoryRepo();
    await target.addSoothing('شيء قديم', 'user');
    await importBackup(target, file, 'replace');
    expect((await target.listSoothing()).map((s) => s.text)).toEqual(['الرسم']);
  });

  it('merge mode keeps newer records and records that exist only locally', async () => {
    const file = await exportBackup(await populated());
    const target = createMemoryRepo();
    const localOnly = await target.addSoothing('محلي فقط', 'user');
    await importBackup(target, file, 'merge');

    expect((await target.listSoothing()).map((s) => s.text).sort()).toEqual(['الرسم', 'محلي فقط']);
    expect(localOnly.id).toBeTruthy();

    const newer: BackupFile = structuredClone(file);
    newer.data.letters[0] = { ...newer.data.letters[0], text: 'نسخة أحدث', updatedAt: '2999-01-01T00:00:00.000Z' };
    await importBackup(target, newer, 'merge');
    expect((await target.listLetters())[0].text).toBe('نسخة أحدث');

    const older: BackupFile = structuredClone(file);
    older.data.letters[0] = { ...older.data.letters[0], text: 'نسخة أقدم', updatedAt: '2000-01-01T00:00:00.000Z' };
    await importBackup(target, older, 'merge');
    expect((await target.listLetters())[0].text).toBe('نسخة أحدث');
  });

  describe('a bad file leaves the existing data untouched and says why', () => {
    const mutate = (fn: (f: BackupFile) => void) => async () => {
      const file = structuredClone(await exportBackup(await populated()));
      fn(file);
      return file as unknown;
    };

    const invalid: [string, () => Promise<unknown>][] = [
      ['text that is not JSON', async () => 'هذا ليس ملف نسخة احتياطية'],
      ['an empty string', async () => ''],
      ['a homework row without a title', mutate((f) => { (f.data.homework[0] as unknown as Record<string, unknown>).text = 5; })],
      ['a photo that points to a web address', mutate((f) => { f.data.homeworkImages[0].dataUrl = 'https://example.invalid/x.png'; })],
      ['a photo that is not text', mutate((f) => { (f.data.homeworkImages[0] as unknown as Record<string, unknown>).dataUrl = 5; })],
      ['null', async () => null],
      ['an array instead of an object', async () => []],
      ['a missing version', mutate((f) => delete (f as Partial<BackupFile>).version)],
      ['a missing table', mutate((f) => delete (f.data as Partial<BackupFile['data']>).checkins)],
      ['an intensity above 10', mutate((f) => (f.data.checkins[0].intensity = 11))],
      ['a fractional intensity', mutate((f) => (f.data.checkins[0].intensity = 2.5))],
      ['a day that is not YYYY-MM-DD', mutate((f) => (f.data.checkins[0].day = '31/10/2026'))],
      ['a share flag that is a string', mutate((f) => ((f.data.practices[0] as unknown as { share: unknown }).share = 'true'))],
      ['a bad value in a later table', mutate((f) => ((f.data.weeklyReviews[0].summary as unknown as { trend: string }).trend = 'sideways'))],
      ['a table that is not a list', mutate((f) => ((f.data as unknown as { letters: unknown }).letters = {}))],
    ];

    it.each(invalid)('%s', async (_name, make) => {
      const repo = await populated();
      const before = await repo.exportAll();
      const error = await importBackup(repo, await make(), 'replace').catch((e: unknown) => e);
      expect(error).toBeInstanceOf(BackupError);
      expect((error as BackupError).message).toBe('الملف غير صالح');
      expect(await repo.exportAll()).toEqual(before);
    });

    it('rejects the same files in merge mode', async () => {
      const repo = await populated();
      const before = await repo.exportAll();
      const bad = await mutate((f) => (f.data.checkins[0].intensity = 11))();
      await expect(importBackup(repo, bad, 'merge')).rejects.toBeInstanceOf(BackupError);
      expect(await repo.exportAll()).toEqual(before);
    });

    it('reports an unsupported version, and changes nothing', async () => {
      const repo = await populated();
      const before = await repo.exportAll();
      const file = await mutate((f) => ((f as unknown as { version: number }).version = 2))();
      const error = await importBackup(repo, file, 'replace').catch((e: unknown) => e);
      expect(error).toBeInstanceOf(BackupError);
      expect((error as BackupError).message).toBe('إصدار الملف غير مدعوم');
      expect(await repo.exportAll()).toEqual(before);
    });
  });
});
