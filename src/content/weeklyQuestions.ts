import { t, type Bi } from '../i18n';

/**
 * One question per week, in a fixed rotation. The first is given in the plan; the others are
 * written in simple first-person Arabic for the owner (and the therapist) to review and edit.
 * The English versions are drafts for the same review.
 */
export const weeklyQuestions: Bi[] = [
  { ar: 'متى شعرتُ بأنني أقرب ما أكون إلى نفسي؟', en: 'When did I feel closest to myself?' },
  {
    ar: 'ما الشعور الذي تكرّر هذا الأسبوع، وماذا كان يحتاج مني؟',
    en: 'Which feeling kept coming back this week, and what did it need from me?',
  },
  { ar: 'ما أصغر شيء فعلتُه هذا الأسبوع وأعتزّ به؟', en: 'What is the smallest thing I did this week that I am proud of?' },
  { ar: 'متى عاملتُ نفسي بلطف هذا الأسبوع؟', en: 'When did I treat myself kindly this week?' },
  {
    ar: 'ما الموقف الأصعب هذا الأسبوع، وما الذي ساعدني فيه؟',
    en: 'What was the hardest moment this week, and what helped me through it?',
  },
  {
    ar: 'ما الذي أحتاج أن أقوله لمعالجي هذا الأسبوع؟',
    en: 'What do I need to tell my therapist this week?',
  },
];

/**
 * The text of a question saved in a weekly review. Reviews store the question as it was written (Arabic), so an
 * older review still shows its question in English once the language is changed.
 */
export function weeklyQuestionText(saved: string): string {
  const question = weeklyQuestions.find((q) => q.ar === saved);
  return question ? t(question) : saved;
}
