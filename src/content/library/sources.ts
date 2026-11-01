import type { LibrarySource } from './schema';

/** Every claim in the library points to one or more of these. See research/borderline/RESEARCH.md for how each was read. */
export const sources: LibrarySource[] = [
  {
    id: 'nhs',
    title: 'NHS (UK National Health Service): Borderline personality disorder',
    about: 'صفحة المعلومات الصحية للخدمة الصحية البريطانية',
    kind: 'health-service',
    address: 'nhs.uk/mental-health/conditions/borderline-personality-disorder',
  },
  {
    id: 'nimh',
    title: 'NIMH (US National Institute of Mental Health): Borderline personality disorder',
    about: 'صفحة المعهد الوطني الأمريكي للصحة العقلية',
    kind: 'research-institute',
    address: 'nimh.nih.gov/health/publications/borderline-personality-disorder',
    limit: 'تذكر خط أزمة أمريكيًا؛ أرقام الدعم في رفيق تتبع بلدي.',
  },
  {
    id: 'dsm5tr',
    title: 'APA: DSM-5-TR, borderline personality disorder criteria',
    about: 'المعايير التشخيصية للجمعية الأمريكية للطب النفسي: خمسة من تسعة معايير',
    kind: 'manual',
    limit: 'قُرئت المعايير من ملخصات طبية لا من نص الدليل نفسه، وتُراجَع الصياغة الرسمية قبل الاعتماد.',
  },
  {
    id: 'zanarini2006',
    title: 'Zanarini et al., 2006. Prediction of the 10-year course of borderline personality disorder. American Journal of Psychiatry',
    about: 'متابعة ٢٩٠ مريضًا مدة عشر سنوات',
    kind: 'peer-reviewed',
    address: 'pubmed.ncbi.nlm.nih.gov/16648323',
    limit: 'عيّنة من مرضى دخلوا مستشفى واحدًا، فلا تمثّل كل من يعانون منه.',
  },
  {
    id: 'zanarini2010',
    title: 'Zanarini et al., 2010. Time to attainment of recovery from borderline personality disorder and stability of recovery. American Journal of Psychiatry',
    about: 'متابعة المجموعة نفسها لمعرفة التعافي الذي يشمل العمل والعلاقات',
    kind: 'peer-reviewed',
    address: 'pubmed.ncbi.nlm.nih.gov/20516158',
    limit: 'قُرئ ملخّص الدراسة لا نصّها الكامل.',
  },
  {
    id: 'cochrane2020',
    title: 'Storebø et al., 2020. Psychological therapies for people with borderline personality disorder. Cochrane Database of Systematic Reviews',
    about: 'مراجعة منهجية للعلاجات النفسية',
    kind: 'systematic-review',
    address: 'cochranelibrary.com/cdsr/doi/10.1002/14651858.CD012955.pub2/full',
    limit: 'تقدّر جودة الأدلة منخفضة، فالنتائج مبشّرة لكنها ليست قاطعة.',
  },
  {
    id: 'kverme2019',
    title: 'Kverme et al., 2019. Moving toward connectedness: a qualitative study of recovery processes for people with borderline personality disorder. Frontiers in Psychology',
    about: 'مقابلات مع اثنتي عشرة امرأة عن تجربة التعافي',
    kind: 'peer-reviewed',
    address: 'pmc.ncbi.nlm.nih.gov/articles/PMC6403141',
    limit: 'عيّنة صغيرة، كلها نساء، من بلد واحد.',
  },
];

export const sourceById = (id: string) => sources.find((s) => s.id === id);
