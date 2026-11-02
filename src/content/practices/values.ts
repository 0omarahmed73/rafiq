import type { Bi } from '../../i18n';
import type { PracticeDef, Prompt } from '../schema';

const text = (id: string, label: Bi, hint?: Bi): Prompt => ({
  id,
  kind: 'text',
  label,
  ...(hint ? { hint } : {}),
});

/** Step 10, القيم والاتجاه: values as a direction to walk in, even with pain present. English is a draft. */
export const values: PracticeDef = {
  id: 'values',
  stepId: 10,
  title: { ar: 'قيمي واتجاهي', en: 'My values and direction' },
  prompts: [
    {
      id: 'w1',
      kind: 'chips',
      multi: true,
      label: { ar: 'ما الذي يهمّني في هذه المجالات؟', en: 'What matters to me in these areas?' },
      hint: { ar: 'أختار ثلاثة مجالات.', en: 'I choose three areas.' },
      options: [
        { value: 'relationships', label: { ar: 'العلاقات', en: 'Relationships' } },
        { value: 'work', label: { ar: 'العمل أو الدراسة', en: 'Work or study' } },
        { value: 'faith', label: { ar: 'الإيمان', en: 'Faith' } },
        { value: 'health', label: { ar: 'الصحة', en: 'Health' } },
        { value: 'growth', label: { ar: 'النمو', en: 'Growth' } },
        { value: 'community', label: { ar: 'المجتمع', en: 'Community' } },
      ],
      textLabel: { ar: 'أكتب ما يهمّني فيها', en: 'I write what matters to me in them' },
    },
    text('w2', { ar: 'من أريد أن أكون بعد سنة؟', en: 'Who do I want to be in a year?' }),
    text(
      'w3',
      { ar: 'أيّ ألم أمرّ به يدلّ على قيمة مهمة لي؟', en: 'What pain am I going through that points to an important value for me?' },
      {
        ar: 'مثلًا: ألم الإهمال يدلّ على قيمة الانتماء.',
        en: 'For example: the pain of being neglected points to a value of belonging.',
      },
    ),
    text('w4', { ar: 'ما خطوة صغيرة هذا الأسبوع تعبّر عن هذه القيمة؟', en: 'What small step this week expresses this value?' }),
    text('w5', { ar: 'ما الذي قد يعيقني؟ وكيف أتعامل معه بتقبّل؟', en: 'What might get in the way? How do I deal with it with acceptance?' }),
    text('w6', { ar: 'رسالة إلى نفسي بعد سنة', en: 'A letter to myself in a year' }),
  ],
};
