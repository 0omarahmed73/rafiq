/** ISO 3166-1 alpha-2 codes; labels come from the browser's localized region names. */
const COUNTRY_CODES = [
  'AW', 'AF', 'AO', 'AI', 'AX', 'AL', 'AD', 'AE', 'AR', 'AM', 'AS', 'AQ', 'TF', 'AG', 'AU', 'AT',
  'AZ', 'BI', 'BE', 'BJ', 'BQ', 'BF', 'BD', 'BG', 'BH', 'BS', 'BA', 'BL', 'BY', 'BZ', 'BM', 'BO',
  'BR', 'BB', 'BN', 'BT', 'BV', 'BW', 'CF', 'CA', 'CC', 'CH', 'CL', 'CN', 'CI', 'CM', 'CD', 'CG',
  'CK', 'CO', 'KM', 'CV', 'CR', 'CU', 'CW', 'CX', 'KY', 'CY', 'CZ', 'DE', 'DJ', 'DM', 'DK', 'DO',
  'DZ', 'EC', 'EG', 'ER', 'EH', 'ES', 'EE', 'ET', 'FI', 'FJ', 'FK', 'FR', 'FO', 'FM', 'GA', 'GB',
  'GE', 'GG', 'GH', 'GI', 'GN', 'GP', 'GM', 'GW', 'GQ', 'GR', 'GD', 'GL', 'GT', 'GF', 'GU', 'GY',
  'HK', 'HM', 'HN', 'HR', 'HT', 'HU', 'ID', 'IM', 'IN', 'IO', 'IE', 'IR', 'IQ', 'IS', 'IL', 'IT',
  'JM', 'JE', 'JO', 'JP', 'KZ', 'KE', 'KG', 'KH', 'KI', 'KN', 'KR', 'KW', 'LA', 'LB', 'LR', 'LY',
  'LC', 'LI', 'LK', 'LS', 'LT', 'LU', 'LV', 'MO', 'MF', 'MA', 'MC', 'MD', 'MG', 'MV', 'MX', 'MH',
  'MK', 'ML', 'MT', 'MM', 'ME', 'MN', 'MP', 'MZ', 'MR', 'MS', 'MQ', 'MU', 'MW', 'MY', 'YT', 'NA',
  'NC', 'NE', 'NF', 'NG', 'NI', 'NU', 'NL', 'NO', 'NP', 'NR', 'NZ', 'OM', 'PK', 'PA', 'PN', 'PE',
  'PH', 'PW', 'PG', 'PL', 'PR', 'KP', 'PT', 'PY', 'PS', 'PF', 'QA', 'RE', 'RO', 'RU', 'RW', 'SA',
  'SD', 'SN', 'SG', 'GS', 'SH', 'SJ', 'SB', 'SL', 'SV', 'SM', 'SO', 'PM', 'RS', 'SS', 'ST', 'SR',
  'SK', 'SI', 'SE', 'SZ', 'SX', 'SC', 'SY', 'TC', 'TD', 'TG', 'TH', 'TJ', 'TK', 'TM', 'TL', 'TO',
  'TT', 'TN', 'TR', 'TV', 'TW', 'TZ', 'UG', 'UA', 'UM', 'UY', 'US', 'UZ', 'VA', 'VC', 'VE', 'VG',
  'VI', 'VN', 'VU', 'WF', 'WS', 'YE', 'ZA', 'ZM', 'ZW',
] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

export interface CountryOption {
  code: CountryCode;
  label: string;
}

const HIDDEN_COUNTRY_CODES = new Set<CountryCode>(['IL']);

function localizedCountryName(code: CountryCode, locale: string, names?: Intl.DisplayNames): string {
  if (locale.toLowerCase().startsWith('ar')) {
    if (code === 'PS') return 'فلسطين';
    // Keep an existing local selection from showing Israel after it is removed from the picker.
    if (code === 'IL') return 'بلد غير متاح';
  }
  return names?.of(code) ?? code;
}

function displayNames(locale: string): Intl.DisplayNames | undefined {
  return typeof Intl.DisplayNames === 'undefined' ? undefined : new Intl.DisplayNames([locale], { type: 'region' });
}

export function countryLabel(code: string, locale = 'ar'): string {
  const normalized = code.toUpperCase();
  if (!COUNTRY_CODES.includes(normalized as CountryCode)) return normalized;
  return localizedCountryName(normalized as CountryCode, locale, displayNames(locale));
}

export function countryOptions(locale = 'ar'): CountryOption[] {
  const names = displayNames(locale);
  const collator = new Intl.Collator(locale);
  return COUNTRY_CODES.filter((code) => !HIDDEN_COUNTRY_CODES.has(code))
    .map((code) => ({ code, label: localizedCountryName(code, locale, names) }))
    .sort((a, b) =>
    collator.compare(a.label, b.label),
  );
}
