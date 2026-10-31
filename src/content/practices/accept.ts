import type { PracticeDef } from '../schema';

const yesNo = [
  { value: 'yes', label: 'نعم، هو حقّ لي' },
  { value: 'no', label: 'لا، ليس حقًّا' },
  { value: 'unsure', label: 'لا أعرف بعد' },
];

/** Step 2, تقبّل الذات: the therapist's seven questions. Question 3 is asked only for a "need". */
export const accept: PracticeDef = {
  id: 'accept',
  stepId: 2,
  title: 'أسئلة التقبّل',
  sink: 'acceptDecision',
  prompts: [
    {
      id: 'a1',
      kind: 'choice',
      label: 'هل هو حقّ من حقوقي؟',
      hint: 'مثل حقّي في الاحترام، وفي الوضوح، وفي أن أُعامَل بلطف.',
      textLabel: 'ما الذي أرفضه؟',
      options: yesNo,
    },
    {
      id: 'a2',
      kind: 'choice',
      label: 'هل ما أرفضه حاجة، أم رغبة، أم تفضيل؟',
      hint: 'إن اخترتُ «حاجة»، سيسألني السؤال التالي: أي حاجة هي؟ وإن اخترتُ غير ذلك، فأنتقل مباشرة إلى سؤال الحدود.',
      options: [
        { value: 'need', label: 'حاجة', description: 'أمر لا أستقرّ نفسيًا من دونه' },
        { value: 'desire', label: 'رغبة', description: 'أمر أتمنّاه، وأستطيع العيش من دونه' },
        { value: 'preference', label: 'تفضيل', description: 'أمر أميل إليه، ولا يضرّني غيابه' },
        {
          value: 'none',
          label: 'ليس أيًّا منها',
          description: 'قد يكون خوفًا أو عادة أو فكرة قديمة، وسأفهمه معًا مع الأسئلة التالية',
        },
      ],
    },
    {
      id: 'a3',
      kind: 'chips',
      label: 'أيّ حاجة من احتياجاتي هي؟',
      hint: 'أختار ما ينطبق، ويمكنني اختيار أكثر من واحدة.',
      multi: true,
      showWhen: { promptId: 'a2', equals: 'need' },
      textLabel: 'لماذا هي مهمّة لي؟',
      options: [
        { value: 'respect', label: 'الاحترام' },
        { value: 'clarity', label: 'الوضوح' },
        { value: 'safety', label: 'الأمان' },
        { value: 'appreciation', label: 'التقدير' },
        { value: 'belonging', label: 'الانتماء' },
        { value: 'autonomy', label: 'الاستقلال' },
        { value: 'rest', label: 'الراحة' },
        { value: 'fairness', label: 'العدل' },
      ],
    },
    {
      id: 'a4',
      kind: 'choice',
      label: 'هل هو حدّ من حدودي؟',
      hint: 'الحدّ هو ما أقبله وما لا أقبله في تعامل الآخرين معي.',
      textLabel: 'ما هذا الحدّ؟',
      options: [
        { value: 'yes', label: 'نعم، هو حدّ لي' },
        { value: 'no', label: 'لا، ليس حدًّا' },
        { value: 'unsure', label: 'لا أعرف بعد' },
      ],
    },
    {
      id: 'a5',
      kind: 'text',
      label: 'ماذا أرفض في نفسي هنا؟',
      hint: 'أحيانًا يكون خلف الرفض شيء أراه عيبًا فيّ. أسمّيه بهدوء دون أن أقسو على نفسي. تسمية العيب لا تعني أنني «العيب»: أنا شخص كامل، ولي سلوك أريد أن أفهمه.',
      fields: [
        { id: 'flaw', label: 'ما الذي أراه عيبًا؟', placeholder: 'أرفض أنني…' },
        { id: 'kind', label: 'هل هو سلوك أكرّره، أم عادة، أم صفة في طبعي؟' },
      ],
    },
    {
      id: 'a6',
      kind: 'choice',
      label: 'ماذا أريد أن أفعل بهذا؟',
      hint: 'في الحالتين أبدأ بالتقبّل. الفرق في ما أفعله بعده. لا أحتاج إلى قرار نهائي، ويمكنني العودة وتغيير اختياري.',
      options: [
        {
          value: 'keep',
          label: 'أتقبّله وأُبقيه',
          description: 'أعترف بأنه جزء مني اليوم، ولا أحتاج إلى تغييره الآن.',
        },
        {
          value: 'change',
          label: 'أتقبّله وأغيّره',
          description: 'أعترف به دون كراهية، ثم أعمل عليه بخطوات صغيرة ولطيفة.',
        },
      ],
    },
    {
      id: 'a7',
      kind: 'list',
      label: 'ما أسباب هذا القرار؟',
      hint: 'أكتب الأسباب التي تجعل هذا القرار مناسبًا لي. سبب واحد صادق يكفي.',
    },
  ],
};
