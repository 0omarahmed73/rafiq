import { useEffect, useState } from 'react';
import { useRepo } from '../../db/RepoContext';
import type { Checkin } from '../../db/schema';
import { dayKey, formatArabicMonthYear, type DayKey } from '../../lib/dates';
import { toArabicDigits } from '../../lib/digits';
import { IntensityCurve } from './IntensityCurve';
import { MonthCalendar } from './MonthCalendar';
import { TopEmotions } from './TopEmotions';

/** Arabic count phrase for a number of days (1: يومًا واحدًا, 2: يومين, 3 to 10: أيام, 11+: يومًا). */
function daysPhrase(n: number): string {
  if (n === 1) return 'يومًا واحدًا';
  if (n === 2) return 'يومين';
  if (n <= 10) return `${toArabicDigits(n)} أيام`;
  return `${toArabicDigits(n)} يومًا`;
}

const card = 'flex flex-col gap-2.5 rounded-2xl border border-line bg-card p-4';

export function TrackerPage({ today = new Date() }: { today?: Date }) {
  const repo = useRepo();
  const [checkins, setCheckins] = useState<Checkin[]>([]);

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

  const intro =
    monthMax.size === 0
      ? 'ابدأ بتسجيل أول يوم هذا الشهر. كل يوم يُحسب.'
      : `سجّلت ${daysPhrase(monthMax.size)} هذا الشهر. كل يوم يُحسب.`;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="mb-1 text-[28px] font-bold leading-snug">التتبّع</h1>
        <p className="text-sm leading-7 text-muted">{intro}</p>
      </div>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold">{formatArabicMonthYear(todayKey)}</h2>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3.5 w-3.5 rounded bg-shade-light ring-1 ring-line" /> خفيف
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3.5 w-3.5 rounded bg-shade-mid" /> متوسط
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3.5 w-3.5 rounded bg-shade-strong" /> شديد
            </span>
          </div>
        </div>
        <MonthCalendar
          year={today.getFullYear()}
          monthIndex={today.getMonth()}
          maxByDay={monthMax}
          today={todayKey}
        />
      </section>

      <section className={card}>
        <h2 className="text-[15px] font-bold">شدّة المشاعر خلال آخر ٧ أيام مسجّلة</h2>
        <IntensityCurve values={recent} />
      </section>

      {monthCheckins.length > 0 && (
        <section className={card}>
          <h2 className="text-[15px] font-bold">أكثر المشاعر حضورًا</h2>
          <TopEmotions checkins={monthCheckins} />
        </section>
      )}
    </div>
  );
}
