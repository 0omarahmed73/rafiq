import type { Step } from './schema';

// Lessons for steps 4 to 10 are the callouts of docs/content/steps-4-10.html.
// The English is a draft for therapist review.
export const steps: Step[] = [
  {
    id: 1,
    title: { ar: 'تصديق المشاعر', en: 'Validating feelings' },
    coreQuestion: { ar: 'هل مشاعري مشروعة حتى لو كانت مؤلمة؟', en: 'Are my feelings valid, even when they hurt?' },
    lesson: {
      ar: 'تصديق المشاعر يعني أن أعترف بأن ما أشعر به مفهوم ومشروع، حتى لو لم يعجبني.',
      en: 'Validating a feeling means admitting that what I feel makes sense and is legitimate, even if I do not like it.',
    },
  },
  {
    id: 2,
    title: { ar: 'تقبّل الذات', en: 'Self-acceptance' },
    coreQuestion: {
      ar: 'هل أستطيع أن أكون مع نفسي كما أنا اليوم، دون أن أحاربها؟',
      en: 'Can I be with myself as I am today, without fighting myself?',
    },
    lesson: {
      ar: 'التقبّل لا يعني الاستسلام ولا الرضا عن كل شيء. يعني أن تتوقف عن إنفاق طاقتك في محاربة ما هو موجود فعلًا، لتجد مساحة تتغيّر فيها بلطف.',
      en: 'Acceptance does not mean giving up or being content with everything. It means I stop spending my energy fighting what is already here, so that I have room to change gently.',
    },
  },
  {
    id: 3,
    title: { ar: 'تنظيم الذات', en: 'Self-regulation' },
    coreQuestion: { ar: 'كيف أهدّئ نفسي وأوجّه انفعالي؟', en: 'How do I calm myself and guide my reactions?' },
    lesson: {
      ar: 'التنظيم لا يعني كبت الشعور. يعني أن أنتبه له وأختار تصرفي، بدل أن ينفعل هو عني.',
      en: 'Regulation does not mean suppressing a feeling. It means noticing it and choosing my action, instead of letting the feeling act for me.',
    },
  },
  {
    id: 4,
    title: { ar: 'فهم الذات', en: 'Self-understanding' },
    coreQuestion: {
      ar: 'ما الذي أحتاج إلى فهمه حقًا عن نفسي في هذه المشكلة؟',
      en: 'What do I really need to understand about myself in this problem?',
    },
    lesson: {
      ar: 'أقرأ قصتي بصدق، وألاحظ النمط الذي أكرره، وأفهم ما كان ينقصني حين حاولتُ التغيير. أبدأ بالتقبّل، وأترك مساحة للتغيير دون جلد للذات.',
      en: 'I read my story honestly, notice the pattern I keep repeating, and understand what was missing when I tried to change. I start with acceptance, and leave room for change without punishing myself.',
    },
  },
  {
    id: 5,
    title: { ar: 'التعاطف مع الذات', en: 'Self-compassion' },
    coreQuestion: { ar: 'كيف أخاطب نفسي حين أخطئ؟', en: 'How do I speak to myself when I make a mistake?' },
    lesson: {
      ar: 'للتعاطف مع الذات ثلاثة أجزاء: أن أنتبه لألمي دون تضخيم، وأن أتذكّر أنه تجربة إنسانية مشتركة، وأن أعامل نفسي بلطف بدل القسوة.',
      en: 'Self-compassion has three parts: noticing my pain without exaggerating it, remembering that suffering is a shared human experience, and treating myself kindly instead of harshly.',
    },
  },
  {
    id: 6,
    title: { ar: 'مسامحة الذات', en: 'Self-forgiveness' },
    coreQuestion: { ar: 'كيف أتحرر من الذنب والعار عن الماضي؟', en: 'How do I free myself from guilt and shame about the past?' },
    lesson: {
      ar: 'الذنب يقول «فعلتُ شيئًا خاطئًا» ويدفع إلى الإصلاح. العار يقول «أنا سيّئ» ويدفع إلى الانهيار. نعمل هنا مع الأول، ونخفّف الثاني.',
      en: 'Guilt says "I did something wrong", and it pushes me to repair it. Shame says "I am bad", and it pushes me to collapse. Here we work with the first and ease the second.',
    },
  },
  {
    id: 7,
    title: { ar: 'الحدود واحترام الذات', en: 'Boundaries and self-respect' },
    coreQuestion: {
      ar: 'ما الذي أقبله من الآخرين وما الذي لا أقبله؟',
      en: 'What do I accept from others, and what do I not accept?',
    },
    lesson: {
      ar: 'الحدّ ليس عقابًا للآخر. هو وصف لما أفعله أنا لحماية احتياجي، لا محاولة للتحكّم في تصرّفه.',
      en: 'A boundary is not a punishment for the other person. It describes what I will do to protect my need, not an attempt to control what they do.',
    },
  },
  {
    id: 8,
    title: { ar: 'الثقة بالنفس', en: 'Self-trust' },
    coreQuestion: { ar: 'هل أستطيع أن أفي بوعودي لنفسي؟', en: 'Can I keep the promises I make to myself?' },
    lesson: {
      ar: 'الثقة بالنفس لا تأتي من الشعور بل من الدليل. كل وعد صغير أفي به دليل جديد على أنني أستطيع الاعتماد على نفسي.',
      en: 'Trust in myself does not come from a feeling but from evidence. Every small promise I keep is new evidence that I can rely on myself.',
    },
  },
  {
    id: 9,
    title: { ar: 'العناية والعادات', en: 'Care and habits' },
    coreQuestion: { ar: 'ما الروتين الذي يبقيني ثابتًا؟', en: 'Which routine keeps me steady?' },
    lesson: {
      ar: 'العادة الصغيرة المستمرة أنفع من خطة كبيرة تنهار بعد أيام. نبدأ بواحدة فقط.',
      en: 'A small habit that continues is more useful than a big plan that collapses after a few days. We start with just one.',
    },
  },
  {
    id: 10,
    title: { ar: 'القيم والاتجاه', en: 'Values and direction' },
    coreQuestion: { ar: 'من أريد أن أصبح، وما الذي يهمّني حقًا؟', en: 'Who do I want to become, and what really matters to me?' },
    lesson: {
      ar: 'القيم ليست أهدافًا تُنجَز، بل اتجاه نمشي فيه. وكثيرًا ما يدلّنا الألم على قيمة نهتمّ بها.',
      en: 'Values are not goals to finish, but a direction to walk in. Pain often points us to a value we care about.',
    },
  },
];
