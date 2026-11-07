import { currentLanguage, t, type Bi } from '../i18n';
import { toArabicDigits } from './digits';

/** `YYYY-MM-DD` in the user's local time zone. */
export type DayKey = string;

const WEEKDAYS: Bi[] = [
  { ar: 'الأحد', en: 'Sunday' },
  { ar: 'الاثنين', en: 'Monday' },
  { ar: 'الثلاثاء', en: 'Tuesday' },
  { ar: 'الأربعاء', en: 'Wednesday' },
  { ar: 'الخميس', en: 'Thursday' },
  { ar: 'الجمعة', en: 'Friday' },
  { ar: 'السبت', en: 'Saturday' },
];
const MONTHS: Bi[] = [
  { ar: 'يناير', en: 'January' },
  { ar: 'فبراير', en: 'February' },
  { ar: 'مارس', en: 'March' },
  { ar: 'أبريل', en: 'April' },
  { ar: 'مايو', en: 'May' },
  { ar: 'يونيو', en: 'June' },
  { ar: 'يوليو', en: 'July' },
  { ar: 'أغسطس', en: 'August' },
  { ar: 'سبتمبر', en: 'September' },
  { ar: 'أكتوبر', en: 'October' },
  { ar: 'نوفمبر', en: 'November' },
  { ar: 'ديسمبر', en: 'December' },
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

/** Local time of an ISO timestamp as `HH:MM`, in the digits of the active language. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return currentLanguage() === 'ar' ? toArabicDigits(`${hours}:${minutes}`) : `${hours}:${minutes}`;
}

export function formatMonthYear(key: DayKey): string {
  const d = parseKey(key);
  return t({ ar: '{month} {year}', en: '{month} {year}' }, { month: t(MONTHS[d.getMonth()]), year: d.getFullYear() });
}

/** `31 October 2026` (Arabic: `٣١ أكتوبر ٢٠٢٦`): no hyphens, which right-to-left text would reorder. */
export function formatFullDate(key: DayKey): string {
  const d = parseKey(key);
  return t(
    { ar: '{day} {month} {year}', en: '{day} {month} {year}' },
    { day: d.getDate(), month: t(MONTHS[d.getMonth()]), year: d.getFullYear() },
  );
}

/** `Sunday, 31 October` (Arabic: `الأحد ٣١ أكتوبر`). */
export function formatDayLabel(key: DayKey): string {
  const d = parseKey(key);
  return t(
    { ar: '{weekday} {day} {month}', en: '{weekday}, {day} {month}' },
    { weekday: t(WEEKDAYS[d.getDay()]), day: d.getDate(), month: t(MONTHS[d.getMonth()]) },
  );
}
