import type { Bi } from '../../i18n';
import type { PracticeDef, Prompt } from '../schema';

const text = (id: string, label: Bi, hint?: Bi): Prompt => ({
  id,
  kind: 'text',
  label,
  ...(hint ? { hint } : {}),
});

/** Step 7, الحدود واحترام الذات: from a feeling of strain to a clear, kind boundary. English is a draft. */
export const boundaries: PracticeDef = {
  id: 'boundaries',
  stepId: 7,
  title: { ar: 'حدودي', en: 'My boundaries' },
  prompts: [
    text('b1', { ar: 'أين أشعر بالاستنزاف أو الضيق في علاقاتي؟', en: 'Where do I feel drained or strained in my relationships?' }),
    text('b2', { ar: 'ما الحاجة أو القيمة التي تُنتهك هنا؟', en: 'What need or value is being crossed here?' }),
    {
      id: 'b3',
      kind: 'text',
      label: { ar: 'ما الحدّ الذي أحتاجه؟', en: 'What boundary do I need?' },
      fields: [
        { id: 'accept', label: { ar: 'أقبل…', en: 'I accept…' } },
        { id: 'refuse', label: { ar: 'ولا أقبل…', en: 'And I do not accept…' } },
      ],
    },
    {
      id: 'b4',
      kind: 'text',
      label: { ar: 'أصيغه بلطف ووضوح', en: 'I phrase it kindly and clearly' },
      hint: {
        ar: 'الحدّ وصف لما أفعله أنا لحماية احتياجي، لا محاولة للتحكّم في الآخر.',
        en: 'A boundary describes what I will do to protect my need, not an attempt to control the other person.',
      },
      fields: [
        { id: 'when', label: { ar: 'حين…', en: 'When…' } },
        { id: 'feel', label: { ar: 'أشعر…', en: 'I feel…' } },
        { id: 'need', label: { ar: 'أحتاج…', en: 'I need…' } },
        { id: 'action', label: { ar: 'لذلك سأ…', en: 'So I will…' } },
      ],
    },
    text(
      'b5',
      { ar: 'ما الذي سأفعله أنا إن تكرّر؟', en: 'What will I do if it happens again?' },
      { ar: 'الانتظار، أو تقليل التواصل، أو الابتعاد.', en: 'Wait, reduce contact, or step away.' },
    ),
    text(
      'b6',
      { ar: 'ما الذي يخيفني من وضع هذا الحدّ؟', en: 'What scares me about setting this boundary?' },
      { ar: 'الذنب؟ الرفض؟', en: 'Guilt? Rejection?' },
    ),
  ],
};
