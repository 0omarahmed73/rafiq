import { emotionLabel } from '../../content';
import { practiceById } from '../../content/practices';
import type { Repo } from '../../db/repo';
import { dayKey, type DayKey } from '../../lib/dates';
import { toArabicDigits } from '../../lib/digits';

export interface AgendaItem {
  kind: 'checkin' | 'practice' | 'point';
  id: string;
  day: DayKey;
  label: string;
  /** Sort key (ISO time), newest first. */
  at: string;
}

/**
 * What the user wants to discuss at the next session: check-ins and practices flagged for it,
 * plus open agenda points, all dated after the latest session (everything when there is none).
 */
export async function agendaItems(repo: Repo): Promise<AgendaItem[]> {
  const sessions = await repo.listSessions();
  const since = sessions[0]?.date ?? '';
  const after = (day: DayKey) => day > since;
  const items: AgendaItem[] = [];

  const checkins = await repo.listCheckins({ from: '0000-01-01', to: '9999-12-31' });
  for (const c of checkins) {
    if (!c.forNextSession || !after(c.day)) continue;
    items.push({
      kind: 'checkin',
      id: c.id,
      day: c.day,
      at: c.at,
      label: `${c.emotions.map(emotionLabel).join('، ')} · ${toArabicDigits(c.intensity)} / ${toArabicDigits(10)}`,
    });
  }

  for (const p of await repo.listPractices()) {
    if (!p.forNextSession || !p.completedAt) continue;
    const day = dayKey(new Date(p.completedAt));
    if (!after(day)) continue;
    items.push({
      kind: 'practice',
      id: p.id,
      day,
      at: p.completedAt,
      label: practiceById(p.practiceId)?.title ?? p.practiceId,
    });
  }

  for (const point of await repo.listAgendaPoints()) {
    if (point.done || !after(point.day)) continue;
    items.push({ kind: 'point', id: point.id, day: point.day, at: `${point.day}T23:59:59.999Z`, label: point.text });
  }

  return items.sort((a, b) => b.at.localeCompare(a.at));
}
