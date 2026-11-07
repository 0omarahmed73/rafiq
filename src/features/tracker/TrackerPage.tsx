import { useEffect, useState } from 'react';
import { useRepo } from '../../db/RepoContext';
import type { Checkin } from '../../db/schema';
import { dayKey, formatMonthYear, type DayKey } from '../../lib/dates';
import { DayDetail } from './DayDetail';
import { IntensityCurve } from './IntensityCurve';
import { MonthCalendar } from './MonthCalendar';
import { TopEmotions } from './TopEmotions';
import { t } from '../../i18n';

/** The count of logged days, in the active language (1: يومًا واحدًا, 2: يومين, 3 to 10: أيام, 11+: يومًا). */
function daysPhrase(n: number): string {
  if (n === 1) return t({ ar: 'يومًا واحدًا', en: '1 day' });
  if (n === 2) return t({ ar: 'يومين', en: '2 days' });
  if (n <= 10) return t({ ar: '{count} أيام', en: '{count} days' }, { count: n });
  return t({ ar: '{count} يومًا', en: '{count} days' }, { count: n });
}

const card = 'flex flex-col gap-2.5 rounded-2xl border border-line bg-card p-4';

export function TrackerPage({ today = new Date() }: { today?: Date }) {
  const repo = useRepo();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [selected, setSelected] = useState<DayKey | null>(null);

  useEffect(() => {
    let alive = true;
    void repo.listCheckins({ from: '0000-01-01', to: '9999-12-31' }).then((rows) => alive && setCheckins(rows));
    return () => {
      alive = false;
    };
  }, [repo]);

  const todayKey = dayKey(today);
  const monthPrefix = todayKey.slice(0, 7);

  const maxByDay = new Map<DayKey, number>();
  for (const c of checkins) maxByDay.set(c.day, Math.max(maxByDay.get(c.day) ?? 0, c.intensity));

  const monthMax = new Map([...maxByDay].filter(([d]) => d.startsWith(monthPrefix)));
  const monthCheckins = checkins.filter((c) => c.day.startsWith(monthPrefix));
  const recent = [...maxByDay].sort(([a], [b]) => a.localeCompare(b)).slice(-7).map(([, v]) => v);

  // The chosen day, else today if it has check-ins, else the latest logged day of the month.
  const loggedDays = [...monthMax.keys()].sort();
  const shownDay =
    selected && monthMax.has(selected)
      ? selected
      : monthMax.has(todayKey)
        ? todayKey
        : (loggedDays[loggedDays.length - 1] ?? null);

  const intro =
    monthMax.size === 0
      ? t({ ar: 'أبدأ بتسجيل أول يوم هذا الشهر. كل يوم يُحسب.', en: 'I start by logging the first day of this month. Every day counts.' })
      : t(
          { ar: 'سجّلت {days} هذا الشهر. كل يوم يُحسب.', en: 'I logged {days} this month. Every day counts.' },
          { days: daysPhrase(monthMax.size) },
        );

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="mb-1 text-[28px] font-bold leading-snug">{t({ ar: 'التتبّع', en: 'Tracker' })}</h1>
        <p className="text-sm leading-7 text-muted">{intro}</p>
      </div>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold">{formatMonthYear(todayKey)}</h2>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3.5 w-3.5 rounded bg-shade-light ring-1 ring-line" /> {t({ ar: 'خفيف', en: 'Light' })}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3.5 w-3.5 rounded bg-shade-mid" /> {t({ ar: 'متوسط', en: 'Medium' })}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3.5 w-3.5 rounded bg-shade-strong" /> {t({ ar: 'شديد', en: 'Strong' })}
            </span>
          </div>
        </div>
        <MonthCalendar
          year={today.getFullYear()}
          monthIndex={today.getMonth()}
          maxByDay={monthMax}
          today={todayKey}
          selected={shownDay}
          onSelect={setSelected}
        />
      </section>

      {shownDay && <DayDetail day={shownDay} checkins={monthCheckins} />}

      <section className={card}>
        <h2 className="text-[15px] font-bold">{t({ ar: 'شدّة المشاعر خلال آخر ٧ أيام مسجّلة', en: 'Intensity of my feelings over the last 7 logged days' })}</h2>
        <IntensityCurve values={recent} />
      </section>

      {monthCheckins.length > 0 && (
        <section className={card}>
          <h2 className="text-[15px] font-bold">{t({ ar: 'أكثر المشاعر حضورًا', en: 'Most frequent feelings' })}</h2>
          <TopEmotions checkins={monthCheckins} />
        </section>
      )}
    </div>
  );
}
