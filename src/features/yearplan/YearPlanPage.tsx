import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { YEAR_GOALS, YEAR_MONTHS, YEAR_REVIEW_QUESTIONS, YEAR_VISION } from '../../content/yearPlan';
import { useRepo } from '../../db/RepoContext';
import { toArabicDigits } from '../../lib/digits';
import {
  DEFAULT_AGE,
  DEFAULT_START,
  goalKey,
  monthLabel,
  monthPercent,
  noteKey,
  overall,
  planTitle,
  reviewKey,
  taskKey,
  toMap,
  type PlanMap,
} from './progress';

const field =
  'min-h-24 w-full rounded-xl border-[1.5px] border-line bg-card p-3 text-[15px] leading-7 text-ink';

function Check({ label, checked, onChange, ariaLabel }: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <label className="flex min-h-11 items-start gap-3 py-1.5 text-[15px] leading-7">
      <input
        type="checkbox"
        aria-label={ariaLabel ?? label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="plan-check"
      />
      <span className={checked ? 'text-muted line-through' : ''}>{label}</span>
    </label>
  );
}

export function YearPlanPage() {
  const repo = useRepo();
  const [map, setMap] = useState<PlanMap>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [age, setAge] = useState<number | undefined>(DEFAULT_AGE);
  const [start, setStart] = useState(DEFAULT_START);

  useEffect(() => {
    let alive = true;
    void Promise.all([repo.listYearPlan(), repo.getSettings()]).then(([rows, settings]) => {
      if (!alive) return;
      setMap(toMap(rows));
      setAge(settings.planAge ?? DEFAULT_AGE);
      setStart(settings.planStart ?? DEFAULT_START);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [repo]);

  const set = useCallback(
    (id: string, value: boolean | string) => {
      setMap((m) => new Map(m).set(id, value));
      void repo.saveYearPlanEntry({ id, value });
    },
    [repo],
  );

  async function saveSetting(patch: { planAge?: number; planStart?: string }) {
    const { updatedAt: _u, ...current } = await repo.getSettings();
    await repo.saveSettings({ ...current, ...patch });
  }
  const changeAge = (raw: string) => {
    const n = Number(raw);
    setAge(raw === '' ? undefined : n);
    if (Number.isInteger(n) && n >= 1 && n <= 99) void saveSetting({ planAge: n });
  };
  const changeStart = (value: string) => {
    setStart(value);
    if (/^\d{4}-\d{2}$/.test(value)) void saveSetting({ planStart: value });
  };

  if (!loaded) return null;
  const startOk = /^\d{4}-\d{2}$/.test(start);
  const first = startOk ? start : DEFAULT_START;
  const label = (i: number) => monthLabel(first, i);
  const total = overall(map);
  const text = (id: string) => (typeof map.get(id) === 'string' ? (map.get(id) as string) : '');

  return (
    <div className="flex flex-col gap-5 pb-4">
      <Link to="/" className="flex min-h-11 items-center text-sm font-semibold text-teal">
        ‹ الرئيسية
      </Link>
      <header className="flex flex-col gap-2">
        <div className="text-sm text-muted">رؤيتي للسنة</div>
        <h1 className="text-2xl font-bold leading-snug">{planTitle(age && age >= 1 && age <= 99 ? age : DEFAULT_AGE)}</h1>
        <div className="text-lg font-semibold">{YEAR_VISION.motto}</div>
        <p className="text-[15px] leading-8 text-muted">{YEAR_VISION.text}</p>
        <p className="text-sm text-muted">{`من ${label(0)} إلى ${label(11)}`}</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            عمري في هذه السنة
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              value={age ?? ''}
              onChange={(e) => changeAge(e.target.value)}
              className="min-h-11 rounded-xl border-[1.5px] border-line bg-card px-3 text-ink"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            شهر البداية
            <input
              type="month"
              value={start}
              onChange={(e) => changeStart(e.target.value)}
              className="min-h-11 rounded-xl border-[1.5px] border-line bg-card px-3 text-ink"
            />
          </label>
        </div>
        <div className="rounded-2xl bg-teal-soft p-3 text-sm font-semibold text-teal-ink">
          {`التقدم: ${toArabicDigits(total.percent)}٪ · ${toArabicDigits(total.tasksDone)} من ${toArabicDigits(total.tasksTotal)} خطوة · ${toArabicDigits(total.goalsDone)} من ${toArabicDigits(total.goalsTotal)} أهداف`}
        </div>
      </header>

      <section className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">أهداف السنة</h2>
        {YEAR_GOALS.map((g, i) => (
          <Check key={g} label={g} ariaLabel={`هدف: ${g}`} checked={map.get(goalKey(i)) === true} onChange={(v) => set(goalKey(i), v)} />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">الأشهر</h2>
        {YEAR_MONTHS.map((m, mi) => (
          <details key={m.name} role="group" aria-label={label(mi)} className="rounded-2xl border border-line bg-card p-3.5">
            <summary className="flex min-h-11 cursor-pointer flex-col justify-center gap-0.5">
              <span className="font-bold">{label(mi)}</span>
              <span className="text-sm text-muted">{m.theme}</span>
              <span className="text-xs font-semibold text-teal">{`تقدم الشهر: ${toArabicDigits(monthPercent(map, mi))}٪`}</span>
            </summary>
            <p className="mt-2 text-sm leading-7 text-muted">{m.intro}</p>
            {m.weeks.map((w, wi) => (
              <div key={w.title} className="mt-3 flex flex-col">
                <h3 className="text-[15px] font-bold">{w.title}</h3>
                {w.tasks.map((t, ti) => (
                  <Check key={t} label={t} checked={map.get(taskKey(mi, wi, ti)) === true} onChange={(v) => set(taskKey(mi, wi, ti), v)} />
                ))}
              </div>
            ))}
            <label className="mt-3 flex flex-col gap-1.5 text-sm font-semibold">
              ملاحظات الشهر
              <textarea
                className={field}
                value={text(noteKey(mi))}
                onChange={(e) => set(noteKey(mi), e.target.value)}
              />
            </label>
          </details>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">مراجعة السنة</h2>
        {YEAR_REVIEW_QUESTIONS.map((q, i) => (
          <label key={q} className="flex flex-col gap-1.5 text-sm font-semibold">
            {q}
            <textarea className={field} value={text(reviewKey(i))} onChange={(e) => set(reviewKey(i), e.target.value)} />
          </label>
        ))}
      </section>
    </div>
  );
}
