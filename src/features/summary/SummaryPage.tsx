import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRepo } from '../../db/RepoContext';
import { dayKey } from '../../lib/dates';
import { buildSummary, type SummaryModel, type SummarySwitches } from './buildSummary';
import { SummaryPrint } from './SummaryPrint';
import './print.css';

const OPTIONS: { key: keyof SummarySwitches; label: string }[] = [
  { key: 'checkins', label: 'تسجيلات المشاعر' },
  { key: 'curve', label: 'منحنى الشدّة' },
  { key: 'weeklyReviews', label: 'مراجعات الأسبوع' },
  { key: 'practices', label: 'الممارسات الموجّهة' },
  { key: 'tagged', label: 'ما وسمتُه «للنقاش في الجلسة»' },
];

const pad = (n: number) => String(n).padStart(2, '0');

/** The first and last day of the month of `today`, as day keys. */
function monthRange(today: Date) {
  const y = today.getFullYear();
  const m = today.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(last)}` };
}

export function SummaryPage({ today = new Date() }: { today?: Date }) {
  const repo = useRepo();
  const [range, setRange] = useState(() => monthRange(today));
  const [switches, setSwitches] = useState<SummarySwitches>({
    checkins: true,
    curve: true,
    weeklyReviews: true,
    practices: true,
    tagged: true,
  });
  const [model, setModel] = useState<SummaryModel | null>(null);
  const [profile, setProfile] = useState<{ displayName?: string; therapistName?: string }>();

  useEffect(() => {
    void repo.getSettings().then((s) => setProfile({ displayName: s.displayName, therapistName: s.therapistName }));
  }, [repo]);

  useEffect(() => {
    let alive = true;
    void buildSummary(repo, range, switches).then((m) => alive && setModel(m));
    return () => {
      alive = false;
    };
  }, [repo, range, switches]);

  const dateInput = 'min-h-12 w-full rounded-2xl border border-line bg-card px-3.5 text-base text-ink';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 print:hidden">
        <Link to="/therapist" className="flex min-h-11 items-center text-[15px] font-semibold text-teal">
          ‹ جلسات المعالج
        </Link>
        <div>
          <h1 className="mb-1 text-[28px] font-bold leading-snug">ملخّص لمعالجي</h1>
          <p className="text-sm leading-7 text-muted">لا يُرسل شيء تلقائيًا، وأنا أختار ما يدخل في الملخّص.</p>
        </div>

        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="summary-from" className="text-[13px] font-semibold text-muted">
              من
            </label>
            <input
              id="summary-from"
              type="date"
              value={range.from}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))}
              className={dateInput}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <label htmlFor="summary-to" className="text-[13px] font-semibold text-muted">
              إلى
            </label>
            <input
              id="summary-to"
              type="date"
              value={range.to}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))}
              className={dateInput}
            />
          </div>
        </div>

        <fieldset className="m-0 rounded-2xl border border-line bg-card p-0">
          <legend className="sr-only">ما الذي يتضمّنه الملخّص؟</legend>
          {OPTIONS.map((o) => (
            <label
              key={o.key}
              className="flex min-h-12 cursor-pointer items-center gap-3 border-t border-line px-4 text-[15px] font-medium first:border-t-0"
            >
              <input
                type="checkbox"
                checked={switches[o.key]}
                onChange={(e) => setSwitches((s) => ({ ...s, [o.key]: e.target.checked }))}
                className="h-[22px] w-[22px] accent-teal"
              />
              {o.label}
            </label>
          ))}
        </fieldset>

        <h2 className="text-[13px] font-semibold text-muted">معاينة</h2>
      </div>

      <div className="print-area rounded-2xl border border-line bg-card p-4">
        {model && <SummaryPrint model={model} switches={switches} profile={profile} generatedOn={dayKey(today)} />}
      </div>

      <div className="flex flex-col gap-1.5 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-12 rounded-full bg-teal px-6 text-base font-bold text-card"
        >
          حفظ كملف PDF
        </button>
        <p className="text-center text-xs text-muted">يُنشأ على جهازي. أرسله بالطريقة التي أفضّلها.</p>
      </div>
    </div>
  );
}
