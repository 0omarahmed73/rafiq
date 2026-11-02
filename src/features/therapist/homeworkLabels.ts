import type { Homework } from '../../db/schema';
import { t } from '../../i18n';

/** The status shown on a homework card: finished, answered, or not answered yet. */
export function homeworkStatus(h: Homework): string {
  if (h.done) return t({ ar: 'أنجزتُ', en: 'Done' });
  return h.answer?.trim() ? t({ ar: 'أجبتُ', en: 'Answered' }) : t({ ar: 'بلا إجابة', en: 'No answer yet' });
}

export function photosLabel(n: number): string {
  if (n === 1) return t({ ar: 'صورة واحدة', en: '1 photo' });
  if (n === 2) return t({ ar: 'صورتان', en: '2 photos' });
  return t({ ar: '{count} صور', en: '{count} photos' }, { count: n });
}
