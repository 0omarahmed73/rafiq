import type { Bi } from '../../i18n';
import type { PracticeDef } from '../schema';

/**
 * Step 4 exercise supplied by the owner (wording clarified 2026-11-01; therapist to re-check); distinct ids preserve the
 * older trigger records. The English is a draft for therapist review.
 */
export const selfUnderstanding: PracticeDef = {
  id: 'self-understanding',
  stepId: 4,
  title: { ar: 'أفهم مشكلة صعبة', en: 'Understanding a hard problem' },
  prompts: [
    { id: 's1', kind: 'text', label: { ar: 'ما المشكلة في جملة واحدة؟', en: 'What is the problem, in one sentence?' } },
    {
      id: 's2',
      kind: 'text',
      label: {
        ar: 'ماذا يقول لي صوت الخزي عني بسبب هذه المشكلة؟',
        en: 'What does the voice of shame tell me about myself because of this problem?',
      },
    },
    {
      id: 's3',
      kind: 'text',
      label: { ar: 'ما الذي يحاول هذا النمط أن يحميني منه؟', en: 'What is this pattern trying to protect me from?' },
    },
    {
      id: 's4',
      kind: 'text',
      label: {
        ar: 'ما الذي كان ينقصني كلما حاولتُ التغيير؟',
        en: 'What was missing every time I tried to change?',
      },
    },
    {
      id: 's5',
      kind: 'text',
      label: {
        ar: 'ماذا كان سيقول صديق منصف، لا يحكم عليّ، عن قصتي؟',
        en: 'What would a fair friend, who does not judge me, say about my story?',
      },
    },
  ],
};

export const selfUnderstandingGuide: {
  subtitle: Bi;
  shameStory: Bi;
  rules: Bi;
  reflections: Bi[];
  explanation: Bi[];
} = {
  subtitle: { ar: 'مشكلة صعبة لم أصل فيها إلى حلّ بعد', en: 'A hard problem I have not yet found a solution to' },
  shameStory: {
    ar: 'أكتب قصة الخزي كما عشتُها، بصدق ووضوح: ما حدث، وما شعرتُ به، وما قلتُه لنفسي عنه. لا أُجمّلها ولا أقلبها إلى عكسها.',
    en: 'I write the story of my shame as I lived it, honestly and clearly: what happened, what I felt, and what I told myself about it. I do not make it prettier, and I do not turn it into its opposite.',
  },
  rules: {
    ar: 'أقرأ قصتي دون أحكام قاسية ودون جلد للذات، ودون تصنيف جاهز يختصرني في كلمة. وأبتعد عن الحلول الجاهزة التي لا تشبه قصتي.',
    en: 'I read my story without harsh judgements, without punishing myself, and without a ready label that reduces me to one word. I stay away from ready-made solutions that do not fit my story.',
  },
  reflections: [
    {
      ar: 'ألاحظ النمط الذي أكرره، وأسأل: ممَّ كان يحاول حمايتي؟',
      en: 'I notice the pattern I keep repeating, and ask: what was it trying to protect me from?',
    },
    {
      ar: 'أسأل نفسي بإنصاف: هل توفّر لي ما يكفي من الأمان والدعم حين حاولتُ التغيير؟',
      en: 'I ask myself fairly: did I have enough safety and support when I tried to change?',
    },
  ],
  explanation: [
    {
      ar: 'أصف قصة الخزي بصدق، وأفرّق بين الحكم على نفسي ووصف ما فعلتُه.',
      en: 'I describe the story of my shame honestly, and I tell apart judging myself from describing what I did.',
    },
    {
      ar: 'لا أحتاج إلى قلب التجربة المؤلمة إلى عكسها، ولا إلى تسميتها نعمة، كي أبدأ بفهمها.',
      en: 'I do not need to turn the painful experience into its opposite, or call it a blessing, in order to start understanding it.',
    },
    {
      ar: 'أبحث عن وصف منصف: لا ينكر ما حدث، ولا يقسو عليّ، ولا يختصرني في تصنيف.',
      en: 'I look for a fair description: one that does not deny what happened, is not harsh with me, and does not reduce me to a label.',
    },
    {
      ar: 'أسأل: هل بدأ هذا النمط ليحميني؟ قد يكون مؤلمًا اليوم، لكن له سببًا.',
      en: 'I ask: did this pattern start to protect me? It may hurt today, but it has a reason.',
    },
    {
      ar: 'أتذكّر ما كان متاحًا لي حين حاولتُ التغيير: الأمان، والدعم، والأدوات، والوعي.',
      en: 'I remember what was available to me when I tried to change: safety, support, tools, and awareness.',
    },
  ],
};
