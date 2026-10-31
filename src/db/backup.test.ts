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
    homework: [{ text: 'خطوة', done: false }],
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
  await repo.saveSettings({ id: 'settings', theme: 'dark' });
  await repo.saveAgendaPoint({ id: 'a1', text: 'نقطة', day: '2026-10-30', done: false });
  return repo;
}

describe('exportBackup', () => {
  it('writes version 1, the export time and every table', async () => {
    const file = await exportBackup(await populated());
    expect(file.version).toBe(1);
    expect(file.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Object.keys(file.data).sort()).toEqual(
      ['agendaPoints', 'checkins', 'followups', 'letters', 'practices', 'sessions', 'settings', 'soothingList', 'stepProgress', 'weeklyReviews'].sort(),
    );
  });
});

describe('importBackup', () => {
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
