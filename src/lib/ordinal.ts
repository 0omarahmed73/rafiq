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
