import type { Symptom } from './schema';

const base = { status: 'draft' as const, sourceIds: ['nimh', 'dsm5tr'] };

/**
 * The nine DSM-5-TR features, in kind words (claim C3). Draft for therapist review: each card says how it can feel,
 * the need behind it, and offers sentences to say to oneself. Validation comes first; self-compassion is only offered
 * because for some people it can raise shame, so the reader chooses (claim C12). The English is a draft too.
 */
export const symptoms: Symptom[] = [
  {
    ...base,
    id: 'abandonment',
    title: {
      ar: 'الخوف من أن يتركني من أحب',
      en: 'Fear that the people I love will leave me',
    },
    summary: {
      ar: 'قلق شديد من الفقد أو الهجر، حقيقيًا كان أم متخيَّلًا.',
      en: 'Strong worry about loss or rejection, whether it is real or imagined.',
    },
    feels: {
      ar: 'أشعر أن من أحبهم قد يرحلون في أي لحظة. فأتعلّق بقوة، أو أبتعد قبل أن يتركوني، وأقرأ التأخّر أو الصمت على أنهما رفض.',
      en: 'I feel that the people I love may leave at any moment. So I cling tightly, or I pull away before they can leave me, and I read a delay or silence as rejection.',
    },
    need: {
      ar: 'أن أطمئنّ إلى أنني مهمّ لمن يهمّني، وأن الحب لا يزول عند أول خلاف.',
      en: 'To feel sure that I matter to the people who matter to me, and that love does not disappear at the first disagreement.',
    },
    selfSentences: [
      { ar: 'خوفي من الفقد يدلّ على أن الارتباط يهمّني.', en: 'My fear of losing someone shows that the bond matters to me.' },
      {
        ar: 'أستطيع أن أسأل بهدوء: هل نحن بخير؟ بدل أن أفترض الأسوأ.',
        en: 'I can calmly ask: are we okay? instead of assuming the worst.',
      },
    ],
    tool: { label: { ar: 'أسجّل ما أشعر به الآن', en: 'I record what I feel now' }, to: '/checkin' },
  },
  {
    ...base,
    id: 'relationships',
    title: { ar: 'علاقات شديدة القرب ثم تنكسر', en: 'Very close relationships that then break down' },
    summary: {
      ar: 'أرى الشخص رائعًا تمامًا ثم سيّئًا تمامًا، وتتبدّل علاقتي به بسرعة.',
      en: 'I see a person as completely wonderful, then completely bad, and my relationship with them changes quickly.',
    },
    feels: {
      ar: 'أنجذب إلى من أحبّ بكل قلبي، ثم يكفي موقف واحد ليتحوّل في عيني من الأفضل إلى الأسوأ، وأتأذى حين أبتعد.',
      en: 'I am drawn to the people I love with my whole heart. Then a single moment can turn them in my eyes from the best to the worst, and I am hurt when I pull away.',
    },
    need: {
      ar: 'أن أرى الناس بألوان متعدّدة لا بالأبيض والأسود، وأن أثق أن العلاقة تتحمّل الاختلاف.',
      en: 'To see people in many shades rather than only black and white, and to trust that a relationship can handle differences.',
    },
    selfSentences: [
      {
        ar: 'أستطيع أن أحبّ شخصًا وأن أغضب منه في اللحظة نفسها.',
        en: 'I can love someone and be angry with them in the same moment.',
      },
      { ar: 'موقف واحد لا يلخّص إنسانًا كاملًا.', en: 'One moment does not sum up a whole person.' },
    ],
    tool: { label: { ar: 'أتدرّب على الحدود والاحترام', en: 'I practise boundaries and self-respect' }, to: '/step/7' },
  },
  {
    ...base,
    id: 'identity',
    title: { ar: 'صورتي عن نفسي تتغيّر', en: 'My picture of myself keeps changing' },
    summary: {
      ar: 'صعوبة في معرفة من أنا، وتبدّل سريع في الاهتمامات والقيم والأهداف.',
      en: 'Difficulty knowing who I am, and quick changes in my interests, values and goals.',
    },
    feels: {
      ar: 'أحيانًا لا أعرف من أنا بالضبط. تتغيّر اهتماماتي وطموحاتي وصورتي عن نفسي بسرعة، وأشعر أنني أتشكّل بحسب من حولي.',
      en: 'Sometimes I do not know exactly who I am. My interests, ambitions and picture of myself change quickly, and I feel shaped by the people around me.',
    },
    need: {
      ar: 'قيم ثابتة أرجع إليها حين أتشوّش، وأن أُمنح وقتًا لأعرف نفسي.',
      en: 'Steady values to return to when I feel confused, and time to get to know myself.',
    },
    selfSentences: [
      { ar: 'ليس عليّ أن أعرف كل شيء عن نفسي اليوم.', en: 'I do not have to know everything about myself today.' },
      {
        ar: 'ما أهتمّ به حقًّا يظهر مع الوقت، وأستطيع أن أبحث عنه بصبر.',
        en: 'What I truly care about shows up over time, and I can look for it with patience.',
      },
    ],
    tool: { label: { ar: 'أحدّد قيمي واتجاهي', en: 'I identify my values and direction' }, to: '/step/10' },
  },
  {
    ...base,
    id: 'impulsivity',
    title: { ar: 'اندفاع أندم عليه بعد حين', en: 'Impulsive actions I regret later' },
    summary: {
      ar: 'تصرّفات سريعة تخفّف شعورًا ثقيلًا الآن وتضرّني لاحقًا.',
      en: 'Quick actions that ease a heavy feeling now and harm me later.',
    },
    feels: {
      ar: 'حين يشتدّ شعوري أتحرّك بسرعة لأتخلّص منه: إنفاق، أو أكل، أو قيادة متهوّرة، أو ما يشبه ذلك. ثم يأتي الندم.',
      en: 'When my feeling grows strong, I move quickly to get rid of it: spending, eating, reckless driving, or something similar. Then regret comes.',
    },
    need: {
      ar: 'مهلة قصيرة بين الشعور والتصرّف، وطريقة أخرى أخفّف بها الشعور.',
      en: 'A short pause between the feeling and the action, and another way to ease the feeling.',
    },
    selfSentences: [
      { ar: 'أستطيع أن أنتظر دقيقة قبل أن أتصرّف.', en: 'I can wait one minute before I act.' },
      {
        ar: 'الشعور يرتفع ثم يهبط، وأمرّ به دون أن أنفّذ ما يدفعني إليه.',
        en: 'The feeling rises and then falls, and I can go through it without doing what it pushes me to do.',
      },
    ],
    note: {
      ar: 'إن كان الاندفاع يظهر فقط في فترات مزاج أو طاقة مرتفعة جدًا، فقد يكون سببه شيئًا آخر، والمختص هو من يقرّر ذلك.',
      en: 'If the impulsiveness only shows up during very high mood or energy, it may have another cause, and a professional is the one to decide that.',
    },
    tool: { label: { ar: 'أهدّئ نفسي الآن', en: 'I calm myself down now' }, to: '/calm' },
  },
  {
    ...base,
    id: 'self-harm',
    title: { ar: 'أفكار بإيذاء نفسي أو بأن أنتهي', en: 'Thoughts of harming myself or of ending my life' },
    summary: {
      ar: 'حين يشتدّ الألم قد تأتي أفكار بإيذاء النفس أو بالانتحار.',
      en: 'When the pain grows, thoughts of harming myself or of suicide may come.',
    },
    feels: {
      ar: 'حين يصبح الألم أكبر من احتمالي، قد تخطر لي أفكار بإيذاء نفسي أو بأن أنتهي. هذه الأفكار مؤلمة، ووجودها لا يعني أنني ضعيف أو سيّئ.',
      en: 'When the pain becomes bigger than I can bear, thoughts of harming myself or of ending my life may come to mind. These thoughts are painful, and having them does not mean I am weak or bad.',
    },
    need: {
      ar: 'أن يخفّ الألم، وأن يسمعني أحد، وألّا أكون وحدي في هذه اللحظة.',
      en: 'For the pain to ease, for someone to hear me, and not to be alone in this moment.',
    },
    selfSentences: [
      {
        ar: 'أحتاج إلى مساعدة الآن، وطلبها لا يعني ضعفًا.',
        en: 'I need help now, and asking for it does not mean I am weak.',
      },
      {
        ar: 'أستطيع أن أتواصل مع شخص أثق به أو مع خدمات الطوارئ في بلدي الآن.',
        en: 'I can contact someone I trust, or the emergency services in my country, right now.',
      },
    ],
    tool: { label: { ar: 'أحتاج مساعدة الآن', en: 'I need help now' }, to: '/calm' },
    safety: true,
  },
  {
    ...base,
    id: 'mood',
    title: { ar: 'مشاعر تتقلّب بسرعة وبقوة', en: 'Feelings that shift quickly and strongly' },
    summary: {
      ar: 'نوبات غضب أو حزن أو قلق تدوم من ساعات إلى أيام قليلة.',
      en: 'Spells of anger, sadness or anxiety that last from a few hours to a few days.',
    },
    feels: {
      ar: 'أنتقل من الهدوء إلى الحزن أو الغضب أو القلق بسرعة، وبقوة أكبر ممّا يبدو للناس. تدوم هذه النوبات عادةً من ساعات إلى أيام.',
      en: 'I move from calm to sadness, anger or anxiety quickly, and more strongly than people may realise. These spells usually last from hours to days.',
    },
    need: {
      ar: 'أن يُصدَّق شعوري، وأن أتعلّم كيف أُهدّئه دون أن أُنكره.',
      en: 'For my feeling to be taken seriously, and to learn how to calm it without denying it.',
    },
    selfSentences: [
      {
        ar: 'شعوري حقيقي، ويمكنني أن أمرّ به دون أن أنفّذه.',
        en: 'My feeling is real, and I can go through it without acting on it.',
      },
      {
        ar: 'هذا الشعور له بداية ونهاية، ولن يبقى بهذه القوة إلى الأبد.',
        en: 'This feeling has a beginning and an end, and it will not stay this strong forever.',
      },
    ],
    tool: { label: { ar: 'أسجّل شعوري وشدّته', en: 'I record my feeling and how strong it is' }, to: '/checkin' },
  },
  {
    ...base,
    id: 'emptiness',
    title: { ar: 'فراغ داخلي ثقيل', en: 'A heavy inner emptiness' },
    summary: {
      ar: 'إحساس مزمن بأن في داخلي فراغًا لا يملؤه شيء.',
      en: 'A lasting sense that there is an emptiness inside me that nothing fills.',
    },
    feels: {
      ar: 'أشعر أحيانًا بفراغ ثقيل في داخلي، كأن شيئًا مفقودًا لا أعرف ما هو، ولا يملؤه ما أفعل.',
      en: 'Sometimes I feel a heavy emptiness inside, as if something is missing that I cannot name, and what I do does not fill it.',
    },
    need: {
      ar: 'معنى أرجع إليه، وصلة بمن يهمّني وبما يهمّني.',
      en: 'A meaning to return to, and a connection to the people and things that matter to me.',
    },
    selfSentences: [
      { ar: 'الفراغ شعور يزورني ولا يعرّفني.', en: 'The emptiness is a feeling that visits me; it does not define me.' },
      {
        ar: 'أستطيع أن أبحث بهدوء عمّا يعطي أيامي معنى، خطوة صغيرة بعد أخرى.',
        en: 'I can calmly look for what gives my days meaning, one small step after another.',
      },
    ],
    tool: { label: { ar: 'أبحث عن قيمي ومعنى أيامي', en: 'I look for my values and the meaning of my days' }, to: '/step/10' },
  },
  {
    ...base,
    id: 'anger',
    title: { ar: 'غضب أكبر من الموقف', en: 'Anger bigger than the situation' },
    summary: {
      ar: 'غضب شديد يصعب تهدئته، يتبعه كثيرًا ذنب وندم.',
      en: 'Intense anger that is hard to calm, often followed by guilt and regret.',
    },
    feels: {
      ar: 'ينفجر غضبي بسرعة، ويصعب أن أهدّئه، وأحيانًا أقول أو أفعل ما لا أريد. ثم أشعر بالذنب وأخاف أن أخسر من حولي.',
      en: 'My anger flares up quickly and is hard to calm, and sometimes I say or do things I do not want to. Then I feel guilty and afraid of losing the people around me.',
    },
    need: {
      ar: 'أن أشعر بالاحترام والأمان، وأن أتعلّم طريقة أعبّر بها عن غضبي دون أن أخسر.',
      en: 'To feel respected and safe, and to learn a way of expressing my anger without losing people.',
    },
    selfSentences: [
      {
        ar: 'غضبي يخبرني أن شيئًا يمسّ حدودي، وأستطيع أن أختار كيف أعبّر عنه.',
        en: 'My anger tells me that something touches my boundaries, and I can choose how to express it.',
      },
      {
        ar: 'أستطيع أن أبتعد دقائق حتى أهدأ، ثم أعود وأتكلّم.',
        en: 'I can step away for a few minutes until I calm down, then come back and talk.',
      },
    ],
    tool: { label: { ar: 'أتعلّم تنظيم انفعالي', en: 'I learn to regulate my emotions' }, to: '/step/3' },
  },
  {
    ...base,
    id: 'dissociation',
    title: { ar: 'انفصال عن نفسي أو شكّ تحت الضغط', en: 'Feeling detached from myself, or doubt under pressure' },
    summary: {
      ar: 'حين يشتدّ الضغط أشعر أنني بعيد عن نفسي أو أشكّ في نوايا الناس، ثم يعود الأمر.',
      en: 'When pressure rises I feel far away from myself, or I doubt people\'s intentions, and then it passes.',
    },
    feels: {
      ar: 'تحت ضغط شديد أشعر أحيانًا أنني بعيد عن نفسي أو عمّا حولي، كأنني أشاهد من بعيد، أو أشكّ في نوايا الناس. يكون ذلك مؤقتًا في الغالب.',
      en: 'Under heavy pressure I sometimes feel far away from myself or from what is around me, as if I am watching from a distance, or I doubt people\'s intentions. This is usually temporary.',
    },
    need: {
      ar: 'أن أعود إلى الحاضر وأشعر بالأمان، وأن يخفّ الضغط.',
      en: 'To come back to the present and feel safe, and for the pressure to ease.',
    },
    selfSentences: [
      {
        ar: 'هذا الإحساس مؤقت في الغالب، ويخفّ حين يخفّ الضغط.',
        en: 'This feeling is usually temporary, and it eases when the pressure eases.',
      },
      {
        ar: 'أستطيع أن ألمس شيئًا حولي وأسمّي ما أراه لأعود إلى اللحظة.',
        en: 'I can touch something around me and name what I see, to come back to this moment.',
      },
    ],
    tool: { label: { ar: 'أعود إلى الحاضر بالحواس', en: 'I come back to the present with my senses' }, to: '/calm' },
  },
];
