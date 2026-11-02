import type { PracticeDef } from '../schema';

/** Step 1, تصديق المشاعر: the therapist's five parts. English is a draft for therapist review. */
export const validate: PracticeDef = {
  id: 'validate',
  stepId: 1,
  title: { ar: 'تصديق المشاعر', en: 'Validating feelings' },
  prompts: [
    {
      id: 'v1',
      kind: 'emotion',
      label: { ar: 'ما الذي أشعر به الآن؟', en: 'What am I feeling right now?' },
      hint: {
        ar: 'أختار الكلمة الأقرب إلى شعوري، ثم أقدّر شدّته من صفر إلى عشرة.',
        en: 'I choose the word closest to what I feel, then rate how strong it is from zero to ten.',
      },
    },
    {
      id: 'v2',
      kind: 'text',
      label: { ar: 'ماذا حدث؟', en: 'What happened?' },
      hint: {
        ar: 'أصف الموقف كما هو دون حكم، ثم أكتب كيف أثّر فيّ.',
        en: 'I describe the situation as it was, without judging it, then write how it affected me.',
      },
      fields: [
        {
          id: 'situation',
          label: { ar: 'الموقف', en: 'The situation' },
          placeholder: { ar: 'كنتُ…، وفجأة…', en: 'I was… and suddenly…' },
        },
        {
          id: 'effect',
          label: { ar: 'كيف أثّر فيّ؟', en: 'How did it affect me?' },
          placeholder: { ar: 'شعرتُ بـ… لأنني…', en: 'I felt… because I…' },
        },
      ],
    },
    {
      id: 'v3',
      kind: 'chips',
      label: { ar: 'ما الذي يؤلمني في هذا الموقف؟', en: 'What hurts me in this situation?' },
      hint: {
        ar: 'خلف الشعور غالبًا خوف أو حاجة لم تُلبَّ. أختار ما يقترب مني، وأعدّل الجملة بكلماتي.',
        en: 'Behind a feeling there is often a fear or a need that was not met. I choose what is closest to me, and change the sentence into my own words.',
      },
      options: [
        { value: 'ignored', label: { ar: 'أن أُهمَل', en: 'being ignored' } },
        { value: 'rejected', label: { ar: 'أن أُرفَض', en: 'being rejected' } },
        { value: 'worth', label: { ar: 'أن تقلّ قيمتي', en: 'my worth being reduced' } },
        { value: 'alone', label: { ar: 'أن أبقى وحدي', en: 'being left alone' } },
        { value: 'disrespected', label: { ar: 'أن يُساء احترامي', en: 'my respect being harmed' } },
        { value: 'fail', label: { ar: 'أن أفشل', en: 'failing' } },
      ],
      template: {
        ar: 'طبعًا يؤلمني هذا، لأنني أخاف {label}.',
        en: 'Of course this hurts, because I am afraid of {label}.',
      },
    },
    {
      id: 'v4',
      kind: 'text',
      label: { ar: 'من الطبيعي أن أشعر بهذا', en: 'It makes sense that I feel this way' },
      hint: {
        ar: 'أشرح لنفسي بلطف لماذا يبدو شعوري مفهومًا، بالنظر إلى ما مررتُ به، كما أتكلم مع شخص أحبّه. أبدأ بجملة: «من الطبيعي أن أشعر بـ … لأن …».',
        en: 'I explain gently to myself why my feeling makes sense, given what I have been through, the way I would speak to someone I love. I start with: "It makes sense that I feel … because …".',
      },
      example: {
        ar: 'من الطبيعي أن أحزن حين أشعر بأنني مُهمَل، فقد مررتُ بتجارب جعلت أي إشارة صغيرة تؤلمني. أنا أفهم نفسي، ولا أحتاج إلى تبرير مشاعري.',
        en: 'It makes sense that I feel sad when I feel ignored, because I have been through experiences that made every small sign hurt. I understand myself, and I do not need to justify my feelings.',
      },
    },
    {
      id: 'v5',
      kind: 'list',
      label: { ar: 'ماذا يريحني الآن؟', en: 'What would comfort me right now?' },
      hint: {
        ar: 'أختار شيئًا لطيفًا أفعله لنفسي الآن، كما أفعل مع شخص أحبّه.',
        en: 'I choose something kind to do for myself now, the way I would do it for someone I love.',
      },
      prefill: 'soothingList',
      saveToSoothing: 'step1',
    },
  ],
};
