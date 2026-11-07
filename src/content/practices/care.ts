import type { Bi } from '../../i18n';
import type { PracticeDef, Prompt } from '../schema';

const text = (id: string, label: Bi, hint?: Bi): Prompt => ({
  id,
  kind: 'text',
  label,
  ...(hint ? { hint } : {}),
});

/** Step 9, العناية والعادات: one small habit and a care list shared with step 1's soothing list. English is a draft. */
export const care: PracticeDef = {
  id: 'care',
  stepId: 9,
  title: { ar: 'عادة صغيرة', en: 'One small habit' },
  prompts: [
    {
      id: 'g1',
      kind: 'chips',
      label: { ar: 'أي جانب يحتاج انتباهًا الآن؟', en: 'Which area needs attention now?' },
      options: [
        { value: 'sleep', label: { ar: 'النوم', en: 'Sleep' } },
        { value: 'movement', label: { ar: 'الحركة', en: 'Movement' } },
        { value: 'food', label: { ar: 'الأكل', en: 'Eating' } },
        { value: 'connection', label: { ar: 'التواصل', en: 'Connection' } },
        { value: 'rest', label: { ar: 'الراحة', en: 'Rest' } },
        { value: 'joy', label: { ar: 'المتعة', en: 'Enjoyment' } },
      ],
    },
    {
      id: 'g2',
      kind: 'list',
      label: { ar: 'قائمتي المهدّئة', en: 'My calming list' },
      hint: {
        ar: 'تبدأ مما اخترتُه في الخطوة الأولى، وأضيف إليها ما أريد.',
        en: 'It starts with what I chose in step one, and I add whatever else I want.',
      },
      prefill: 'soothingList',
      saveToSoothing: 'step9',
    },
    text(
      'g3',
      { ar: 'عادة صغيرة واحدة', en: 'One small habit' },
      { ar: 'بصيغة: عندما …، سأ …', en: 'In the form: when …, I will …' },
    ),
    {
      id: 'g4',
      kind: 'text',
      label: { ar: 'ما العائق المتوقع؟ وما الخطة البديلة؟', en: 'What obstacle do I expect? What is my backup plan?' },
      fields: [
        { id: 'obstacle', label: { ar: 'العائق المتوقع', en: 'Expected obstacle' } },
        { id: 'plan', label: { ar: 'الخطة البديلة', en: 'Backup plan' } },
      ],
    },
    text(
      'g5',
      { ar: 'متى أراجع؟', en: 'When will I review it?' },
      { ar: 'مراجعة أسبوعية قصيرة.', en: 'A short weekly review.' },
    ),
  ],
};
