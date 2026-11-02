import type { LibrarySource } from './schema';

/**
 * Every claim in the library points to one or more of these. See research/borderline/RESEARCH.md for how each was read.
 * Titles stay in the language the publication was written in; the descriptions and limits are in both languages.
 */
export const sources: LibrarySource[] = [
  {
    id: 'nhs',
    title: 'NHS (UK National Health Service): Borderline personality disorder',
    about: { ar: 'صفحة المعلومات الصحية للخدمة الصحية البريطانية', en: 'Health information page of the UK National Health Service' },
    kind: 'health-service',
    address: 'nhs.uk/mental-health/conditions/borderline-personality-disorder',
  },
  {
    id: 'nimh',
    title: 'NIMH (US National Institute of Mental Health): Borderline personality disorder',
    about: { ar: 'صفحة المعهد الوطني الأمريكي للصحة العقلية', en: 'Page of the US National Institute of Mental Health' },
    kind: 'research-institute',
    address: 'nimh.nih.gov/health/publications/borderline-personality-disorder',
    limit: {
      ar: 'تذكر خط أزمة أمريكيًا؛ أرقام الدعم في رفيق تتبع بلدي.',
      en: 'It names a US crisis line. The support numbers in Rafiq depend on my country.',
    },
  },
  {
    id: 'dsm5tr',
    title: 'APA: DSM-5-TR, borderline personality disorder criteria',
    about: {
      ar: 'المعايير التشخيصية للجمعية الأمريكية للطب النفسي: خمسة من تسعة معايير',
      en: 'Diagnostic criteria of the American Psychiatric Association: five of nine criteria',
    },
    kind: 'manual',
    limit: {
      ar: 'قُرئت المعايير من ملخصات طبية لا من نص الدليل نفسه، وتُراجَع الصياغة الرسمية قبل الاعتماد.',
      en: 'The criteria were read from medical summaries, not from the manual itself. The official wording is checked before it is relied on.',
    },
  },
  {
    id: 'zanarini2006',
    title: 'Zanarini et al., 2006. Prediction of the 10-year course of borderline personality disorder. American Journal of Psychiatry',
    about: { ar: 'متابعة ٢٩٠ مريضًا مدة عشر سنوات', en: 'Ten-year follow-up of 290 patients' },
    kind: 'peer-reviewed',
    address: 'pubmed.ncbi.nlm.nih.gov/16648323',
    limit: {
      ar: 'عيّنة من مرضى دخلوا مستشفى واحدًا، فلا تمثّل كل من يعانون منه.',
      en: 'A sample of patients admitted to one hospital, so it does not represent everyone who has it.',
    },
  },
  {
    id: 'zanarini2010',
    title: 'Zanarini et al., 2010. Time to attainment of recovery from borderline personality disorder and stability of recovery. American Journal of Psychiatry',
    about: {
      ar: 'متابعة المجموعة نفسها لمعرفة التعافي الذي يشمل العمل والعلاقات',
      en: 'Follow-up of the same group, looking at recovery that includes work and relationships',
    },
    kind: 'peer-reviewed',
    address: 'pubmed.ncbi.nlm.nih.gov/20516158',
    limit: { ar: 'قُرئ ملخّص الدراسة لا نصّها الكامل.', en: 'Only the study abstract was read, not the full text.' },
  },
  {
    id: 'cochrane2020',
    title: 'Storebø et al., 2020. Psychological therapies for people with borderline personality disorder. Cochrane Database of Systematic Reviews',
    about: { ar: 'مراجعة منهجية للعلاجات النفسية', en: 'Systematic review of psychological treatments' },
    kind: 'systematic-review',
    address: 'cochranelibrary.com/cdsr/doi/10.1002/14651858.CD012955.pub2/full',
    limit: {
      ar: 'تقدّر جودة الأدلة منخفضة، فالنتائج مبشّرة لكنها ليست قاطعة.',
      en: 'The quality of the evidence is rated low, so the results are encouraging but not conclusive.',
    },
  },
  {
    id: 'kverme2019',
    title: 'Kverme et al., 2019. Moving toward connectedness: a qualitative study of recovery processes for people with borderline personality disorder. Frontiers in Psychology',
    about: { ar: 'مقابلات مع اثنتي عشرة امرأة عن تجربة التعافي', en: 'Interviews with twelve women about their experience of recovery' },
    kind: 'peer-reviewed',
    address: 'pmc.ncbi.nlm.nih.gov/articles/PMC6403141',
    limit: { ar: 'عيّنة صغيرة، كلها نساء، من بلد واحد.', en: 'A small sample, all women, from one country.' },
  },
];

export const sourceById = (id: string) => sources.find((s) => s.id === id);
