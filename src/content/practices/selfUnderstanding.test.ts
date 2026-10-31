import { practiceById } from '.';
import { steps } from '..';
import { validatePractice } from '../schema';
import { exportBackup, importBackup } from '../../db/backup';
import { createMemoryRepo } from '../../db/memoryRepo';

describe('owner-supplied Step 4 self understanding', () => {
  it('keeps the five supplied questions in order as a distinct practice', () => {
    const def = practiceById('self-understanding');
    expect(def).toBeDefined();
    expect(def!.stepId).toBe(4);
    expect(def!.prompts.map(p => [p.id, p.kind, p.label])).toEqual([
      ['s1', 'text', 'ما المشكلة في جملة واحدة؟'],
      ['s2', 'text', 'ماذا يقول لي صوت الخزي عني بسبب هذه المشكلة؟'],
      ['s3', 'text', 'ما الذي يحاول هذا النمط أن يحميني منه؟'],
      ['s4', 'text', 'ما الذي كان ينقصني كلما حاولتُ التغيير؟'],
      ['s5', 'text', 'ماذا كان سيقول صديق منصف، لا يحكم عليّ، عن قصتي؟'],
    ]);
    expect(() => validatePractice(def!)).not.toThrow();
    expect(steps.find(s => s.id === 4)?.coreQuestion).toBe('ما الذي أحتاج إلى فهمه حقًا عن نفسي في هذه المشكلة؟');
  });

  it('has a lesson sentence in correct, plain Arabic', () => {
    expect(steps.find(s => s.id === 4)?.lesson).toBe(
      'أقرأ قصتي بصدق، وألاحظ النمط الذي أكرره، وأفهم ما كان ينقصني حين حاولتُ التغيير. أبدأ بالتقبّل، وأترك مساحة للتغيير دون جلد للذات.',
    );
  });

  it('preserves historical trigger question ids and meanings', () => {
    expect(practiceById('understand')!.prompts.map(p => [p.id, p.label])).toEqual([
      ['u1', 'ما الموقف بالتحديد؟'], ['u2', 'ما أول فكرة خطرت لي؟'],
      ['u3', 'أين شعرتُ به في جسدي؟'], ['u4', 'ماذا فعلتُ بعد ذلك؟'],
      ['u5', 'ما الحاجة أو الخوف الذي كان خلف ذلك؟'],
      ['u6', 'هل مرّ بي شعور مشابه من قبل؟ متى؟ ومع من؟'],
      ['u7', 'أسمّي هذا النمط بجملة قصيرة'],
    ]);
  });

  it('backs up both kinds of record without changing their private flags or answers', async () => {
    const source = createMemoryRepo();
    for (const [id, practiceId, key] of [['old', 'understand', 'u1'], ['new', 'self-understanding', 's1']]) {
      await source.savePractice({ id, practiceId, stepId: 4, startedAt: '2026-10-31T10:00:00Z', completedAt: '2026-10-31T10:05:00Z', answers: { [key]: { text: 'سجل خاص' } }, share: false, forNextSession: false });
    }
    const file = await exportBackup(source);
    const target = createMemoryRepo();
    await importBackup(target, JSON.stringify(file), 'replace');
    expect(await target.listPractices()).toEqual(await source.listPractices());
  });
});
