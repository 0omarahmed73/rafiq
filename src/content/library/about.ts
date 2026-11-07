import type { ReadingPage } from './schema';

/**
 * Draft for therapist review. Every statement maps to claims C1–C6 and C8 in research/borderline/RESEARCH.md.
 * The English is a draft too.
 */
export const about: ReadingPage = {
  id: 'about',
  title: { ar: 'ما هو اضطراب الشخصية الحدّية؟', en: 'What is borderline personality disorder?' },
  intro: {
    ar: 'اضطراب نفسي يؤثّر في طريقة شعوري وفي علاقتي بالناس. أقرأ هنا بهدوء، دون أن يكون هذا تشخيصًا لي أو لأحد.',
    en: 'A mental health condition that affects how I feel and how I relate to people. I read this calmly. It is not a diagnosis for me or for anyone.',
  },
  status: 'draft',
  sourceIds: ['nhs', 'nimh', 'dsm5tr'],
  sections: [
    {
      id: 'what',
      heading: { ar: 'في جملة واحدة', en: 'In one sentence' },
      paragraphs: [
        {
          ar: 'هو نمط من عدم الاستقرار في المشاعر، وفي صورة الإنسان عن نفسه، وفي علاقاته بالآخرين. يبدأ عادةً في المراهقة ويمتد إلى البلوغ، وقد يكون خفيفًا وقد يكون شديدًا.',
          en: 'It is a pattern of instability in emotions, in how a person sees themselves, and in their relationships with others. It usually starts in adolescence and continues into adulthood, and it can be mild or severe.',
        },
        {
          ar: 'ليس كل من يمرّ به يعيش كل أعراضه. الشدّة والتكرار والمدّة تختلف من شخص إلى آخر.',
          en: 'Not everyone who has it experiences every symptom. How intense, how frequent and how long the symptoms are differs from person to person.',
        },
      ],
    },
    {
      id: 'areas',
      heading: { ar: 'أربعة مجالات يظهر فيها', en: 'Four areas where it shows' },
      paragraphs: [
        {
          ar: 'المشاعر: تتقلّب بسرعة وبقوة، وتصعب تهدئتها.',
          en: 'Emotions: they shift quickly and strongly, and they are hard to calm.',
        },
        {
          ar: 'الأفكار والإدراك: قد تتشوّش تحت الضغط، فأشعر بالانفصال عن نفسي أو أشكّ في نوايا الناس.',
          en: 'Thinking and perception: they can become confused under pressure, so I may feel disconnected from myself or doubt people\'s intentions.',
        },
        {
          ar: 'التصرّفات: أتحرّك أحيانًا باندفاع لأتخلّص من شعور ثقيل.',
          en: 'Actions: sometimes I act on impulse to get rid of a heavy feeling.',
        },
        {
          ar: 'العلاقات: قوية جدًا لكنها غير مستقرة، وقريبة ثم بعيدة.',
          en: 'Relationships: very intense but unstable, close and then distant.',
        },
      ],
    },
    {
      id: 'causes',
      heading: { ar: 'من أين يأتي؟', en: 'Where does it come from?' },
      paragraphs: [
        {
          ar: 'الأسباب ليست معروفة بالكامل. يبدو أنها مزيج من عوامل وراثية وعوامل في البيئة.',
          en: 'The causes are not fully known. They appear to be a mix of genetic and environmental factors.',
        },
        {
          ar: 'كثير ممّن يعانون منه عاشوا في طفولتهم صدمة أو إهمالًا أو علاقات لا تعترف بمشاعرهم، لكن ليس كلهم. ووجود هذه العوامل لا يعني أن الاضطراب سيحدث.',
          en: 'Many people who have it lived through trauma, neglect, or relationships in childhood that did not acknowledge their feelings, but not all of them did. Having these factors does not mean the disorder will develop.',
        },
        {
          ar: 'وجوده لا يعني أن في شخصيتي عيبًا، ولا يحكم على قيمتي.',
          en: 'Having it does not mean there is something wrong with my character, and it does not judge my worth.',
        },
      ],
    },
    {
      id: 'diagnosis',
      heading: { ar: 'من يشخّصه؟', en: 'Who diagnoses it?' },
      paragraphs: [
        {
          ar: 'لا يشخّصه إلا مختص مدرَّب، بعد حديث عن الأعراض وتاريخي الشخصي والعائلي. يُشخَّص غالبًا في أواخر المراهقة أو بداية الرشد.',
          en: 'Only a trained professional can diagnose it, after talking about symptoms and my personal and family history. It is often diagnosed in late adolescence or early adulthood.',
        },
        {
          ar: 'التشخيص يحتاج إلى خمسة على الأقل من تسعة معايير. قراءة هذه الصفحة لا تغني عنه.',
          en: 'A diagnosis needs at least five of nine criteria. Reading this page does not replace it.',
        },
      ],
    },
    {
      id: 'treatment',
      heading: { ar: 'هل له علاج؟', en: 'Is there treatment?' },
      paragraphs: [
        {
          ar: 'نعم. العلاج النفسي هو الأساس، ومنه علاج صُمّم خصيصًا لهذا الاضطراب يسمّى العلاج السلوكي الجدلي (DBT). الأدوية ليست خيارًا أول، وقد يضيفها الطبيب لأعراض محددة.',
          en: 'Yes. Psychological therapy is the foundation, and it includes a treatment designed specifically for this condition, called dialectical behaviour therapy (DBT). Medication is not the first choice; a doctor may add it for specific symptoms.',
        },
        {
          ar: 'قد يستمر العلاج أكثر من سنة. وكثيرون يتحسّنون مع الوقت. أقرأ المزيد في صفحة «الأمل والتعافي».',
          en: 'Treatment can last more than a year. Many people improve over time. I can read more on the "Hope and recovery" page.',
        },
      ],
    },
    {
      id: 'now',
      heading: { ar: 'وماذا أفعل الآن؟', en: 'What do I do now?' },
      paragraphs: [
        {
          ar: 'إن شعرتُ أن هذه الأوصاف تشبهني، أحمل ما قرأتُه إلى مختص وأتحدث معه. وأستطيع أن أكتب ما يزعجني في رفيق وأعطيه ملخّصًا لمعالجي.',
          en: 'If these descriptions feel like me, I take what I have read to a professional and talk with them. I can write down what bothers me in Rafiq and give my therapist a summary.',
        },
        {
          ar: 'وإن شعرتُ بأنني قد أكون في خطر، أفتح «أحتاج تهدئة» وأتواصل فورًا مع خدمات الطوارئ أو مع شخص أثق به.',
          en: 'If I feel I might be in danger, I open "I need calm now" and contact emergency services or someone I trust straight away.',
        },
      ],
    },
  ],
};
