import type { PracticeDef, Prompt } from '../schema';

const text = (id: string, label: string, hint?: string): Prompt => ({
  id,
  kind: 'text',
  label,
  ...(hint ? { hint } : {}),
});

/** Step 7, الحدود واحترام الذات: from a feeling of strain to a clear, kind boundary. */
export const boundaries: PracticeDef = {
  id: 'boundaries',
  stepId: 7,
  title: 'حدودي',
  prompts: [
    text('b1', 'أين أشعر بالاستنزاف أو الضيق في علاقاتي؟'),
    text('b2', 'ما الحاجة أو القيمة التي تُنتهك هنا؟'),
    {
      id: 'b3',
      kind: 'text',
      label: 'ما الحدّ الذي أحتاجه؟',
      fields: [
        { id: 'accept', label: 'أقبل…' },
        { id: 'refuse', label: 'ولا أقبل…' },
      ],
    },
    {
      id: 'b4',
      kind: 'text',
      label: 'أصيغه بلطف ووضوح',
      hint: 'الحدّ وصف لما أفعله أنا لحماية احتياجي، لا محاولة للتحكّم في الآخر.',
      fields: [
        { id: 'when', label: 'حين…' },
        { id: 'feel', label: 'أشعر…' },
        { id: 'need', label: 'أحتاج…' },
        { id: 'action', label: 'لذلك سأ…' },
      ],
    },
    text('b5', 'ما الذي سأفعله أنا إن تكرّر؟', 'الانتظار، أو تقليل التواصل، أو الابتعاد.'),
    text('b6', 'ما الذي يخيفني من وضع هذا الحدّ؟', 'الذنب؟ الرفض؟'),
  ],
};
