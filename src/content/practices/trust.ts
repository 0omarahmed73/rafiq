import type { Bi } from '../../i18n';
import type { PracticeDef, Prompt } from '../schema';

const text = (id: string, label: Bi, hint?: Bi): Prompt => ({
  id,
  kind: 'text',
  label,
  ...(hint ? { hint } : {}),
});

/** Step 8, الثقة بالنفس: a promise book, built from very small promises kept every day. English is a draft. */
export const trust: PracticeDef = {
  id: 'trust',
  stepId: 8,
  title: { ar: 'دفتر الوعود', en: 'Promise book' },
  prompts: [
    text(
      't1',
      { ar: 'أختار وعدًا صغيرًا جدًا', en: 'I choose a very small promise' },
      { ar: 'وعد يُنجَز في أقل من خمس دقائق.', en: 'A promise that takes less than five minutes.' },
    ),
    text('t2', { ar: 'متى سأفعله بالضبط؟', en: 'When exactly will I do it?' }),
    {
      id: 't3',
      kind: 'summary',
      label: { ar: 'أسجّل الوفاء كل يوم', en: 'I record whether I kept it, every day' },
      hint: {
        ar: 'أعود كل يوم وأدوّن هل وفيتُ بوعدي. كل وفاء دليل جديد على أنني أستطيع الاعتماد على نفسي.',
        en: 'I come back every day and note whether I kept my promise. Every kept promise is new evidence that I can rely on myself.',
      },
    },
    text('t4', { ar: 'بعد سبعة أيام: كم مرة وفيتُ؟', en: 'After seven days: how many times did I keep it?' }),
    text(
      't5',
      { ar: 'إن لم أفِ: ما العائق؟', en: 'If I did not keep it: what got in the way?' },
      { ar: 'دون لوم. ثم أجعل الوعد أصغر.', en: 'Without blame. Then I make the promise smaller.' },
    ),
    text(
      't6',
      { ar: 'أكبّر الوعد تدريجيًا', en: 'I make the promise bigger, gradually' },
      { ar: 'ما الوعد التالي، وهو أكبر قليلًا؟', en: 'What is the next promise, a little bigger?' },
    ),
  ],
};
