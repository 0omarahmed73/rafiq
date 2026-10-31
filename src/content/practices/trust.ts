import type { PracticeDef, Prompt } from '../schema';

const text = (id: string, label: string, hint?: string): Prompt => ({
  id,
  kind: 'text',
  label,
  ...(hint ? { hint } : {}),
});

/** Step 8, الثقة بالنفس: a promise book, built from very small promises kept every day. */
export const trust: PracticeDef = {
  id: 'trust',
  stepId: 8,
  title: 'دفتر الوعود',
  prompts: [
    text('t1', 'أختار وعدًا صغيرًا جدًا', 'وعد يُنجَز في أقل من خمس دقائق.'),
    text('t2', 'متى سأفعله بالضبط؟'),
    {
      id: 't3',
      kind: 'summary',
      label: 'أسجّل الوفاء كل يوم',
      hint: 'أعود كل يوم وأدوّن هل وفيتُ بوعدي. كل وفاء دليل جديد على أنني أستطيع الاعتماد على نفسي.',
    },
    text('t4', 'بعد سبعة أيام: كم مرة وفيتُ؟'),
    text('t5', 'إن لم أفِ: ما العائق؟', 'دون لوم. ثم أجعل الوعد أصغر.'),
    text('t6', 'أكبّر الوعد تدريجيًا', 'ما الوعد التالي، وهو أكبر قليلًا؟'),
  ],
};
