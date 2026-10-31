import type { PracticeDef, Prompt } from '../schema';

const text = (id: string, label: string, hint?: string): Prompt => ({
  id,
  kind: 'text',
  label,
  ...(hint ? { hint } : {}),
});

/** Step 9, العناية والعادات: one small habit and a care list shared with step 1's soothing list. */
export const care: PracticeDef = {
  id: 'care',
  stepId: 9,
  title: 'عادة صغيرة',
  prompts: [
    {
      id: 'g1',
      kind: 'chips',
      label: 'أي جانب يحتاج انتباهًا الآن؟',
      options: [
        { value: 'sleep', label: 'النوم' },
        { value: 'movement', label: 'الحركة' },
        { value: 'food', label: 'الأكل' },
        { value: 'connection', label: 'التواصل' },
        { value: 'rest', label: 'الراحة' },
        { value: 'joy', label: 'المتعة' },
      ],
    },
    {
      id: 'g2',
      kind: 'list',
      label: 'قائمتي المهدّئة',
      hint: 'تبدأ مما اخترتُه في الخطوة الأولى، وأضيف إليها ما أريد.',
      prefill: 'soothingList',
      saveToSoothing: 'step9',
    },
    text('g3', 'عادة صغيرة واحدة', 'بصيغة: عندما …، سأ …'),
    {
      id: 'g4',
      kind: 'text',
      label: 'ما العائق المتوقع؟ وما الخطة البديلة؟',
      fields: [
        { id: 'obstacle', label: 'العائق المتوقع' },
        { id: 'plan', label: 'الخطة البديلة' },
      ],
    },
    text('g5', 'متى أراجع؟', 'مراجعة أسبوعية قصيرة.'),
  ],
};
