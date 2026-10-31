import type { Homework } from '../../db/schema';
import { toArabicDigits } from '../../lib/digits';

/** The status shown on a homework card: finished, answered, or not answered yet. */
export function homeworkStatus(h: Homework): string {
  if (h.done) return 'أنجزتُ';
  return h.answer?.trim() ? 'أجبتُ' : 'بلا إجابة';
}

export function photosLabel(n: number): string {
  if (n === 1) return 'صورة واحدة';
  if (n === 2) return 'صورتان';
  return `${toArabicDigits(n)} صور`;
}
