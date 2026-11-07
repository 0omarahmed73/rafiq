import type { Prompt } from '../../content/schema';
import { formatAnswer } from './formatAnswer';

/** Bilingual text for fixtures; the English is not used here. */
const bi = (ar: string) => ({ ar, en: ar });

const p = (over: Partial<Prompt>): Prompt => ({ id: 'x', kind: 'text', label: bi('سؤال'), ...over });

describe('formatAnswer', () => {
  it('returns the text of a single text box', () => {
    expect(formatAnswer(p({}), { text: 'مرحبًا' })).toBe('مرحبًا');
  });

  it('labels each filled field of a multi-field text prompt and skips empty ones', () => {
    const prompt = p({ fields: [{ id: 'a', label: bi('الموقف') }, { id: 'b', label: bi('الأثر') }, { id: 'c', label: bi('فارغ') }] });
    expect(formatAnswer(prompt, { a: 'س', b: 'ص', c: '  ' })).toBe('الموقف: س\nالأثر: ص');
  });

  it('writes chip labels followed by the free text', () => {
    const prompt = p({ kind: 'chips', options: [{ value: 'r', label: bi('الاحترام') }, { value: 'c', label: bi('الوضوح') }] });
    expect(formatAnswer(prompt, { values: ['r', 'c'], text: 'لأنه مهم' })).toBe('الاحترام، الوضوح\nلأنه مهم');
  });

  it('writes the chosen option label and its text', () => {
    const prompt = p({ kind: 'choice', options: [{ value: 'yes', label: bi('نعم، هو حقّ لي') }] });
    expect(formatAnswer(prompt, { value: 'yes', text: 'أن أُحترم' })).toBe('نعم، هو حقّ لي — أن أُحترم');
    expect(formatAnswer(prompt, { value: 'yes' })).toBe('نعم، هو حقّ لي');
  });

  it('writes a scale in Arabic-Indic digits out of ten', () => {
    expect(formatAnswer(p({ kind: 'scale' }), 7)).toBe('٧ / ١٠');
  });

  it('joins list items', () => {
    expect(formatAnswer(p({ kind: 'list' }), ['أ', 'ب'])).toBe('أ، ب');
  });

  it('writes emotions with their intensities', () => {
    expect(formatAnswer(p({ kind: 'emotion' }), [{ id: 'anger', intensity: 9 }, { id: 'sadness', intensity: 7 }])).toBe(
      'غضب ٩ / ١٠، حزن ٧ / ١٠',
    );
  });

  it('is empty for an unanswered prompt or an info screen', () => {
    expect(formatAnswer(p({}), undefined)).toBe('');
    expect(formatAnswer(p({ kind: 'summary' }), undefined)).toBe('');
    expect(formatAnswer(p({ kind: 'list' }), [])).toBe('');
  });
});
