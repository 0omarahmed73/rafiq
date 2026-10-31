import type { PracticeDef } from '../schema';

/** Step 1, تصديق المشاعر: the therapist's five parts. */
export const validate: PracticeDef = {
  id: 'validate',
  stepId: 1,
  title: 'تصديق المشاعر',
  prompts: [
    {
      id: 'v1',
      kind: 'emotion',
      label: 'ما الذي أشعر به الآن؟',
      hint: 'أختار الكلمة الأقرب إلى شعوري، ثم أقدّر شدّته من صفر إلى عشرة.',
    },
    {
      id: 'v2',
      kind: 'text',
      label: 'ماذا حدث؟',
      hint: 'أصف الموقف كما هو دون حكم، ثم أكتب كيف أثّر فيّ.',
      fields: [
        { id: 'situation', label: 'الموقف', placeholder: 'كنتُ…، وفجأة…' },
        { id: 'effect', label: 'كيف أثّر فيّ؟', placeholder: 'شعرتُ بـ… لأنني…' },
      ],
    },
    {
      id: 'v3',
      kind: 'chips',
      label: 'ما الذي يؤلمني في هذا الموقف؟',
      hint: 'خلف الشعور غالبًا خوف أو حاجة لم تُلبَّ. أختار ما يقترب مني، وأعدّل الجملة بكلماتي.',
      options: [
        { value: 'ignored', label: 'أن أُهمَل' },
        { value: 'rejected', label: 'أن أُرفَض' },
        { value: 'worth', label: 'أن تقلّ قيمتي' },
        { value: 'alone', label: 'أن أبقى وحدي' },
        { value: 'disrespected', label: 'أن يُساء احترامي' },
        { value: 'fail', label: 'أن أفشل' },
      ],
      template: 'طبعًا يؤلمني هذا، لأنني أخاف {label}.',
    },
    {
      id: 'v4',
      kind: 'text',
      label: 'من الطبيعي أن أشعر بهذا',
      hint: 'أشرح لنفسي بلطف لماذا يبدو شعوري مفهومًا، بالنظر إلى ما مررتُ به، كما أتكلم مع شخص أحبّه. أبدأ بجملة: «من الطبيعي أن أشعر بـ … لأن …».',
      example:
        'من الطبيعي أن أحزن حين أشعر بأنني مُهمَل، فقد مررتُ بتجارب جعلت أي إشارة صغيرة تؤلمني. أنا أفهم نفسي، ولا أحتاج إلى تبرير مشاعري.',
    },
    {
      id: 'v5',
      kind: 'list',
      label: 'ماذا يريحني الآن؟',
      hint: 'أختار شيئًا لطيفًا أفعله لنفسي الآن، كما أفعل مع شخص أحبّه.',
      prefill: 'soothingList',
    },
  ],
};
