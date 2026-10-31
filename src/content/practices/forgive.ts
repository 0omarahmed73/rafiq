import type { PracticeDef, Prompt } from '../schema';

const text = (id: string, label: string, hint?: string): Prompt => ({
  id,
  kind: 'text',
  label,
  ...(hint ? { hint } : {}),
});

/** Step 6, مسامحة الذات: responsibility, guilt or shame, repair, learning, and a forgiving sentence. */
export const forgive: PracticeDef = {
  id: 'forgive',
  stepId: 6,
  title: 'مسامحة الذات',
  prompts: [
    text('f1', 'ما الذي أحمّل نفسي إيّاه؟', 'أكتبه بدقة في جملة واحدة.'),
    text(
      'f2',
      'ما نصيبي من المسؤولية؟ وما الذي ليس نصيبي؟',
      'الظروف، وما كنتُ أعرفه، وحالتي وقتها.',
    ),
    {
      id: 'f3',
      kind: 'choice',
      label: 'هل ما أشعر به ذنب أم عار؟',
      hint: 'الذنب يقول «فعلتُ شيئًا خاطئًا». العار يقول «أنا سيّئ».',
      options: [
        { value: 'guilt', label: 'ذنب', description: 'فعلتُ شيئًا خاطئًا' },
        { value: 'shame', label: 'عار', description: 'أشعر بأنني سيّئ' },
        { value: 'both', label: 'الاثنان معًا' },
      ],
    },
    text('f4', 'هل يمكن الإصلاح؟', 'اعتذار، أو تصرّف، أو تعويض.'),
    text('f5', 'ما الذي تعلّمته؟ وماذا سأفعل بشكل مختلف؟'),
    text('f6', 'جملة المسامحة', 'أسامح نفسي على … لأنني كنتُ … وقتها، وأقرّر أن …'),
  ],
};

export const forgivenessLetter: PracticeDef = {
  id: 'forgiveness-letter',
  stepId: 6,
  title: 'رسالة مسامحة',
  sink: 'letter:forgiveness',
  prompts: [
    text('fl1', 'رسالة مسامحة إلى نفسي', 'أخاطب نفسي كما كنتُ وقتها، بفهم ولطف.'),
  ],
};
