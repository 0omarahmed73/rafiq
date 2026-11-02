import type { Bi } from '../i18n';

/**
 * Three first-person statements per step, answered from 1 (لا ينطبق / does not apply) to 5 (ينطبق تمامًا / applies fully).
 * Steps 1 to 3 are proposals to refine with the therapist; steps 4 to 10 come from
 * the "أسئلة التحقق" of docs/content/steps-4-10.html. The English is a draft for therapist review.
 */
export const readinessQuestions: Record<number, [Bi, Bi, Bi]> = {
  1: [
    { ar: 'أقول لنفسي «مشاعري مفهومة» دون مقاومة.', en: 'I tell myself "my feelings make sense" without resisting.' },
    { ar: 'أسمّي ما أشعر به وأقدّر شدّته.', en: 'I name what I feel and judge how strong it is.' },
    { ar: 'أطمئن نفسي بفعل لطيف.', en: 'I reassure myself with a gentle action.' },
  ],
  2: [
    { ar: 'أفرّق بين الحاجة والرغبة والتفضيل.', en: 'I can tell a need, a desire and a preference apart.' },
    { ar: 'أكون مع عيب لي دون كراهية.', en: 'I can be with a flaw of mine without hating myself for it.' },
    { ar: 'أعرف ما أُبقيه وما أغيّره.', en: 'I know what I keep and what I change.' },
  ],
  3: [
    { ar: 'أنتظر قبل الردّ حين أغضب.', en: 'When I am angry, I wait before I respond.' },
    { ar: 'لدي تعليمات واضحة لنفسي.', en: 'I have clear instructions for myself.' },
    { ar: 'أراجع ما جرّبته وهل ساعدني.', en: 'I review what I tried and whether it helped.' },
  ],
  4: [
    { ar: 'أستطيع تسمية محفّزين رئيسيين عندي.', en: 'I can name two or three main triggers for me.' },
    { ar: 'ألاحظ علامات الانفعال في جسدي قبل أن تشتدّ.', en: 'I notice signs of strong emotion in my body before they grow.' },
    { ar: 'أستطيع ربط شعور قوي بتجربة سابقة.', en: 'I can connect a strong feeling with an earlier experience.' },
  ],
  5: [
    { ar: 'حين أخطئ أتكلم مع نفسي بلطف.', en: 'When I make a mistake, I speak to myself kindly.' },
    { ar: 'أتذكّر أن ما أمرّ به تجربة إنسانية.', en: 'I remember that what I am going through is a human experience.' },
    { ar: 'أستطيع أن أعطي نفسي ما أعطيه لغيري.', en: 'I can give myself the kindness I give to others.' },
  ],
  6: [
    { ar: 'أستطيع وصف ما حدث دون تضخيم ولا إنكار.', en: 'I can describe what happened without exaggerating or denying it.' },
    { ar: 'أعرف ما الذي سأفعله بشكل مختلف.', en: 'I know what I would do differently.' },
    { ar: 'تؤلمني ذكراه أقلّ مما كانت.', en: 'Remembering it hurts me less than it used to.' },
  ],
  7: [
    { ar: 'أستطيع قول «لا» دون شعور مفرط بالذنب.', en: 'I can say "no" without an excessive sense of guilt.' },
    { ar: 'أعرف حدّين واضحين لي.', en: 'I know two clear boundaries for myself.' },
    { ar: 'أتعامل مع الأشخاص الجدد بثقة تدريجية.', en: 'I approach new people with trust that grows step by step.' },
  ],
  8: [
    { ar: 'وفيتُ بوعدي الصغير خمسة أيام على الأقل من سبعة.', en: 'I kept my small promise at least five days out of seven.' },
    { ar: 'أستطيع ذكر ثلاثة أدلة على اعتمادي على نفسي.', en: 'I can name three pieces of evidence that I can rely on myself.' },
    { ar: 'أعرف كيف أعدّل وعدًا لم أستطع الوفاء به.', en: 'I know how to adjust a promise I could not keep.' },
  ],
  9: [
    { ar: 'لي عادة واحدة ثابتة منذ أسبوعين.', en: 'I have had one steady habit for the last two weeks.' },
    { ar: 'أعرف ما يهدّئني عند الضيق.', en: 'I know what calms me down when I am distressed.' },
    { ar: 'أنام وأتحرك بانتظام معقول.', en: 'I sleep and move reasonably regularly.' },
  ],
  10: [
    { ar: 'أستطيع ذكر ثلاث قيم لي.', en: 'I can name three of my values.' },
    { ar: 'تصرّفتُ هذا الأسبوع وفق قيمة اخترتها.', en: 'This week I acted according to a value I chose.' },
    { ar: 'أشعر باتجاه أوضح في حياتي.', en: 'I feel a clearer direction in my life.' },
  ],
};
