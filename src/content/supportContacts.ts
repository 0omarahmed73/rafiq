/**
 * Country contacts are bundled so the Egypt fallback works without a network connection.
 * Egypt contacts and wording checked 2026-11-01 against the cited government sources.
 */
export const SUPPORT_DIRECTORY = {
  label: 'دليل دولي للعثور على خط مساعدة في بلدي',
  url: 'https://www.iasp.info/crisis-centres-helplines/',
  source: 'الجمعية الدولية لمنع الانتحار (IASP)',
} as const;

export const EGYPT_SUPPORT = {
  countryCode: 'EG',
  countryName: 'مصر',
  checkedOn: '2026-11-01',
  contacts: [
    {
      kind: 'mental-health',
      label: 'الخط الساخن للصحة النفسية والدعم النفسي',
      number: '16328',
      note: 'دعم نفسي على مدار الساعة، ويمكن التواصل عند ورود أفكار انتحارية.',
      source: 'هيئة الاستعلامات المصرية',
      sourceUrl: 'https://sis.gov.eg/en/media-center/news/egypt-prioritizes-mental-health-support-expands-services-nationwide/',
    },
    {
      kind: 'ambulance',
      label: 'الإسعاف',
      number: '123',
      note: 'الخط الساخن لخدمات الإسعاف.',
      source: 'هيئة الإسعاف المصرية عبر هيئة الاستعلامات المصرية',
      sourceUrl: 'https://sis.gov.eg/en/media-center/news/pm-inaugurates-new-hq-of-egyptian-ambulance-organization/',
    },
    {
      kind: 'police',
      label: 'الشرطة',
      number: '122',
      note: 'رقم الطوارئ للشرطة.',
      source: 'وزارة الداخلية المصرية',
      sourceUrl: 'https://www.moi.gov.eg/home/EmergancyNumber',
    },
  ],
} as const;

export function supportForCountry(countryCode?: string) {
  const normalized = countryCode?.toUpperCase();
  return !normalized || normalized === 'EG' ? EGYPT_SUPPORT : undefined;
}
