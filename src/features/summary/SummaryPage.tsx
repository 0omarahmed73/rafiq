import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRepo } from '../../db/RepoContext';
import { dayKey } from '../../lib/dates';
import { buildSummary, type SummaryModel, type SummarySwitches } from './buildSummary';
import { isAndroidPlatform, printSummaryDocument } from '../../platform/documents';
import { buildPrintDocument } from './printDocument';
import { type Bi } from '../../i18n';
import { SummaryPrint } from './SummaryPrint';
import './print.css';
import { useI18n } from '../../i18n/LanguageProvider';

const OPTIONS: { key: keyof SummarySwitches; label: Bi }[] = [
  { key: 'checkins', label: { ar: 'تسجيلات المشاعر', en: 'Feeling check-ins' } },
  { key: 'curve', label: { ar: 'منحنى الشدّة', en: 'Intensity curve' } },
  { key: 'weeklyReviews', label: { ar: 'مراجعات الأسبوع', en: 'Weekly reviews' } },
  { key: 'practices', label: { ar: 'الممارسات الموجّهة', en: 'Guided practices' } },
  { key: 'tagged', label: { ar: 'ما وسمتُه «للنقاش في الجلسة»', en: 'What I marked "to discuss at the session"' } },
  { key: 'homework', label: { ar: 'إجابات الواجبات', en: 'Homework answers' } },
  { key: 'notes', label: { ar: 'ملاحظاتي', en: 'My notes' } },
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
  const { t } = useI18n();
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

  const dateInput = 'min-h-12 w-full min-w-0 rounded-2xl border border-line bg-card px-3.5 text-base text-ink';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 print:hidden">
        <Link to="/therapist" className="flex min-h-11 items-center text-[15px] font-semibold text-teal">
          {t({ ar: '‹ جلسات المعالج', en: '‹ My therapist sessions' })}
        </Link>
        <div>
          <h1 className="mb-1 text-[28px] font-bold leading-snug">{t({ ar: 'ملخّص لمعالجي', en: 'A summary for my therapist' })}</h1>
          <p className="text-sm leading-7 text-muted">{t({ ar: 'لا يُرسل شيء تلقائيًا، وأنا أختار ما يدخل في الملخّص.', en: 'Nothing is sent automatically. I choose what goes into the summary.' })}</p>
        </div>

        <div className="flex gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor="summary-from" className="text-[13px] font-semibold text-muted">
              {t({ ar: 'من', en: 'From' })}
            </label>
            <input
              id="summary-from"
              type="date"
              value={range.from}
              onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))}
              className={dateInput}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor="summary-to" className="text-[13px] font-semibold text-muted">
              {t({ ar: 'إلى', en: 'To' })}
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
          <legend className="sr-only">{t({ ar: 'ما الذي يتضمّنه الملخّص؟', en: 'What the summary includes' })}</legend>
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
              {t(o.label)}
            </label>
          ))}
        </fieldset>

        <h2 className="text-[13px] font-semibold text-muted">{t({ ar: 'معاينة', en: 'Preview' })}</h2>
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
          {t({ ar: 'حفظ كملف PDF', en: 'Save as a PDF file' })}
        </button>
        {printError && (
          <p role="alert" className="text-center text-sm font-semibold text-ink">
            {t({ ar: 'تعذّرت الطباعة، يمكنني المحاولة مرة أخرى.', en: 'Printing failed. I can try again.' })}
          </p>
        )}
        <p className="text-center text-xs text-muted">{t({ ar: 'يُنشأ على جهازي. أرسله بالطريقة التي أفضّلها.', en: 'It is created on my device. I send it the way I prefer.' })}</p>
      </div>
    </div>
  );
}
