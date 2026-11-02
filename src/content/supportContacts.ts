import type { Bi } from '../i18n';

/**
 * Country contacts are bundled so the Egypt fallback works without a network connection.
 * Egypt contacts and wording checked 2026-11-01 against the cited government sources.
 * Only numbers in this file are shown; none is written anywhere else.
 */
export const SUPPORT_DIRECTORY = {
  label: {
    ar: 'دليل دولي للعثور على خط مساعدة في بلدي',
    en: 'International directory to find a helpline in my country',
  } satisfies Bi,
  url: 'https://www.iasp.info/crisis-centres-helplines/',
  source: { ar: 'الجمعية الدولية لمنع الانتحار (IASP)', en: 'International Association for Suicide Prevention (IASP)' } satisfies Bi,
} as const;

export const EGYPT_SUPPORT = {
  countryCode: 'EG',
  countryName: { ar: 'مصر', en: 'Egypt' } satisfies Bi,
  checkedOn: '2026-11-01',
  contacts: [
    {
      kind: 'mental-health',
      label: {
        ar: 'الخط الساخن للصحة النفسية والدعم النفسي',
        en: 'Mental health and psychological support hotline',
      } satisfies Bi,
      number: '16328',
      note: {
        ar: 'دعم نفسي على مدار الساعة، ويمكن التواصل عند ورود أفكار انتحارية.',
        en: '24-hour psychological support. You can call when suicidal thoughts come up.',
      } satisfies Bi,
      source: { ar: 'هيئة الاستعلامات المصرية', en: 'Egyptian State Information Service' } satisfies Bi,
      sourceUrl: 'https://sis.gov.eg/en/media-center/news/egypt-prioritizes-mental-health-support-expands-services-nationwide/',
    },
    {
      kind: 'ambulance',
      label: { ar: 'الإسعاف', en: 'Ambulance' } satisfies Bi,
      number: '123',
      note: { ar: 'الخط الساخن لخدمات الإسعاف.', en: 'Hotline for ambulance services.' } satisfies Bi,
      source: {
        ar: 'هيئة الإسعاف المصرية عبر هيئة الاستعلامات المصرية',
        en: 'Egyptian Ambulance Organization, via the Egyptian State Information Service',
      } satisfies Bi,
      sourceUrl: 'https://sis.gov.eg/en/media-center/news/pm-inaugurates-new-hq-of-egyptian-ambulance-organization/',
    },
    {
      kind: 'police',
      label: { ar: 'الشرطة', en: 'Police' } satisfies Bi,
      number: '122',
      note: { ar: 'رقم الطوارئ للشرطة.', en: 'Police emergency number.' } satisfies Bi,
      source: { ar: 'وزارة الداخلية المصرية', en: 'Egyptian Ministry of Interior' } satisfies Bi,
      sourceUrl: 'https://www.moi.gov.eg/home/EmergancyNumber',
    },
  ],
} as const;

export function supportForCountry(countryCode?: string) {
  const normalized = countryCode?.toUpperCase();
  return !normalized || normalized === 'EG' ? EGYPT_SUPPORT : undefined;
}
