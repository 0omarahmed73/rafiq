import { emotionGroups, emotionLabel, steps, validateContent } from '.';

describe('steps', () => {
  it('lists the ten steps in the journey order', () => {
    expect(steps.map((s) => s.title)).toEqual([
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

  it('numbers steps 1 to 10 and gives each a core question and a lesson', () => {
    expect(steps.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const s of steps) {
      expect(s.coreQuestion.length).toBeGreaterThan(0);
      expect(s.lesson.length).toBeGreaterThan(0);
    }
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
    const labels = new Set(words.map((w) => w.label));
    for (const label of [
      'حزن', 'غضب', 'خوف', 'خجل', 'وحدة', 'إرهاق', 'قلق', 'خيبة',
      'ممتنّ', 'هادئ', 'مرتاح', 'مذنب', 'مُحرَج', 'متوتّر', 'مرتبك', 'مُستنزَف',
    ]) {
      expect(labels.has(label)).toBe(true);
    }
  });

  it('resolves an id to its label', () => {
    expect(emotionLabel('sadness')).toBe('حزن');
  });
});

describe('validateContent', () => {
  it('accepts the shipped content', () => {
    expect(() => validateContent()).not.toThrow();
  });
});
