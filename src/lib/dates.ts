import { toArabicDigits } from './digits';

/** `YYYY-MM-DD` in the user's local time zone. */
export type DayKey = string;

const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const pad = (n: number) => String(n).padStart(2, '0');

function parseKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dayKey(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(key: DayKey, n: number): DayKey {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** The Saturday that starts the week containing `d` (the Arabic week starts on Saturday). */
export function weekStartSaturday(d: Date): DayKey {
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  day.setDate(day.getDate() - ((day.getDay() + 1) % 7));
  return dayKey(day);
}

export function formatArabicMonthYear(key: DayKey): string {
  const d = parseKey(key);
  return `${MONTHS[d.getMonth()]} ${toArabicDigits(d.getFullYear())}`;
}

export function formatArabicDate(key: DayKey): string {
  const d = parseKey(key);
  return `${WEEKDAYS[d.getDay()]} ${toArabicDigits(d.getDate())} ${MONTHS[d.getMonth()]}`;
}
