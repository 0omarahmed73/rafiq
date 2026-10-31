import { createMemoryRepo } from '../../db/memoryRepo';
import type { PracticeRecord } from '../../db/schema';
import type { PracticeDef } from '../../content/schema';
import { applySink, applySoothing, nextPromptId, visiblePrompts } from './engine';
import { branchingDef } from './testDefs';

describe('nextPromptId', () => {
  it('goes to the gated prompt when the condition holds', () => {
    expect(nextPromptId(branchingDef, { p2: { value: 'need' } }, 'p2')).toBe('p3');
  });

  it('skips the gated prompt when the condition does not hold', () => {
    expect(nextPromptId(branchingDef, { p2: { value: 'desire' } }, 'p2')).toBe('p4');
  });

  it('skips the gated prompt when the gating question is unanswered', () => {
    expect(nextPromptId(branchingDef, {}, 'p2')).toBe('p4');
  });

  it('returns null after the last prompt', () => {
    expect(nextPromptId(branchingDef, {}, 'p4')).toBeNull();
  });
});

describe('visiblePrompts', () => {
  it('hides prompts whose condition fails', () => {
    expect(visiblePrompts(branchingDef, { p2: { value: 'desire' } }).map((p) => p.id)).toEqual([
      'p1',
      'p2',
      'p4',
    ]);
    expect(visiblePrompts(branchingDef, { p2: { value: 'need' } }).map((p) => p.id)).toEqual([
      'p1',
      'p2',
      'p3',
      'p4',
    ]);
  });
});

const record = (over: Partial<PracticeRecord> = {}): PracticeRecord => ({
  id: 'r1',
  practiceId: 't1',
  stepId: 2,
  startedAt: '2026-10-31T10:00:00.000Z',
  completedAt: '2026-10-31T10:05:00.000Z',
  answers: {},
  share: true,
  forNextSession: false,
  updatedAt: '',
  ...over,
});

describe('applySoothing', () => {
  const def: PracticeDef = {
    id: 's',
    stepId: 1,
    title: 'ت',
    prompts: [
      { id: 'text', kind: 'text', label: 'نص' },
      { id: 'soothe', kind: 'list', label: 'ما يريحني', saveToSoothing: 'step1' },
    ],
  };

  it('adds each chosen item to the soothing list with its source', async () => {
    const repo = createMemoryRepo();
    await applySoothing(repo, def, record({ answers: { soothe: ['الرسم', 'سماع ألبوم'] } }));
    const list = await repo.listSoothing();
    expect(list.map((s) => [s.text, s.source]).sort()).toEqual([
      ['الرسم', 'step1'],
      ['سماع ألبوم', 'step1'],
    ]);
  });

  it('skips blank entries and items already in the list', async () => {
    const repo = createMemoryRepo();
    await repo.addSoothing('الرسم', 'user');
    await applySoothing(repo, def, record({ answers: { soothe: ['الرسم', '  ', 'مشي قصير'] } }));
    expect((await repo.listSoothing()).map((s) => s.text).sort()).toEqual(['الرسم', 'مشي قصير']);
  });

  it('does nothing for a prompt without the setting or an unanswered prompt', async () => {
    const repo = createMemoryRepo();
    await applySoothing(repo, def, record({ answers: {} }));
    await applySoothing(repo, branchingDef, record({ answers: { p4: ['x'] } }));
    expect(await repo.listSoothing()).toHaveLength(0);
  });
});

describe('applySink', () => {
  it('writes a letter from the first text answer for a letter sink', async () => {
    const repo = createMemoryRepo();
    const def = { ...branchingDef, sink: 'letter:gratitude' as const };
    await applySink(repo, def, record({ answers: { p1: { text: 'شكرًا لنفسي' } } }));
    const letters = await repo.listLetters();
    expect(letters).toHaveLength(1);
    expect(letters[0]).toMatchObject({ kind: 'gratitude', text: 'شكرًا لنفسي', share: true });
  });

  it('writes no letter when the text answer is empty', async () => {
    const repo = createMemoryRepo();
    const def = { ...branchingDef, sink: 'letter:self' as const };
    await applySink(repo, def, record({ answers: { p1: { text: '   ' } } }));
    expect(await repo.listLetters()).toHaveLength(0);
  });

  it('stores the acceptance decision and reasons on the step progress', async () => {
    const repo = createMemoryRepo();
    const def = { ...branchingDef, sink: 'acceptDecision' as const };
    await applySink(
      repo,
      def,
      record({ answers: { a6: { value: 'change' }, a7: ['سبب أول', 'سبب ثانٍ'] } }),
    );
    const progress = await repo.getStepProgress(2);
    expect(progress.decision).toEqual({ acceptanceChoice: 'change', reasons: ['سبب أول', 'سبب ثانٍ'] });
  });

  describe('followup sink', () => {
    const regulation = (over: Partial<PracticeRecord> = {}): PracticeRecord =>
      record({
        id: 'reg1',
        practiceId: 'regulation',
        stepId: 3,
        completedAt: '2026-10-31T20:00:00.000Z',
        answers: {
          feelings: [
            { id: 'anger', intensity: 9 },
            { id: 'sadness', intensity: 7 },
          ],
        },
        ...over,
      });
    const followupDef = { ...branchingDef, id: 'regulation-followup', stepId: 3, sink: 'followup' as const };
    const followupRecord = (answers: Record<string, unknown>) =>
      record({ id: 'fu1', practiceId: 'regulation-followup', stepId: 3, answers });

    it('links the latest completed regulation record and stores before and after', async () => {
      const repo = createMemoryRepo();
      await repo.savePractice(regulation({ id: 'old', completedAt: '2026-10-30T20:00:00.000Z' }));
      await repo.savePractice(regulation());
      await applySink(
        repo,
        followupDef,
        followupRecord({
          tried: { values: ['validation', 'breathing'], text: 'مشي قصير' },
          helped: { value: 'much' },
          intensityAfter: 3,
          noticed: { text: 'هدأتُ' },
        }),
      );
      const [saved] = await repo.listFollowups();
      expect(saved).toMatchObject({
        practiceRecordId: 'reg1',
        intensityBefore: 9,
        intensityAfter: 3,
        helped: 'much',
        tried: ['validation', 'breathing', 'مشي قصير'],
        note: 'هدأتُ',
      });
    });

    it('stores nothing when there is no regulation record to follow up', async () => {
      const repo = createMemoryRepo();
      await applySink(repo, followupDef, followupRecord({ helped: { value: 'much' }, intensityAfter: 3 }));
      expect(await repo.listFollowups()).toHaveLength(0);
    });

    it('stores nothing when the user did not say whether it helped', async () => {
      const repo = createMemoryRepo();
      await repo.savePractice(regulation());
      await applySink(repo, followupDef, followupRecord({ intensityAfter: 3 }));
      expect(await repo.listFollowups()).toHaveLength(0);
    });
  });

  it('does nothing for a practice without a sink', async () => {
    const repo = createMemoryRepo();
    await applySink(repo, branchingDef, record());
    expect(await repo.listLetters()).toHaveLength(0);
  });
});
