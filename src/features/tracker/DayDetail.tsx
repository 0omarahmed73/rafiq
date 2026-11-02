import { emotionLabel } from '../../content';
import type { Checkin } from '../../db/schema';
import { formatDayLabel, formatTime, type DayKey } from '../../lib/dates';
import { digits, t } from '../../i18n';

/** Every check-in of one day, oldest first, each with its own time, emotions and intensity. */
export function DayDetail({ day, checkins }: { day: DayKey; checkins: Checkin[] }) {
  const entries = checkins.filter((c) => c.day === day).sort((a, b) => a.at.localeCompare(b.at));
  if (entries.length === 0) return null;
  return (
    <section className="flex flex-col gap-2.5 rounded-2xl border border-line bg-card p-4">
      <h2 className="text-[15px] font-bold">{formatDayLabel(day)}</h2>
      <ul aria-label={t({ ar: 'تسجيلات اليوم', en: 'Check-ins of the day' })} className="m-0 flex list-none flex-col gap-2 p-0">
        {entries.map((c) => (
          <li key={c.id} className="flex flex-col gap-1 rounded-xl bg-bg p-3 text-sm">
            <div className="flex items-center justify-between text-muted">
              <span>{formatTime(c.at)}</span>
              <span className="font-bold text-teal-ink">{`${digits(c.intensity)} / ${digits(10)}`}</span>
            </div>
            <div className="font-semibold">{c.emotions.map(emotionLabel).join(t({ ar: '، ', en: ', ' }))}</div>
            {c.note && <p className="leading-7 text-muted">{c.note}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
