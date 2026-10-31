import { validatePractice, type PracticeDef } from './schema';

const base: PracticeDef = {
  id: 'x',
  stepId: 1,
  title: 'تمرين',
  prompts: [
    { id: 'a', kind: 'text', label: 'سؤال' },
    { id: 'b', kind: 'chips', label: 'سؤال', options: [{ value: 'v', label: 'ل' }] },
  ],
};

describe('validatePractice', () => {
  it('accepts a well-formed practice', () => {
    expect(() => validatePractice(base)).not.toThrow();
  });

  it('rejects duplicate prompt ids', () => {
    const def = { ...base, prompts: [base.prompts[0], { ...base.prompts[1], id: 'a' }] };
    expect(() => validatePractice(def)).toThrow(/Duplicate prompt id/);
  });

  it('rejects showWhen that points at a later or unknown prompt', () => {
    const later = {
      ...base,
      prompts: [
        { ...base.prompts[0], showWhen: { promptId: 'b', equals: 'v' } },
        base.prompts[1],
      ],
    };
    expect(() => validatePractice(later)).toThrow(/showWhen/);
  });

  it('rejects a chips or choice prompt without options', () => {
    const def = { ...base, prompts: [{ id: 'a', kind: 'choice' as const, label: 'سؤال' }] };
    expect(() => validatePractice(def)).toThrow(/options/);
  });
});
