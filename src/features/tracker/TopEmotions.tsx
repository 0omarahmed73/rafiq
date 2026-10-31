import { emotionLabel } from '../../content';
import type { Checkin } from '../../db/schema';
import { toArabicDigits } from '../../lib/digits';

export function topEmotions(checkins: Checkin[], limit = 3): { id: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of checkins) for (const e of c.emotions) counts.set(e, (counts.get(e) ?? 0) + 1);
  return [...counts]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function TopEmotions({ checkins }: { checkins: Checkin[] }) {
  const top = topEmotions(checkins);
  if (top.length === 0) return null;
  const max = top[0].count;
  return (
    <ul aria-label="أكثر المشاعر حضورًا" className="m-0 flex list-none flex-col gap-2.5 p-0">
      {top.map((e) => (
        <li key={e.id} className="flex items-center gap-2.5 text-sm">
          <span className="w-16 shrink-0">{emotionLabel(e.id)}</span>
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-line">
            <span
              className="block h-full rounded-full bg-shade-strong"
              style={{ width: `${(e.count / max) * 100}%` }}
            />
          </span>
          <span className="w-5 text-end text-muted">{toArabicDigits(e.count)}</span>
        </li>
      ))}
    </ul>
  );
}
