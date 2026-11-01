import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRepo } from '../../db/RepoContext';
import { dayKey } from '../../lib/dates';
import { buildSummary, type SummaryModel, type SummarySwitches } from './buildSummary';
import { isAndroidPlatform, printSummaryDocument } from '../../platform/documents';
import { buildPrintDocument } from './printDocument';
import { SummaryPrint } from './SummaryPrint';
import './print.css';

const OPTIONS: { key: keyof SummarySwitches; label: string }[] = [
  { key: 'checkins', label: 'تسجيلات المشاعر' },
  { key: 'curve', label: 'منحنى الشدّة' },
  { key: 'weeklyReviews', label: 'مراجعات الأسبوع' },
  { key: 'practices', label: 'الممارسات الموجّهة' },
  { key: 'tagged', label: 'ما وسمتُه «للنقاش في الجلسة»' },
  { key: 'homework', label: 'إجابات الواجبات' },
  { key: 'notes', label: 'ملاحظاتي' },
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
    homework: true,
    notes: true,
  });
  const [model, setModel] = useState<SummaryModel | null>(null);
  const [profile, setProfile] = useState<{ displayName?: string; therapistName?: string }>();
  const [accent, setAccent] = useState<string>();
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState(false);
  const printArea = useRef<HTMLDivElement>(null);

  // Paper is white: print in the light colours of the chosen accent, whatever the screen theme is.
  useEffect(() => {
    const root = document.documentElement;
    let before: string | undefined;
    const onBefore = () => {
      before = root.dataset.theme;
      root.dataset.theme = 'light';
    };
    const onAfter = () => {
      if (before === undefined) delete root.dataset.theme;
      else root.dataset.theme = before;
    };
    window.addEventListener('beforeprint', onBefore);
    window.addEventListener('afterprint', onAfter);
    return () => {
      window.removeEventListener('beforeprint', onBefore);
      window.removeEventListener('afterprint', onAfter);
    };
  }, []);

  useEffect(() => {
    void repo.getSettings().then((s) => {
      setProfile({ displayName: s.displayName, therapistName: s.therapistName });
      setAccent(s.accent);
    });
  }, [repo]);

  useEffect(() => {
    let alive = true;
    void buildSummary(repo, range, switches).then((m) => alive && setModel(m));
    return () => {
      alive = false;
    };
  }, [repo, range, switches]);

  async function save() {
    if (!isAndroidPlatform()) {
      window.print();
      return;
    }
    const article = printArea.current?.querySelector('article');
    if (printing || !article) return;
    setPrinting(true);
    setPrintError(false);
    try {
      await document.fonts?.ready;
      await printSummaryDocument(buildPrintDocument(article as HTMLElement, accent));
    } catch {
      setPrintError(true);
    } finally {
      setPrinting(false);
    }
  }

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

      <div ref={printArea} className="print-area rounded-2xl border border-line bg-card p-4">
        {model && <SummaryPrint model={model} switches={switches} profile={profile} generatedOn={dayKey(today)} />}
      </div>

      <div className="flex flex-col gap-1.5 print:hidden">
        <button
          type="button"
          onClick={() => void save()}
          disabled={printing}
          className="min-h-12 rounded-full bg-teal px-6 text-base font-bold text-card disabled:opacity-60"
        >
          حفظ كملف PDF
        </button>
        {printError && (
          <p role="alert" className="text-center text-sm font-semibold text-ink">
            تعذّرت الطباعة، يمكنني المحاولة مرة أخرى.
          </p>
        )}
        <p className="text-center text-xs text-muted">يُنشأ على جهازي. أرسله بالطريقة التي أفضّلها.</p>
      </div>
    </div>
  );
}
