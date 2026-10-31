import { validateContent } from '..';
import { practiceById, practices, practicesForStep } from '.';
import { validatePractice } from '../schema';

const get = (id: string) => {
  const def = practiceById(id);
  if (!def) throw new Error(`missing practice ${id}`);
  return def;
};

describe('registry', () => {
  it('holds valid practices with unique ids, and validateContent accepts them', () => {
    expect(new Set(practices.map((p) => p.id)).size).toBe(practices.length);
    for (const p of practices) expect(() => validatePractice(p)).not.toThrow();
    expect(() => validateContent()).not.toThrow();
  });

  it('files each practice under its step', () => {
    expect(practicesForStep(1).map((p) => p.id)).toEqual(['validate']);
    expect(practicesForStep(2).map((p) => p.id)).toEqual(['accept']);
    expect(practicesForStep(3).map((p) => p.id)).toEqual(['regulation', 'regulation-followup']);
  });
});

describe('validate (step 1)', () => {
  const def = get('validate');

  it('has the five parts in order', () => {
    expect(def.prompts.map((p) => p.id)).toEqual(['v1', 'v2', 'v3', 'v4', 'v5']);
    expect(def.prompts.map((p) => p.kind)).toEqual(['emotion', 'text', 'chips', 'text', 'list']);
  });

  it('takes one emotion in part 1 and two text fields in part 2', () => {
    expect(def.prompts[0].multi).toBeFalsy();
    expect(def.prompts[1].fields).toHaveLength(2);
  });

  it('offers six fears in part 3 and builds the sentence from the chosen one', () => {
    const v3 = def.prompts[2];
    expect(v3.options).toHaveLength(6);
    const chosen = v3.options!.find((o) => o.label === 'أن أُهمَل')!;
    expect(v3.template!.replace('{label}', chosen.label)).toBe('طبعًا يؤلمني هذا، لأنني أخاف أن أُهمَل.');
  });

  it('prefills part 5 from the soothing list', () => {
    expect(def.prompts[4].prefill).toBe('soothingList');
  });
});

describe('accept (step 2)', () => {
  const def = get('accept');
  const prompt = (id: string) => def.prompts.find((p) => p.id === id)!;

  it('has seven questions a1 to a7', () => {
    expect(def.prompts.map((p) => p.id)).toEqual(['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7']);
  });

  it('asks what is rejected together with the rights question', () => {
    expect(prompt('a1').kind).toBe('choice');
    expect(prompt('a1').textLabel).toBe('ما الذي أرفضه؟');
  });

  it('classifies the rejection as need, desire, preference or none of these', () => {
    expect(prompt('a2').options!.map((o) => [o.value, o.label])).toEqual([
      ['need', 'حاجة'],
      ['desire', 'رغبة'],
      ['preference', 'تفضيل'],
      ['none', 'ليس أيًّا منها'],
    ]);
  });

  it('asks which need only after the answer "need"', () => {
    expect(prompt('a3').showWhen).toEqual({ promptId: 'a2', equals: 'need' });
    expect(prompt('a3').multi).toBe(true);
    expect(prompt('a3').options!.map((o) => o.label)).toEqual([
      'الاحترام',
      'الوضوح',
      'الأمان',
      'التقدير',
      'الانتماء',
      'الاستقلال',
      'الراحة',
      'العدل',
    ]);
  });

  it('records keep or change, then the reasons, and stores the decision', () => {
    expect(prompt('a6').options!.map((o) => o.value)).toEqual(['keep', 'change']);
    expect(prompt('a7').kind).toBe('list');
    expect(def.sink).toBe('acceptDecision');
  });
});

describe('regulation (step 3)', () => {
  it('records situation, feelings, thought, automatic reaction and instructions', () => {
    const def = get('regulation');
    expect(def.prompts.map((p) => p.id)).toEqual([
      'situation',
      'feelings',
      'thought',
      'autoReaction',
      'selfInstructions',
    ]);
    const feelings = def.prompts[1];
    expect(feelings.kind).toBe('emotion');
    expect(feelings.multi).toBe(true);
  });

  it('follows up with what was tried, whether it helped, the new intensity and what was noticed', () => {
    const def = get('regulation-followup');
    expect(def.prompts.map((p) => p.id)).toEqual(['tried', 'helped', 'intensityAfter', 'noticed']);
    expect(def.prompts[1].options!.map((o) => o.value)).toEqual(['much', 'little', 'no']);
    expect(def.sink).toBe('followup');
  });
});
