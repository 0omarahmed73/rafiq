import type { PracticeDef, Prompt } from '../schema';

const text = (id: string, label: string, hint?: string): Prompt => ({
  id,
  kind: 'text',
  label,
  ...(hint ? { hint } : {}),
});

/** Step 5, التعاطف مع الذات: the three parts (mindfulness, common humanity, kindness) and a kind act. */
export const compassion: PracticeDef = {
  id: 'compassion',
  stepId: 5,
  title: 'ثلاث جمل',
  prompts: [
    text('c1', 'هذه لحظة ألم', 'أصف ما أمرّ به وأقدّر شدّته.'),
    text('c2', 'كثيرون يمرّون بمثل هذا', 'من يشبهني في هذه التجربة؟'),
    text('c3', 'ماذا كنتُ سأقول لصديق عزيز في موقفي؟', 'أكتب ذلك، ثم أوجّهه إلى نفسي.'),
    text('c4', 'ما الذي أحتاجه الآن؟', 'فعل لطيف صغير أقوم به.'),
  ],
};

/** A letter to myself, written the way a kind friend would. Saved to the letters. */
export const compassionLetter: PracticeDef = {
  id: 'compassion-letter',
  stepId: 5,
  title: 'رسالة من صديق حنون',
  sink: 'letter:self',
  prompts: [
    text('cl1', 'رسالة إلى نفسي بلطف', 'أكتب كما يكتب صديق حنون يفهمني ويحبّني.'),
  ],
};

export const gratitudeLetter: PracticeDef = {
  id: 'gratitude-letter',
  stepId: 5,
  title: 'رسالة امتنان',
  sink: 'letter:gratitude',
  prompts: [
    text('gl1', 'ما الذي يستحق الامتنان اليوم؟', 'أكتب عن شيء صغير أو كبير، وعن نفسي أيضًا.'),
  ],
};
