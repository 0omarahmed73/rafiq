import type { Bi } from '../i18n';

/** The yearly plan «عامي الخامس والعشرون» (Oct 2026 – Sep 2027), carried over from the author's own plan. The English is a draft. */
export interface PlanWeek {
  title: Bi;
  tasks: Bi[];
}
export interface PlanMonth {
  name: Bi;
  theme: Bi;
  intro: Bi;
  weeks: PlanWeek[];
}

export const YEAR_VISION = {
  motto: {
    ar: 'السكون · الاستقرار · الاستقلال',
    en: 'Stillness · Stability · Independence',
  } satisfies Bi,
  text: {
    ar: 'ليست الفكرة أن أصل إلى نسخة مثالية من نفسي، بل أن أبني حياة أكثر هدوءًا ووضوحًا واستقلالًا خطوة بخطوة.',
    en: 'The idea is not to reach a perfect version of myself, but to build a life that is calmer, clearer and more independent, one step at a time.',
  } satisfies Bi,
};

export const YEAR_GOALS: Bi[] = [
  {
    ar: 'أن أصبح أكثر هدوءًا وقدرة على ضبط انفعالاتي، وأن أفهم نفسي قبل ردود الأفعال والقرارات.',
    en: 'To become calmer and better able to manage my emotions, and to understand myself before reacting or deciding.',
  },
  {
    ar: 'أن أتعامل مع الرفض والتجاهل والتغير في العلاقات بصورة أكثر اتزانًا.',
    en: 'To handle rejection, being ignored, and change in relationships with more balance.',
  },
  {
    ar: 'أن أتعلم التعامل مع الوحدة دون أن أفقد إحساسي بقيمتي.',
    en: 'To learn to be alone without losing my sense of my own worth.',
  },
  {
    ar: 'أن أفهم علاقاتي واحتياجاتي بصورة أفضل، وأن أعطي كل علاقة حقها دون أن أسبق الأحداث.',
    en: 'To understand my relationships and needs better, and to give each relationship its due without rushing ahead of events.',
  },
  {
    ar: 'أن أبني علاقات أكثر صحة واستقرارًا.',
    en: 'To build healthier and more stable relationships.',
  },
  {
    ar: 'أن أقترب من الله بصورة أكثر ثباتًا وصدقًا.',
    en: 'To draw closer to God, more steadily and more sincerely.',
  },
  {
    ar: 'أن أتعلم التسليم لأقدار الله، وأقلل ما يمكنني من القلق بشأن ما لا أستطيع التحكم فيه.',
    en: 'To learn to trust God\'s decree, and to worry as little as I can about what I cannot control.',
  },
  {
    ar: 'أن أتعامل مع صعوباتي النفسية بصورة أفضل، وأن أفهم نفسي ومشاعري بطريقة صحيحة.',
    en: 'To deal with my emotional difficulties better, and to understand myself and my feelings in a healthy way.',
  },
  {
    ar: 'أن أتطور مهنيًا وأصل إلى مستوى أشعر فيه بكفاءتي وقدرتي ومكانتي في مجالي.',
    en: 'To grow professionally and reach a level where I feel competent, capable, and respected in my field.',
  },
  {
    ar: 'أن أعمل باتجاه استقلال مادي وشخصي، وأن أبني حياة مستقلة بصورة عملية.',
    en: 'To work towards financial and personal independence, and to build a practically independent life.',
  },
  {
    ar: 'أن أحافظ على مساحة في حياتي للرسم والهوايات والإبداع والتجارب خارج العمل.',
    en: 'To keep room in my life for drawing, hobbies, creativity, and experiences outside work.',
  },
  {
    ar: 'أن أكتشف ما يجعل حياتي ذات معنى بالنسبة لي.',
    en: 'To discover what makes my life meaningful to me.',
  },
];

export const YEAR_REVIEW_QUESTIONS: Bi[] = [
  { ar: 'ما الذي نجح معي هذا العام؟', en: 'What worked for me this year?' },
  { ar: 'ما الذي كان صعبًا، وماذا تعلمت منه؟', en: 'What was hard, and what did I learn from it?' },
  { ar: 'ما التغيير الحقيقي الذي لاحظته في نفسي؟', en: 'What real change did I notice in myself?' },
  {
    ar: 'كيف تغير تعاملي مع الرفض والوحدة والخلافات؟',
    en: 'How has the way I deal with rejection, loneliness and disagreements changed?',
  },
  { ar: 'كيف أصبحت علاقتي بنفسي وبالآخرين؟', en: 'How has my relationship with myself and with others changed?' },
  { ar: 'ما الخطوات التي قطعتها نحو الاستقلال؟', en: 'What steps have I taken towards independence?' },
  { ar: 'ماذا تعلمت عن حياتي المهنية وقدراتي؟', en: 'What have I learned about my working life and my abilities?' },
  { ar: 'ما الذي اكتشفته عن معنى حياتي؟', en: 'What have I discovered about the meaning of my life?' },
];

export const YEAR_MONTHS: PlanMonth[] = [
  {
    name: { ar: 'أكتوبر 2026', en: 'October 2026' },
    theme: { ar: 'فهم نفسي ومشاعري', en: 'Understanding myself and my feelings' },
    intro: { ar: 'أتعلم ملاحظة ما أشعر به، وما أفكر فيه، وكيف أتصرف.', en: 'I learn to notice what I feel, what I think, and how I act.' },
    weeks: [
      {
        title: { ar: 'الأسبوع الأول: ملاحظة المشاعر', en: 'Week 1: noticing feelings' },
        tasks: [
          { ar: 'أسجل يوميًا موقفًا واحدًا: ماذا حدث؟ ماذا شعرت؟ ماذا فكرت؟ ماذا فعلت؟', en: 'Each day I record one situation: what happened? What did I feel? What did I think? What did I do?' },
          { ar: 'ألاحظ المشاعر دون الحكم على نفسي بسببها.', en: 'I notice my feelings without judging myself for having them.' },
          { ar: 'في نهاية الأسبوع أحدد أكثر شعور تكرر.', en: 'At the end of the week I identify the feeling that came up most often.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثاني: الشعور ليس بالضرورة حقيقة', en: 'Week 2: a feeling is not necessarily a fact' },
        tasks: [
          { ar: 'عندما أشعر بشيء قوي، أسأل: ما الذي أعرفه كحقيقة؟ وما الذي استنتجته؟', en: 'When I feel something strongly, I ask: what do I know as a fact? What have I concluded?' },
          { ar: 'أسجل 3 مواقف فرقت فيها بين الشعور والواقع.', en: 'I record three situations where I told apart the feeling and the reality.' },
          { ar: 'أناقش ملاحظة مهمة في الجلسة النفسية إذا كانت مناسبة.', en: 'If it fits, I discuss an important observation in my therapy session.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثالث: تأخير رد الفعل', en: 'Week 3: delaying my reaction' },
        tasks: [
          { ar: 'عند الانفعال القوي، أؤجل القرارات أو الرسائل المهمة قدر الإمكان حتى أهدأ.', en: 'When I feel strong emotion, I postpone decisions or important messages as far as I can until I calm down.' },
          { ar: 'أسجل موقفًا واحدًا على الأقل: ماذا كنت سأفعل فورًا؟ وماذا فعلت بعد الهدوء؟', en: 'I record at least one situation: what would I have done straight away? What did I do after calming down?' },
          { ar: 'ألاحظ هل تغيرت النتيجة عندما أعطيت نفسي وقتًا.', en: 'I notice whether the outcome changed when I gave myself time.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الرابع: المراجعة', en: 'Week 4: review' },
        tasks: [
          { ar: 'أكتب 3 أشياء اكتشفتها عن نفسي.', en: 'I write three things I have discovered about myself.' },
          { ar: 'أكتب موقفًا واحدًا تعاملت معه بشكل مختلف عن المعتاد.', en: 'I write one situation I handled differently from usual.' },
          { ar: 'أحدد شيئًا واحدًا أريد أن آخذه معي إلى نوفمبر.', en: 'I choose one thing I want to take with me into November.' },
        ],
      },
    ],
  },
  {
    name: { ar: 'نوفمبر 2026', en: 'November 2026' },
    theme: { ar: 'الهدوء والتحكم في ردود الفعل', en: 'Calm and control over my reactions' },
    intro: { ar: 'أتمرن على التوقف قبل التصرف عندما يكون الانفعال قويًا.', en: 'I practise stopping before I act when the emotion is strong.' },
    weeks: [
      {
        title: { ar: 'الأسبوع الأول: ملاحظة لحظة الانفعال', en: 'Week 1: noticing the moment of strong emotion' },
        tasks: [
          { ar: 'أسجل 3 مواقف شعرت فيها بانفعال قوي، وأكتب: ماذا حدث؟ ماذا شعرت؟ ماذا أردت أن أفعل؟', en: 'I record three situations where I felt strong emotion, and write: what happened? What did I feel? What did I want to do?' },
          { ar: 'ألاحظ العلامات المبكرة للانفعال في جسمي وأفكاري.', en: 'I notice the early signs of emotion in my body and my thoughts.' },
          { ar: 'أحدد أكثر موقف أحتاج فيه إلى التوقف قبل الرد.', en: 'I identify the situation where I most need to pause before replying.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثاني: قاعدة التوقف', en: 'Week 2: the pause rule' },
        tasks: [
          { ar: 'أجرب التوقف لبضع دقائق قبل الرد على موقف يثيرني، إذا كان ذلك ممكنًا.', en: 'If possible, I try pausing for a few minutes before replying to something that provokes me.' },
          { ar: 'أستخدم تنفسًا هادئًا أو أبتعد قليلًا عن الموقف بدل الرد الفوري.', en: 'I use slow breathing, or step a little away from the situation, instead of replying immediately.' },
          { ar: 'أسجل موقفًا واحدًا نجحت فيه في تأخير رد الفعل.', en: 'I record one situation where I managed to delay my reaction.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثالث: اختيار الرد', en: 'Week 3: choosing my reply' },
        tasks: [
          { ar: 'قبل الرد، أسأل: هل ردي سيحل المشكلة أم سيزيدها؟', en: 'Before replying I ask: will my reply solve the problem or make it worse?' },
          { ar: 'أجرب صياغة رد هادئ واحد بدل الرد الذي يأتي مع أول موجة انفعال.', en: 'I try writing one calm reply instead of the one that comes with the first wave of emotion.' },
          { ar: 'ألاحظ الفرق بين ما شعرت به وما اخترت فعله.', en: 'I notice the difference between what I felt and what I chose to do.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الرابع: مراجعة أنماطي', en: 'Week 4: reviewing my patterns' },
        tasks: [
          { ar: 'أحدد أكثر 3 أشياء تثير انفعالي.', en: 'I identify the three things that stir up my emotion most.' },
          { ar: 'أكتب ما الذي يساعدني فعلًا على الهدوء.', en: 'I write down what really helps me calm down.' },
          { ar: 'أختار مهارة واحدة أستمر عليها في ديسمبر.', en: 'I choose one skill to keep practising in December.' },
        ],
      },
    ],
  },
  {
    name: { ar: 'ديسمبر 2026', en: 'December 2026' },
    theme: { ar: 'التعامل مع الرفض والخلاف', en: 'Dealing with rejection and disagreement' },
    intro: { ar: 'أفصل بين الشعور بالرفض وبين الحكم على قيمتي الشخصية.', en: 'I separate the feeling of rejection from a judgement about my personal worth.' },
    weeks: [
      {
        title: { ar: 'الأسبوع الأول: فهم الرفض', en: 'Week 1: understanding rejection' },
        tasks: [
          { ar: 'أكتب موقفًا شعرت فيه بالرفض وأفصل بين الحدث نفسه وبين التفسير الذي أعطيته له.', en: 'I write down a situation where I felt rejected, and separate the event itself from the meaning I gave it.' },
          { ar: 'أسأل: ما الذي أعرفه يقينًا؟ وما الذي افترضته؟', en: 'I ask: what do I know for certain? What did I assume?' },
          { ar: 'ألاحظ كيف يؤثر الرفض على صورتي عن نفسي.', en: 'I notice how rejection affects my picture of myself.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثاني: التعامل مع الخلاف وترميم الصلة', en: 'Week 2: handling disagreement and repairing the connection' },
        tasks: [
          { ar: 'أميز بين وجود خلاف وبين انتهاء العلاقة.', en: 'I distinguish between having a disagreement and the relationship ending.' },
          { ar: 'بعد الخلاف أسأل: ما الخطوة الصغيرة التي يمكن أن تساعدني على استعادة الصلة بدل الاكتفاء بإثبات من كان على حق؟', en: 'After a disagreement I ask: what small step could help me restore the connection, instead of only proving who was right?' },
          { ar: 'أتدرب على فتح باب التواصل من جديد: الاعتراف بما حدث، التعبير عن أثري منه، وإظهار رغبتي في ترميم العلاقة.', en: 'I practise reopening communication: acknowledging what happened, saying how it affected me, and showing that I want to repair the relationship.' },
          { ar: 'أكتب ما الذي قد يجعل العودة إلى القرب آمنة وممكنة للطرفين.', en: 'I write what could make getting close again safe and possible for both of us.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثالث: عدم أخذ كل شيء بشكل شخصي', en: 'Week 3: not taking everything personally' },
        tasks: [
          { ar: 'عندما يتغير تصرف شخص معي، أكتب 3 تفسيرات محتملة قبل اختيار تفسير واحد.', en: 'When someone\'s behaviour towards me changes, I write three possible explanations before choosing one.' },
          { ar: 'أؤجل الاستنتاجات الكبيرة عندما تكون المعلومات ناقصة.', en: 'I postpone big conclusions when the information is incomplete.' },
          { ar: 'ألاحظ هل تغير شعوري عندما وسعت احتمالات التفسير.', en: 'I notice whether my feeling changed when I widened the range of explanations.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الرابع: حدود صحية', en: 'Week 4: healthy boundaries' },
        tasks: [
          { ar: 'أحدد موقفًا واحدًا أحتاج فيه إلى قول لا أو طلب مساحة.', en: 'I identify one situation where I need to say no or ask for space.' },
          { ar: 'أكتب كيف يمكنني وضع الحد بهدوء ووضوح.', en: 'I write how I can set that boundary calmly and clearly.' },
          { ar: 'أراجع ما تعلمته عن الرفض والخلاف هذا الشهر.', en: 'I review what I have learned about rejection and disagreement this month.' },
        ],
      },
    ],
  },
  {
    name: { ar: 'يناير 2027', en: 'January 2027' },
    theme: { ar: 'العلاقة مع نفسي والوحدة', en: 'My relationship with myself, and loneliness' },
    intro: { ar: 'أبني قدرة أكبر على قضاء الوقت مع نفسي دون اعتبار الوحدة دليلًا على عدم المحبة.', en: 'I build a greater ability to spend time with myself, without treating loneliness as proof that I am not loved.' },
    weeks: [
      {
        title: { ar: 'الأسبوع الأول: علاقتي بنفسي', en: 'Week 1: my relationship with myself' },
        tasks: [
          { ar: 'أكتب 5 أشياء أقدرها في نفسي بعيدًا عن رأي الآخرين.', en: 'I write five things I value in myself, apart from other people\'s opinions.' },
          { ar: 'ألاحظ الطريقة التي أكلم بها نفسي عندما أخطئ، وهل صوتي الداخلي صوت محب أم صوت عقاب.', en: 'I notice how I talk to myself when I make a mistake, and whether my inner voice is loving or punishing.' },
          { ar: 'أستبدل جلد الذات بخطاب محب: أكلم نفسي كما أكلم شخصًا أحبه، بدل أن أكتفي بوصف ما حدث بطريقة باردة.', en: 'I replace self-criticism with loving speech: I talk to myself the way I would talk to someone I love, instead of only describing what happened in a cold way.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثاني: وقت مع نفسي', en: 'Week 2: time with myself' },
        tasks: [
          { ar: 'أخصص وقتًا واحدًا أسبوعيًا لنشاط أستمتع به بمفردي.', en: 'I set aside one time each week for an activity I enjoy on my own.' },
          { ar: 'ألاحظ شعوري قبل الوقت وبعده.', en: 'I notice how I feel before and after that time.' },
          { ar: 'أكتب ما الذي يجعل الوحدة مريحة وما الذي يجعلها صعبة.', en: 'I write what makes being alone comfortable, and what makes it hard.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثالث: الاحتياج لا يساوي القيمة', en: 'Week 3: having a need does not equal lower worth' },
        tasks: [
          { ar: 'عندما أحتاج إلى اهتمام أو قرب من شخص، أذكر نفسي بأن الاحتياج لا يعني أن قيمتي أقل.', en: 'When I need someone\'s attention or closeness, I remind myself that having a need does not mean my worth is less.' },
          { ar: 'أفرق بين طلب الاحتياج وبين الاعتماد الكامل على استجابة شخص آخر.', en: 'I distinguish between asking for what I need and depending entirely on another person\'s response.' },
          { ar: 'أسجل موقفًا تعاملت فيه مع احتياجي بطريقة أهدأ.', en: 'I record a situation where I dealt with my need more calmly.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الرابع: بناء مساحة شخصية', en: 'Week 4: building a personal space' },
        tasks: [
          { ar: 'أحدد 3 أشياء أريد أن تكون جزءًا ثابتًا من حياتي الشخصية.', en: 'I identify three things I want to be a steady part of my personal life.' },
          { ar: 'أضع وقتًا لنشاط شخصي في الأسبوع القادم.', en: 'I schedule time for a personal activity next week.' },
          { ar: 'أكتب ما تعلمته عن علاقتي بنفسي والوحدة.', en: 'I write what I have learned about my relationship with myself and about loneliness.' },
        ],
      },
    ],
  },
  {
    name: { ar: 'فبراير 2027', en: 'February 2027' },
    theme: { ar: 'العلاقات', en: 'Relationships' },
    intro: { ar: 'أعمل على الوضوح والحدود والاستقرار وفهم احتياجاتي واحتياجات الآخرين.', en: 'I work on clarity, boundaries, stability, and understanding my needs and the needs of others.' },
    weeks: [
      {
        title: { ar: 'الأسبوع الأول: فهم احتياجاتي', en: 'Week 1: understanding my needs' },
        tasks: [
          { ar: 'أكتب أهم الاحتياجات التي أبحث عنها في العلاقات.', en: 'I write the most important needs I look for in relationships.' },
          { ar: 'أميز بين الاحتياج الحقيقي وبين التوقع الذي لم أتحدث عنه.', en: 'I distinguish between a real need and an expectation I have never talked about.' },
          { ar: 'أحدد شيئًا واحدًا أحتاج إلى التعبير عنه بوضوح.', en: 'I identify one thing I need to express clearly.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثاني: التواصل الواضح', en: 'Week 2: clear communication' },
        tasks: [
          { ar: 'أجرب التعبير عن شعور أو احتياج بصيغة هادئة ومباشرة.', en: 'I try expressing a feeling or a need in a calm, direct way.' },
          { ar: 'أتجنب التلميح عندما يكون الكلام الواضح ممكنًا.', en: 'I avoid hinting when plain speech is possible.' },
          { ar: 'ألاحظ كيف تغيرت النتيجة عندما كنت واضحًا.', en: 'I notice how the outcome changed when I was clear.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثالث: الحدود كقرب آمن', en: 'Week 3: boundaries as safe closeness' },
        tasks: [
          { ar: 'أفكر في الحدود باعتبارها طريقة تجعل القرب أكثر أمانًا، لا طريقة لإبعاد الآخرين.', en: 'I think of boundaries as a way to make closeness safer, not as a way to push others away.' },
          { ar: 'أحدد تفضيلاتي واحتياجاتي التي تجعلني أكثر راحة وحميمية داخل العلاقة.', en: 'I identify the preferences and needs that make me more comfortable and close within a relationship.' },
          { ar: 'أجرب التعبير عن تفضيل واحد بوضوح ولطف، وألاحظ هل يساعد ذلك على القرب بدلًا من المسافة.', en: 'I try expressing one preference clearly and kindly, and notice whether it helps closeness instead of distance.' },
          { ar: 'أفرق بين وضع حد يحمي القرب وبين استخدام الحد لمعاقبة شخص أو إبعاده.', en: 'I distinguish between a boundary that protects closeness and using a boundary to punish or push away a person.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الرابع: العلاقات التي أريد بناءها', en: 'Week 4: the relationships I want to build' },
        tasks: [
          { ar: 'أكتب صفات العلاقة الصحية بالنسبة لي.', en: 'I write the qualities of a healthy relationship for me.' },
          { ar: 'أحدد سلوكًا واحدًا أريد أن أقدمه للآخرين بصورة أفضل.', en: 'I identify one behaviour I want to show others better.' },
          { ar: 'أراجع ما تعلمته عن احتياجاتي وحدودي.', en: 'I review what I have learned about my needs and my boundaries.' },
        ],
      },
    ],
  },
  {
    name: { ar: 'مارس 2027', en: 'March 2027' },
    theme: { ar: 'علاقتي بالله', en: 'My relationship with God' },
    intro: { ar: 'أركز على الاستمرارية والصدق بدلًا من الضغط على نفسي.', en: 'I focus on consistency and sincerity instead of pressuring myself.' },
    weeks: [
      {
        title: { ar: 'الأسبوع الأول: الاستمرارية', en: 'Week 1: consistency' },
        tasks: [
          { ar: 'أختار عبادة أو ممارسة روحية واحدة أستطيع الحفاظ عليها.', en: 'I choose one act of worship or spiritual practice that I can keep up.' },
          { ar: 'أركز على الاستمرار بدل الكثرة.', en: 'I focus on continuing rather than on quantity.' },
          { ar: 'ألاحظ كيف يؤثر الانتظام على هدوئي.', en: 'I notice how regularity affects my calm.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثاني: الصدق مع الله', en: 'Week 2: sincerity with God' },
        tasks: [
          { ar: 'أخصص وقتًا قصيرًا للدعاء أو التأمل بهدوء دون ضغط.', en: 'I set aside a short time for prayer or quiet reflection, without pressure.' },
          { ar: 'أكتب ما الذي يشغل قلبي وأضعه في دعائي.', en: 'I write what is on my heart and bring it into my prayer.' },
          { ar: 'ألاحظ الفرق بين الممارسة بدافع الخوف والممارسة بدافع القرب.', en: 'I notice the difference between practising out of fear and practising out of closeness.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثالث: العودة بعد الانقطاع', en: 'Week 3: returning after a break' },
        tasks: [
          { ar: 'إذا انقطعت عن عادة روحية، أعود إليها دون جلد للذات.', en: 'If I have stopped a spiritual habit, I return to it without self-criticism.' },
          { ar: 'أتعامل مع يوم ضعيف باعتباره يومًا واحدًا وليس حكمًا على التزامي.', en: 'I treat a weak day as one day, not as a verdict on my commitment.' },
          { ar: 'أسجل ما الذي يساعدني على الاستمرار.', en: 'I record what helps me keep going.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الرابع: مراجعة العلاقة', en: 'Week 4: reviewing the relationship' },
        tasks: [
          { ar: 'أكتب كيف تغيرت علاقتي بالله منذ بداية السنة.', en: 'I write how my relationship with God has changed since the start of the year.' },
          { ar: 'أحدد ممارسة واحدة أريد الاستمرار عليها.', en: 'I identify one practice I want to keep up.' },
          { ar: 'أكتب ما أحتاج إلى تقبله بدل القلق المستمر بشأنه.', en: 'I write what I need to accept instead of worrying about it constantly.' },
        ],
      },
    ],
  },
  {
    name: { ar: 'أبريل 2027', en: 'April 2027' },
    theme: { ar: 'التقبل والتسليم', en: 'Acceptance and surrender' },
    intro: { ar: 'أميز بين ما أستطيع تغييره وما أحتاج إلى تقبله.', en: 'I distinguish between what I can change and what I need to accept.' },
    weeks: [
      {
        title: { ar: 'الأسبوع الأول: ما أستطيع التحكم فيه', en: 'Week 1: what I can control' },
        tasks: [
          { ar: 'أقسم مشكلة واحدة إلى: ما أستطيع التأثير فيه وما لا أستطيع.', en: 'I split one problem into what I can influence and what I cannot.' },
          { ar: 'أركز هذا الأسبوع على الجزء الموجود تحت سيطرتي.', en: 'This week I focus on the part that is under my control.' },
          { ar: 'ألاحظ مقدار الطاقة التي أهدرها على ما لا أتحكم فيه.', en: 'I notice how much energy I waste on what I do not control.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثاني: التقبل دون استسلام', en: 'Week 2: accepting without giving up' },
        tasks: [
          { ar: 'أكتب شيئًا لا أستطيع تغييره حاليًا.', en: 'I write down something I cannot change right now.' },
          { ar: 'أحدد ما الذي يمكنني فعله رغم وجود هذا الشيء.', en: 'I identify what I can still do despite it.' },
          { ar: 'أفرق بين قبول الواقع وبين التوقف عن المحاولة.', en: 'I distinguish between accepting reality and stopping trying.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثالث: تقليل القلق', en: 'Week 3: reducing worry' },
        tasks: [
          { ar: 'عندما يبدأ التفكير الزائد، أسأل: هل يوجد إجراء حقيقي يمكنني فعله الآن؟', en: 'When overthinking starts, I ask: is there a real action I can take now?' },
          { ar: 'إذا لم يوجد، أعود إلى نشاط حاضر بدل الاستمرار في التوقعات.', en: 'If there is none, I return to a present activity instead of continuing to imagine outcomes.' },
          { ar: 'أسجل موقفًا نجحت فيه في ترك شيء خارج سيطرتي.', en: 'I record a situation where I managed to let go of something outside my control.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الرابع: التسليم', en: 'Week 4: surrender' },
        tasks: [
          { ar: 'أكتب 3 أشياء تعلمت أن أتركها لله.', en: 'I write three things I have learned to leave to God.' },
          { ar: 'أحدد عادة تفكير أريد تقليلها.', en: 'I identify a habit of thinking I want to reduce.' },
          { ar: 'أكتب جملة قصيرة تذكرني بما أستطيع التحكم فيه.', en: 'I write a short sentence that reminds me what I can control.' },
        ],
      },
    ],
  },
  {
    name: { ar: 'مايو 2027', en: 'May 2027' },
    theme: { ar: 'الصحة النفسية', en: 'Mental health' },
    intro: { ar: 'أراجع ما تعلمته عن نفسي وأطبق مهارات التعامل التي أتعلمها في العلاج.', en: 'I review what I have learned about myself and practise the coping skills I learn in therapy.' },
    weeks: [
      {
        title: { ar: 'الأسبوع الأول: خريطة صحتي النفسية', en: 'Week 1: a map of my mental health' },
        tasks: [
          { ar: 'أكتب أكثر الأشياء التي تساعدني عندما أكون تحت ضغط.', en: 'I write the things that help me most when I am under pressure.' },
          { ar: 'أحدد العلامات التي تخبرني أنني أحتاج إلى التهدئة أو الدعم.', en: 'I identify the signs that tell me I need calming down or support.' },
          { ar: 'أراجع ما تعلمته في الجلسات النفسية.', en: 'I review what I have learned in my therapy sessions.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثاني: مهارة واحدة', en: 'Week 2: one skill' },
        tasks: [
          { ar: 'أختار مهارة واحدة تعلمتها وأطبقها في موقف حقيقي.', en: 'I choose one skill I have learned and apply it in a real situation.' },
          { ar: 'أسجل ماذا حدث قبل استخدامها وبعدها.', en: 'I record what happened before and after using it.' },
          { ar: 'لا أضيف مهارات كثيرة في نفس الوقت.', en: 'I do not add many skills at the same time.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثالث: التعامل مع الأيام الصعبة', en: 'Week 3: handling hard days' },
        tasks: [
          { ar: 'أكتب خطة بسيطة ليوم صعب: ما الحد الأدنى الذي أحتاجه؟', en: 'I write a simple plan for a hard day: what is the minimum I need?' },
          { ar: 'أحدد شخصًا أو موردًا يمكنني اللجوء إليه عند الحاجة.', en: 'I identify a person or a resource I can turn to when I need it.' },
          { ar: 'أتعلم أن الأسبوع الصعب لا يلغي التقدم السابق.', en: 'I learn that a hard week does not cancel the progress made before it.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الرابع: مراجعة التقدم', en: 'Week 4: reviewing progress' },
        tasks: [
          { ar: 'أقارن طريقة تعاملي مع موقف حالي بموقف مشابه سابقًا.', en: 'I compare how I handle a current situation with a similar one from before.' },
          { ar: 'أكتب 3 تغييرات لاحظتها في نفسي.', en: 'I write three changes I have noticed in myself.' },
          { ar: 'أحدد ما أريد مناقشته في الجلسة القادمة.', en: 'I identify what I want to discuss in the next session.' },
        ],
      },
    ],
  },
  {
    name: { ar: 'يونيو 2027', en: 'June 2027' },
    theme: { ar: 'الحياة المهنية', en: 'Working life' },
    intro: { ar: 'أبني مهاراتي وثقتي المهنية من خلال تعلم وتطبيق ملموس.', en: 'I build my professional skills and confidence through concrete learning and practice.' },
    weeks: [
      {
        title: { ar: 'الأسبوع الأول: تقييم مهني', en: 'Week 1: a professional assessment' },
        tasks: [
          { ar: 'أكتب أهم المهارات التي أمتلكها حاليًا.', en: 'I write the most important skills I have right now.' },
          { ar: 'أحدد 3 مهارات أحتاج إلى تطويرها للوصول إلى المستوى الذي أريده.', en: 'I identify three skills I need to develop to reach the level I want.' },
          { ar: 'أختار مهارة واحدة لتكون محور هذا الشهر.', en: 'I choose one skill to be the focus of this month.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثاني: تعلم مركز', en: 'Week 2: focused learning' },
        tasks: [
          { ar: 'أخصص وقتًا ثابتًا للتعلم خلال الأسبوع.', en: 'I set a fixed time for learning during the week.' },
          { ar: 'أطبق ما تعلمته في مشروع أو مهمة حقيقية.', en: 'I apply what I have learned to a real project or task.' },
          { ar: 'أكتب ما الذي أصبح أسهل بعد التطبيق.', en: 'I write down what has become easier after practising.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثالث: بناء الثقة بالكفاءة', en: 'Week 3: building confidence in my competence' },
        tasks: [
          { ar: 'أوثق إنجازًا مهنيًا أو مشكلة استطعت حلها.', en: 'I document a professional achievement or a problem I managed to solve.' },
          { ar: 'أجمع أمثلة على الأشياء التي أصبحت أعرف كيف أفعلها.', en: 'I collect examples of things I now know how to do.' },
          { ar: 'ألاحظ الفرق بين عدم المعرفة وبين عدم الكفاءة.', en: 'I notice the difference between not knowing something and being incompetent.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الرابع: الخطوة المهنية التالية', en: 'Week 4: the next professional step' },
        tasks: [
          { ar: 'أحدد الخطوة المهنية التي أريد العمل عليها بعد هذا الشهر.', en: 'I identify the professional step I want to work on after this month.' },
          { ar: 'أراجع الـCV أو portfolio إذا كان ذلك مناسبًا.', en: 'If it fits, I review my CV or portfolio.' },
          { ar: 'أكتب 3 أفعال عملية للشهر القادم.', en: 'I write three practical actions for next month.' },
        ],
      },
    ],
  },
  {
    name: { ar: 'يوليو 2027', en: 'July 2027' },
    theme: { ar: 'الاستقلال', en: 'Independence' },
    intro: { ar: 'أحول فكرة الاستقلال إلى خطوات مالية وشخصية عملية.', en: 'I turn the idea of independence into practical financial and personal steps.' },
    weeks: [
      {
        title: { ar: 'الأسبوع الأول: صورة الاستقلال', en: 'Week 1: what independence looks like' },
        tasks: [
          { ar: 'أحدد ماذا يعني الاستقلال بالنسبة لي عمليًا.', en: 'I define what independence practically means to me.' },
          { ar: 'أكتب أهم المصروفات والالتزامات التي أحتاج إلى فهمها.', en: 'I write down the main expenses and commitments I need to understand.' },
          { ar: 'أحدد جانبًا واحدًا من الاستقلال أستطيع البدء فيه الآن.', en: 'I identify one aspect of independence I can start on now.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثاني: المال', en: 'Week 2: money' },
        tasks: [
          { ar: 'أراجع دخلي ومصروفاتي بصورة واقعية.', en: 'I review my income and expenses realistically.' },
          { ar: 'أحدد مبلغًا أو نسبة أستطيع ادخارها إن أمكن.', en: 'If possible, I set an amount or a percentage I can save.' },
          { ar: 'أحدد مصروفًا واحدًا يمكن تقليله دون حرمان غير ضروري.', en: 'I identify one expense I can reduce without unnecessary deprivation.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثالث: الاستقلال الشخصي', en: 'Week 3: personal independence' },
        tasks: [
          { ar: 'أحدد مسؤوليات أريد أن أكون أكثر اعتمادًا على نفسي فيها.', en: 'I identify responsibilities where I want to rely more on myself.' },
          { ar: 'أضع خطوة عملية واحدة لتنفيذ ذلك.', en: 'I set one practical step to carry that out.' },
          { ar: 'ألاحظ ما الذي يمنحني إحساسًا أكبر بالقدرة.', en: 'I notice what gives me a greater sense of ability.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الرابع: خطة الأشهر القادمة', en: 'Week 4: the plan for the coming months' },
        tasks: [
          { ar: 'أكتب هدفًا ماليًا وهدفًا شخصيًا للاستقلال.', en: 'I write one financial goal and one personal goal for independence.' },
          { ar: 'أحدد أول خطوة لكل هدف.', en: 'I identify the first step for each goal.' },
          { ar: 'أراجع ما إذا كانت الخطة واقعية ويمكن الاستمرار عليها.', en: 'I check whether the plan is realistic and something I can keep up.' },
        ],
      },
    ],
  },
  {
    name: { ar: 'أغسطس 2027', en: 'August 2027' },
    theme: { ar: 'الحياة خارج العمل', en: 'Life outside work' },
    intro: { ar: 'أعيد مساحة للهوايات والإبداع والخروج والتجارب.', en: 'I make room again for hobbies, creativity, going out, and new experiences.' },
    weeks: [
      {
        title: { ar: 'الأسبوع الأول: العودة للهوايات', en: 'Week 1: returning to hobbies' },
        tasks: [
          { ar: 'أختار نشاطًا إبداعيًا أو هواية أريد العودة إليها.', en: 'I choose a creative activity or a hobby I want to return to.' },
          { ar: 'أخصص له وقتًا دون ربطه بالإنتاجية.', en: 'I give it time without linking it to productivity.' },
          { ar: 'ألاحظ شعوري أثناء النشاط وبعده.', en: 'I notice how I feel during and after the activity.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثاني: تجربة جديدة', en: 'Week 2: a new experience' },
        tasks: [
          { ar: 'أجرب شيئًا جديدًا أو أزور مكانًا جديدًا.', en: 'I try something new or visit a new place.' },
          { ar: 'أكتب ماذا اكتشفت عن ذوقي واهتماماتي.', en: 'I write what I have discovered about my tastes and interests.' },
          { ar: 'أسمح لنفسي بتجربة شيء دون الحاجة لأن أصبح جيدًا فيه.', en: 'I allow myself to try something without needing to be good at it.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثالث: الحياة خارج العمل', en: 'Week 3: life outside work' },
        tasks: [
          { ar: 'أحدد ما الذي يأخذ أغلب وقتي حاليًا.', en: 'I identify what takes up most of my time right now.' },
          { ar: 'أضيف نشاطًا واحدًا غير متعلق بالعمل.', en: 'I add one activity that is not related to work.' },
          { ar: 'أراجع هل حياتي تحتوي على مساحة للراحة والمتعة.', en: 'I check whether my life has room for rest and enjoyment.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الرابع: بناء حياة متوازنة', en: 'Week 4: building a balanced life' },
        tasks: [
          { ar: 'أكتب قائمة بالأشياء التي أريد أن تبقى في حياتي بجانب العمل.', en: 'I write a list of the things I want to keep in my life alongside work.' },
          { ar: 'أحدد عادة أو موعدًا أريد الحفاظ عليه بعد انتهاء الشهر.', en: 'I identify a habit or a date I want to keep after the month ends.' },
          { ar: 'أكتب ما الذي أعاد لي الإحساس بالحيوية.', en: 'I write what gave me back a sense of vitality.' },
        ],
      },
    ],
  },
  {
    name: { ar: 'سبتمبر 2027', en: 'September 2027' },
    theme: { ar: 'المعنى ومراجعة السنة', en: 'Meaning and reviewing the year' },
    intro: { ar: 'أراجع السنة وألاحظ ما الذي أعطى حياتي قيمة ومعنى بالنسبة لي.', en: 'I review the year and notice what gave my life value and meaning for me.' },
    weeks: [
      {
        title: { ar: 'الأسبوع الأول: ماذا تغير؟', en: 'Week 1: what has changed?' },
        tasks: [
          { ar: 'أقارن نفسي ببداية السنة بدل مقارنتي بالآخرين.', en: 'I compare myself with how I was at the start of the year, instead of comparing myself with others.' },
          { ar: 'أكتب 5 تغييرات لاحظتها في طريقة تفكيري أو تصرفي.', en: 'I write five changes I have noticed in how I think or act.' },
          { ar: 'أحدد شيئًا ما زلت أحتاج إلى العمل عليه.', en: 'I identify something I still need to work on.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثاني: ما الذي أعطاني معنى؟', en: 'Week 2: what gave me meaning?' },
        tasks: [
          { ar: 'أكتب المواقف التي شعرت فيها أن حياتي لها قيمة.', en: 'I write the moments when I felt that my life has value.' },
          { ar: 'أحدد الأشخاص والأنشطة والأعمال التي أعطتني إحساسًا بالمعنى.', en: 'I identify the people, activities and work that gave me a sense of meaning.' },
          { ar: 'ألاحظ ما الذي أريد إعطاءه مساحة أكبر.', en: 'I notice what I want to give more room to.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الثالث: ما أريد الاستمرار فيه', en: 'Week 3: what I want to carry on with' },
        tasks: [
          { ar: 'أختار 5 عادات أو مبادئ أريد حملها إلى العام القادم.', en: 'I choose five habits or principles I want to carry into the coming year.' },
          { ar: 'أحدد ما الذي أريد تركه وراء ظهري.', en: 'I identify what I want to leave behind.' },
          { ar: 'أكتب كيف أريد أن تبدو سنة عمري القادمة بصورة عامة.', en: 'I write how I want the coming year of my life to look, in general.' },
        ],
      },
      {
        title: { ar: 'الأسبوع الرابع: رسالة إلى نفسي', en: 'Week 4: a letter to myself' },
        tasks: [
          { ar: 'أكتب رسالة قصيرة لنفسي عن هذه السنة.', en: 'I write a short letter to myself about this year.' },
          { ar: 'أذكر فيها ما مررت به وما تعلمته وما أنا فخور به.', en: 'In it I mention what I went through, what I learned, and what I am proud of.' },
          { ar: 'أكتب أول خطوة بسيطة أريد أن أبدأ بها في السنة القادمة.', en: 'I write the first simple step I want to begin with in the coming year.' },
        ],
      },
    ],
  },
];
