import type { Bi } from '../../i18n';
import type { PracticeDef, Prompt } from '../schema';

const text = (id: string, label: Bi, hint?: Bi): Prompt => ({
  id,
  kind: 'text',
  label,
  ...(hint ? { hint } : {}),
});

/** Step 6, مسامحة الذات: responsibility, guilt or shame, repair, learning, and a forgiving sentence. English is a draft. */
export const forgive: PracticeDef = {
  id: 'forgive',
  stepId: 6,
  title: { ar: 'مسامحة الذات', en: 'Forgiving myself' },
  prompts: [
    text(
      'f1',
      { ar: 'ما الذي أحمّل نفسي إيّاه؟', en: 'What am I blaming myself for?' },
      { ar: 'أكتبه بدقة في جملة واحدة.', en: 'I write it precisely in one sentence.' },
    ),
    text(
      'f2',
      { ar: 'ما نصيبي من المسؤولية؟ وما الذي ليس نصيبي؟', en: 'What is my share of the responsibility? And what is not mine?' },
      {
        ar: 'الظروف، وما كنتُ أعرفه، وحالتي وقتها.',
        en: 'The circumstances, what I knew at the time, and my state of mind then.',
      },
    ),
    {
      id: 'f3',
      kind: 'choice',
      label: { ar: 'هل ما أشعر به ذنب أم عار؟', en: 'Is what I feel guilt or shame?' },
      hint: {
        ar: 'الذنب يقول «فعلتُ شيئًا خاطئًا». العار يقول «أنا سيّئ».',
        en: 'Guilt says "I did something wrong". Shame says "I am bad".',
      },
      options: [
        { value: 'guilt', label: { ar: 'ذنب', en: 'Guilt' }, description: { ar: 'فعلتُ شيئًا خاطئًا', en: 'I did something wrong' } },
        { value: 'shame', label: { ar: 'عار', en: 'Shame' }, description: { ar: 'أشعر بأنني سيّئ', en: 'I feel that I am bad' } },
        { value: 'both', label: { ar: 'الاثنان معًا', en: 'Both together' } },
      ],
    },
    text(
      'f4',
      { ar: 'هل يمكن الإصلاح؟', en: 'Is repair possible?' },
      { ar: 'اعتذار، أو تصرّف، أو تعويض.', en: 'An apology, an action, or making amends.' },
    ),
    text('f5', { ar: 'ما الذي تعلّمته؟ وماذا سأفعل بشكل مختلف؟', en: 'What have I learned? What will I do differently?' }),
    text(
      'f6',
      { ar: 'جملة المسامحة', en: 'A sentence of forgiveness' },
      {
        ar: 'أسامح نفسي على … لأنني كنتُ … وقتها، وأقرّر أن …',
        en: 'I forgive myself for … because at that time I was …, and I decide to …',
      },
    ),
  ],
};

export const forgivenessLetter: PracticeDef = {
  id: 'forgiveness-letter',
  stepId: 6,
  title: { ar: 'رسالة مسامحة', en: 'A letter of forgiveness' },
  sink: 'letter:forgiveness',
  prompts: [
    text(
      'fl1',
      { ar: 'رسالة مسامحة إلى نفسي', en: 'A letter of forgiveness to myself' },
      {
        ar: 'أخاطب نفسي كما كنتُ وقتها، بفهم ولطف.',
        en: 'I speak to myself as I was at that time, with understanding and kindness.',
      },
    ),
  ],
};
