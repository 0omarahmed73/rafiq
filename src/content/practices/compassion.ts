import type { Bi } from '../../i18n';
import type { PracticeDef, Prompt } from '../schema';

const text = (id: string, label: Bi, hint?: Bi): Prompt => ({
  id,
  kind: 'text',
  label,
  ...(hint ? { hint } : {}),
});

/** Step 5, التعاطف مع الذات: the three parts (mindfulness, common humanity, kindness) and a kind act. English is a draft. */
export const compassion: PracticeDef = {
  id: 'compassion',
  stepId: 5,
  title: { ar: 'ثلاث جمل', en: 'Three sentences' },
  prompts: [
    text(
      'c1',
      { ar: 'هذه لحظة ألم', en: 'This is a moment of pain' },
      { ar: 'أصف ما أمرّ به وأقدّر شدّته.', en: 'I describe what I am going through and judge how strong it is.' },
    ),
    text(
      'c2',
      { ar: 'كثيرون يمرّون بمثل هذا', en: 'Many people go through something like this' },
      { ar: 'من يشبهني في هذه التجربة؟', en: 'Who is like me in this experience?' },
    ),
    text(
      'c3',
      { ar: 'ماذا كنتُ سأقول لصديق عزيز في موقفي؟', en: 'What would I say to a dear friend in my situation?' },
      { ar: 'أكتب ذلك، ثم أوجّهه إلى نفسي.', en: 'I write it down, then direct it at myself.' },
    ),
    text(
      'c4',
      { ar: 'ما الذي أحتاجه الآن؟', en: 'What do I need right now?' },
      { ar: 'فعل لطيف صغير أقوم به.', en: 'A small, gentle act I can do.' },
    ),
  ],
};

/** A letter to myself, written the way a kind friend would. Saved to the letters. */
export const compassionLetter: PracticeDef = {
  id: 'compassion-letter',
  stepId: 5,
  title: { ar: 'رسالة من صديق حنون', en: 'A letter from a kind friend' },
  sink: 'letter:self',
  prompts: [
    text(
      'cl1',
      { ar: 'رسالة إلى نفسي بلطف', en: 'A gentle letter to myself' },
      {
        ar: 'أكتب كما يكتب صديق حنون يفهمني ويحبّني.',
        en: 'I write the way a kind friend who understands and loves me would write.',
      },
    ),
  ],
};

export const gratitudeLetter: PracticeDef = {
  id: 'gratitude-letter',
  stepId: 5,
  title: { ar: 'رسالة امتنان', en: 'A letter of gratitude' },
  sink: 'letter:gratitude',
  prompts: [
    text(
      'gl1',
      { ar: 'ما الذي يستحق الامتنان اليوم؟', en: 'What deserves gratitude today?' },
      {
        ar: 'أكتب عن شيء صغير أو كبير، وعن نفسي أيضًا.',
        en: 'I write about something small or large, and about myself too.',
      },
    ),
  ],
};
