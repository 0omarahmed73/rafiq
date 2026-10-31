import type { PracticeDef, Prompt } from '../schema';

const text = (id: string, label: string, hint?: string): Prompt => ({
  id,
  kind: 'text',
  label,
  ...(hint ? { hint } : {}),
});

/** Step 10, القيم والاتجاه: values as a direction to walk in, even with pain present. */
export const values: PracticeDef = {
  id: 'values',
  stepId: 10,
  title: 'قيمي واتجاهي',
  prompts: [
    {
      id: 'w1',
      kind: 'chips',
      multi: true,
      label: 'ما الذي يهمّني في هذه المجالات؟',
      hint: 'أختار ثلاثة مجالات.',
      options: [
        { value: 'relationships', label: 'العلاقات' },
        { value: 'work', label: 'العمل أو الدراسة' },
        { value: 'faith', label: 'الإيمان' },
        { value: 'health', label: 'الصحة' },
        { value: 'growth', label: 'النمو' },
        { value: 'community', label: 'المجتمع' },
      ],
      textLabel: 'أكتب ما يهمّني فيها',
    },
    text('w2', 'من أريد أن أكون بعد سنة؟'),
    text('w3', 'أيّ ألم أمرّ به يدلّ على قيمة مهمة لي؟', 'مثلًا: ألم الإهمال يدلّ على قيمة الانتماء.'),
    text('w4', 'ما خطوة صغيرة هذا الأسبوع تعبّر عن هذه القيمة؟'),
    text('w5', 'ما الذي قد يعيقني؟ وكيف أتعامل معه بتقبّل؟'),
    text('w6', 'رسالة إلى نفسي بعد سنة'),
  ],
};
