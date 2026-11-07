import { currentLanguage } from '../i18n';
import { toArabicDigits } from './digits';

const ONES = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع'];
const TENS = ['', 'العاشر', 'العشرون', 'الثلاثون', 'الأربعون', 'الخمسون', 'الستون', 'السبعون', 'الثمانون', 'التسعون'];
// The unit as it is said before عشر or before a tens word: «الحادي عشر», «الحادي والعشرون».
const TEEN_ONES = ['', 'الحادي', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع'];

/** Masculine ordinal for 1–99 («الخامس والعشرون»); other numbers come back as Arabic-Indic digits. */
export function ordinalAr(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 99) return toArabicDigits(n);
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (tens === 0) return ONES[ones];
  if (ones === 0) return TENS[tens];
  if (tens === 1) return `${TEEN_ONES[ones]} عشر`;
  return `${TEEN_ONES[ones]} و${TENS[tens]}`;
}

/** `25th` in English; the Arabic ordinal in Arabic. Numbers outside 1–99 are plain digits in English. */
export function ordinal(n: number): string {
  if (currentLanguage() === 'ar') return ordinalAr(n);
  if (!Number.isInteger(n) || n < 1) return String(n);
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${suffix}`;
}
