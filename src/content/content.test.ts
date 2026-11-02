import { setActiveLanguage } from '../i18n';
import { emotionGroups, emotionLabel, steps, validateContent } from '.';

describe('steps', () => {
  it('lists the ten steps in the journey order', () => {
    expect(steps.map((s) => s.title.ar)).toEqual([
      'تصديق المشاعر',
      'تقبّل الذات',
      'تنظيم الذات',
      'فهم الذات',
      'التعاطف مع الذات',
      'مسامحة الذات',
      'الحدود واحترام الذات',
      'الثقة بالنفس',
      'العناية والعادات',
      'القيم والاتجاه',
    ]);
  });

  it('numbers steps 1 to 10 and gives each a core question and a lesson in both languages', () => {
    expect(steps.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const s of steps) {
      expect(s.coreQuestion.ar.length).toBeGreaterThan(0);
      expect(s.coreQuestion.en.length).toBeGreaterThan(0);
      expect(s.lesson.ar.length).toBeGreaterThan(0);
      expect(s.lesson.en.length).toBeGreaterThan(0);
    }
  });

  it('has an English title for every step', () => {
    expect(steps.map((s) => s.title.en)).toEqual([
      'Validating feelings',
      'Self-acceptance',
      'Self-regulation',
      'Self-understanding',
      'Self-compassion',
      'Self-forgiveness',
      'Boundaries and self-respect',
      'Self-trust',
      'Care and habits',
      'Values and direction',
    ]);
  });
});

describe('emotions', () => {
  const words = emotionGroups.flatMap((g) => g.words);

  it('has at least 6 groups and 40 words with unique ids', () => {
    expect(emotionGroups.length).toBeGreaterThanOrEqual(6);
    expect(words.length).toBeGreaterThanOrEqual(40);
    expect(new Set(words.map((w) => w.id)).size).toBe(words.length);
  });

  it('includes the words used in the design', () => {
    const labels = new Set(words.map((w) => w.label.ar));
    for (const label of [
      'حزن', 'غضب', 'خوف', 'خجل', 'وحدة', 'إرهاق', 'قلق', 'خيبة',
      'ممتنّ', 'هادئ', 'مرتاح', 'مذنب', 'مُحرَج', 'متوتّر', 'مرتبك', 'مُستنزَف',
    ]) {
      expect(labels.has(label)).toBe(true);
    }
  });

  it('resolves an id to its label in the active language', () => {
    setActiveLanguage('ar');
    expect(emotionLabel('sadness')).toBe('حزن');
    setActiveLanguage('en');
    expect(emotionLabel('sadness')).toBe('Sad');
    setActiveLanguage('ar');
  });

  it('gives every emotion group and word an English label', () => {
    for (const g of emotionGroups) expect(g.label.en.trim()).not.toBe('');
    for (const w of words) expect(w.label.en.trim()).not.toBe('');
  });
});

describe('validateContent', () => {
  it('accepts the shipped content', () => {
    expect(() => validateContent()).not.toThrow();
  });
});
