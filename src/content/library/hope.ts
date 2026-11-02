import type { ReadingPage } from './schema';

/**
 * Draft for therapist review. Claims C9, C10, C11 and C7 of research/borderline/RESEARCH.md, always with their limits.
 * The English is a draft too.
 */
export const hope: ReadingPage = {
  id: 'hope',
  title: { ar: 'الأمل والتعافي', en: 'Hope and recovery' },
  intro: {
    ar: 'ما تقوله الأبحاث بصدق: كثيرون يتحسّنون، والتحسّن يحتاج وقتًا وسندًا. أقرأ الخبر الجيد مع حدوده.',
    en: 'What the research honestly says: many people improve, and improvement takes time and support. I read the good news together with its limits.',
  },
  status: 'draft',
  sourceIds: ['zanarini2006', 'zanarini2010', 'cochrane2020', 'kverme2019', 'nhs'],
  sections: [
    {
      id: 'research',
      heading: { ar: 'ما تقوله الأبحاث', en: 'What the research says' },
      paragraphs: [
        {
          ar: 'تابعت دراسة كبيرة ٢٩٠ شخصًا دخلوا مستشفى بسبب هذا الاضطراب، مدة عشر سنوات. بعد هذه المدة لم يعد ٨٨٪ منهم يستوفون معايير الاضطراب في مرحلة ما.',
          en: 'A large study followed 290 people who were admitted to hospital for this disorder, over ten years. By the end of that time, 88% of them no longer met the criteria for the disorder.',
        },
        {
          ar: 'والمهم أن هذه العيّنة من مرضى دخلوا مستشفى، فلا تعني أن كل شخص سيمرّ بالطريق نفسه.',
          en: 'It matters that this sample was people admitted to hospital, so it does not mean that everyone will follow the same path.',
        },
      ],
    },
    {
      id: 'slower',
      heading: { ar: 'والتعافي الكامل أبطأ', en: 'Full recovery takes longer' },
      paragraphs: [
        {
          ar: 'نحو نصف المشاركين بلغوا ما سمّاه الباحثون «التعافي»: خفّت أعراضهم، ومعها صار عملهم وعلاقاتهم جيّدين. وكان هذا التعافي مستقرًّا نسبيًا بعد أن يتحقّق.',
          en: 'Around half of the participants reached what the researchers called "recovery": their symptoms eased, and with that their work and relationships got better. Once it was reached, this recovery was relatively stable.',
        },
        {
          ar: 'أي أن الأعراض قد تخفّ قبل أن تستقيم الحياة اليومية، وأن ذلك لا يعني فشلًا. الشفاء رحلة ذات مراحل.',
          en: 'In other words, symptoms can ease before everyday life settles, and that does not mean failure. Recovery is a journey with stages.',
        },
      ],
    },
    {
      id: 'help',
      heading: { ar: 'ما الذي يساعد', en: 'What helps' },
      paragraphs: [
        {
          ar: 'العلاج النفسي هو الأساس، وقد يستمر أكثر من سنة. وتشير مراجعة منهجية إلى أن علاجين، أحدهما العلاج السلوكي الجدلي (DBT)، كانا أفضل من الرعاية المعتادة في عدة نتائج، منها إيذاء النفس وشدّة الأعراض.',
          en: 'Psychological therapy is the foundation, and it can continue for more than a year. A systematic review suggests that two treatments, one of them dialectical behaviour therapy (DBT), were better than usual care on several outcomes, including self-harm and how severe the symptoms were.',
        },
        {
          ar: 'لكن جودة الأدلة منخفضة، فهذه نتائج مبشّرة لا وعودًا. لذلك أسأل معالجي عمّا يناسبني أنا.',
          en: 'But the quality of the evidence is low, so these results are encouraging, not promises. That is why I ask my therapist what suits me in particular.',
        },
      ],
    },
    {
      id: 'voices',
      heading: { ar: 'كيف يصف المتعافون الطريق', en: 'How people in recovery describe the way' },
      paragraphs: [
        {
          ar: 'سألت دراسة نرويجية اثنتي عشرة امرأة عن تجربتهن، ووصفن التعافي بأنه «الاقتراب من الناس»: أن يفهمني من حولي ويقبلوني، وأن أشعر أنني جزء من شيء.',
          en: 'A Norwegian study asked twelve women about their experience. They described recovery as "moving closer to people": being understood and accepted by the people around me, and feeling that I belong to something.',
        },
        {
          ar: 'وذكرن أن ما ساعدهن هو معالج يؤمن بقدرتهن على التغيّر، وصدق متبادل، وجماعة يجدن فيها من يشبههن، وأن يُسمح لهن بالتعثّر والتقدّم بسرعتهن.',
          en: 'They also said that what helped them was a therapist who believed they could change, honesty on both sides, a group where they found people like them, and being allowed to stumble and to move forward at their own pace.',
        },
        {
          ar: 'هذه عيّنة صغيرة من بلد واحد، فأقرؤها فكرةً لا قاعدة.',
          en: 'This is a small sample from one country, so I read it as an idea, not a rule.',
        },
      ],
    },
    {
      id: 'setbacks',
      heading: { ar: 'والانتكاسة؟', en: 'What about a setback?' },
      paragraphs: [
        {
          ar: 'قد تعود بعض الأعراض بعد تحسّن. عندها يُنصح بعلاج إضافي، ولا يعني ذلك أنني عدتُ إلى الصفر.',
          en: 'Some symptoms may come back after an improvement. In that case extra treatment is advised, and it does not mean I have gone back to the start.',
        },
        {
          ar: 'أستطيع أن أراجع في رفيق ما ساعدني قبلًا، وأن أتحدث إلى معالجي عن العودة.',
          en: 'In Rafiq I can review what helped me before, and talk with my therapist about the return.',
        },
      ],
    },
  ],
};
