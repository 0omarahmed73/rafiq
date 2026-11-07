import type { PracticeDef } from '../schema';

const yesNo = [
  { value: 'yes', label: { ar: 'نعم، هو حقّ لي', en: 'Yes, it is my right' } },
  { value: 'no', label: { ar: 'لا، ليس حقًّا', en: 'No, it is not a right' } },
  { value: 'unsure', label: { ar: 'لا أعرف بعد', en: 'I am not sure yet' } },
];

/** Step 2, تقبّل الذات: the therapist's seven questions. Question 3 is asked only for a "need". English is a draft for therapist review. */
export const accept: PracticeDef = {
  id: 'accept',
  stepId: 2,
  title: { ar: 'أسئلة التقبّل', en: 'Acceptance questions' },
  sink: 'acceptDecision',
  prompts: [
    {
      id: 'a1',
      kind: 'choice',
      label: { ar: 'هل هو حقّ من حقوقي؟', en: 'Is it one of my rights?' },
      hint: {
        ar: 'مثل حقّي في الاحترام، وفي الوضوح، وفي أن أُعامَل بلطف.',
        en: 'For example, my right to respect, to clarity, and to be treated kindly.',
      },
      textLabel: { ar: 'ما الذي أرفضه؟', en: 'What am I rejecting?' },
      options: yesNo,
    },
    {
      id: 'a2',
      kind: 'choice',
      label: {
        ar: 'هل ما أرفضه حاجة، أم رغبة، أم تفضيل؟',
        en: 'Is what I reject a need, a desire, or a preference?',
      },
      hint: {
        ar: 'إن اخترتُ «حاجة»، سيسألني السؤال التالي: أي حاجة هي؟ وإن اخترتُ غير ذلك، فأنتقل مباشرة إلى سؤال الحدود.',
        en: 'If I choose "need", the next question asks which need it is. For any other answer, I go straight to the question about boundaries.',
      },
      options: [
        {
          value: 'need',
          label: { ar: 'حاجة', en: 'A need' },
          description: { ar: 'أمر لا أستقرّ نفسيًا من دونه', en: 'Something I cannot feel settled without' },
        },
        {
          value: 'desire',
          label: { ar: 'رغبة', en: 'A desire' },
          description: { ar: 'أمر أتمنّاه، وأستطيع العيش من دونه', en: 'Something I wish for, and can live without' },
        },
        {
          value: 'preference',
          label: { ar: 'تفضيل', en: 'A preference' },
          description: { ar: 'أمر أميل إليه، ولا يضرّني غيابه', en: 'Something I lean towards, whose absence does not harm me' },
        },
        {
          value: 'none',
          label: { ar: 'ليس أيًّا منها', en: 'None of these' },
          description: {
            ar: 'قد يكون خوفًا أو عادة أو فكرة قديمة، وسأفهمه معًا مع الأسئلة التالية',
            en: 'It may be a fear, a habit, or an old idea. I will understand it together with the next questions.',
          },
        },
      ],
    },
    {
      id: 'a3',
      kind: 'chips',
      label: { ar: 'أيّ حاجة من احتياجاتي هي؟', en: 'Which of my needs is it?' },
      hint: {
        ar: 'أختار ما ينطبق، ويمكنني اختيار أكثر من واحدة.',
        en: 'I choose what applies. I can choose more than one.',
      },
      multi: true,
      showWhen: { promptId: 'a2', equals: 'need' },
      textLabel: { ar: 'لماذا هي مهمّة لي؟', en: 'Why does it matter to me?' },
      options: [
        { value: 'respect', label: { ar: 'الاحترام', en: 'Respect' } },
        { value: 'clarity', label: { ar: 'الوضوح', en: 'Clarity' } },
        { value: 'safety', label: { ar: 'الأمان', en: 'Safety' } },
        { value: 'appreciation', label: { ar: 'التقدير', en: 'Appreciation' } },
        { value: 'belonging', label: { ar: 'الانتماء', en: 'Belonging' } },
        { value: 'autonomy', label: { ar: 'الاستقلال', en: 'Independence' } },
        { value: 'rest', label: { ar: 'الراحة', en: 'Rest' } },
        { value: 'fairness', label: { ar: 'العدل', en: 'Fairness' } },
      ],
    },
    {
      id: 'a4',
      kind: 'choice',
      label: { ar: 'هل هو حدّ من حدودي؟', en: 'Is it one of my boundaries?' },
      hint: {
        ar: 'الحدّ هو ما أقبله وما لا أقبله في تعامل الآخرين معي.',
        en: 'A boundary is what I accept and what I do not accept in how others treat me.',
      },
      textLabel: { ar: 'ما هذا الحدّ؟', en: 'What is this boundary?' },
      options: [
        { value: 'yes', label: { ar: 'نعم، هو حدّ لي', en: 'Yes, it is a boundary of mine' } },
        { value: 'no', label: { ar: 'لا، ليس حدًّا', en: 'No, it is not a boundary' } },
        { value: 'unsure', label: { ar: 'لا أعرف بعد', en: 'I am not sure yet' } },
      ],
    },
    {
      id: 'a5',
      kind: 'text',
      label: { ar: 'ماذا أرفض في نفسي هنا؟', en: 'What do I reject in myself here?' },
      hint: {
        ar: 'أحيانًا يكون خلف الرفض شيء أراه عيبًا فيّ. أسمّيه بهدوء دون أن أقسو على نفسي. تسمية العيب لا تعني أنني «العيب»: أنا شخص كامل، ولي سلوك أريد أن أفهمه.',
        en: 'Sometimes behind the rejection is something I see as a flaw in me. I name it calmly, without being harsh with myself. Naming a flaw does not mean I am the flaw: I am a whole person, with a behaviour I want to understand.',
      },
      fields: [
        {
          id: 'flaw',
          label: { ar: 'ما الذي أراه عيبًا؟', en: 'What do I see as a flaw?' },
          placeholder: { ar: 'أرفض أنني…', en: 'I reject that I…' },
        },
        { id: 'kind', label: { ar: 'هل هو سلوك أكرّره، أم عادة، أم صفة في طبعي؟', en: 'Is it a behaviour I repeat, a habit, or a trait of my character?' } },
      ],
    },
    {
      id: 'a6',
      kind: 'choice',
      label: { ar: 'ماذا أريد أن أفعل بهذا؟', en: 'What do I want to do with this?' },
      hint: {
        ar: 'في الحالتين أبدأ بالتقبّل. الفرق في ما أفعله بعده. لا أحتاج إلى قرار نهائي، ويمكنني العودة وتغيير اختياري.',
        en: 'In both cases I start with acceptance. The difference is what I do after that. I do not need a final decision, and I can come back and change my choice.',
      },
      options: [
        {
          value: 'keep',
          label: { ar: 'أتقبّله وأُبقيه', en: 'I accept it and keep it' },
          description: {
            ar: 'أعترف بأنه جزء مني اليوم، ولا أحتاج إلى تغييره الآن.',
            en: 'I admit it is part of me today, and I do not need to change it now.',
          },
        },
        {
          value: 'change',
          label: { ar: 'أتقبّله وأغيّره', en: 'I accept it and change it' },
          description: {
            ar: 'أعترف به دون كراهية، ثم أعمل عليه بخطوات صغيرة ولطيفة.',
            en: 'I admit it without hatred, then work on it in small, gentle steps.',
          },
        },
      ],
    },
    {
      id: 'a7',
      kind: 'list',
      label: { ar: 'ما أسباب هذا القرار؟', en: 'What are the reasons for this decision?' },
      hint: {
        ar: 'أكتب الأسباب التي تجعل هذا القرار مناسبًا لي. سبب واحد صادق يكفي.',
        en: 'I write the reasons that make this decision right for me. One honest reason is enough.',
      },
    },
  ],
};
