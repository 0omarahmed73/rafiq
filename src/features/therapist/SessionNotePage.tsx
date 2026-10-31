import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { newId } from '../../db/repo';
import { useRepo } from '../../db/RepoContext';
import type { HomeworkItem } from '../../db/schema';
import { dayKey } from '../../lib/dates';

const label = 'text-[13px] font-semibold text-muted';
const area = 'w-full rounded-2xl border border-line bg-card p-3 text-base leading-8 text-ink';

export function SessionNotePage() {
  const repo = useRepo();
  const navigate = useNavigate();
  const { id } = useParams();

  const [ready, setReady] = useState(!id);
  const [date, setDate] = useState(dayKey(new Date()));
  const [said, setSaid] = useState('');
  const [takeaway, setTakeaway] = useState('');
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [step, setStep] = useState('');
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    void repo.listSessions().then((all) => {
      const found = all.find((s) => s.id === id);
      if (alive && found) {
        setDate(found.date);
        setSaid(found.therapistSaid);
        setTakeaway(found.takeaway);
        setHomework(found.homework);
        setCreatedAt(found.createdAt);
      }
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [repo, id]);

  function addStep() {
    const text = step.trim();
    if (!text) return;
    setHomework((h) => [...h, { text, done: false }]);
    setStep('');
  }

  async function save() {
    await repo.saveSession({
      id: id ?? newId(),
      date,
      therapistSaid: said,
      takeaway,
      homework,
      createdAt: createdAt ?? new Date().toISOString(),
    });
    navigate('/therapist');
  }

  if (!ready) return null;

  return (
    <div className="flex flex-col gap-4">
      <Link to="/therapist" className="flex min-h-11 items-center text-[15px] font-semibold text-teal">
        ‹ جلسات المعالج
      </Link>
      <h1 className="text-2xl font-bold leading-snug">ملاحظات الجلسة</h1>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="session-date" className={label}>
          تاريخ الجلسة
        </label>
        <input
          id="session-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="min-h-12 rounded-2xl border border-line bg-card px-3.5 text-base text-ink"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="session-said" className={label}>
          أهم ما قاله المعالج
        </label>
        <textarea id="session-said" rows={4} value={said} onChange={(e) => setSaid(e.target.value)} className={area} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="session-takeaway" className={label}>
          ما الذي سآخذه معي؟
        </label>
        <textarea
          id="session-takeaway"
          rows={3}
          value={takeaway}
          onChange={(e) => setTakeaway(e.target.value)}
          className={area}
        />
      </div>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className={`${label} mb-1`}>الواجب والخطوات المطلوبة</legend>
        {homework.length > 0 && (
          <ul className="m-0 flex list-none flex-col overflow-hidden rounded-2xl border border-line bg-card p-0">
            {homework.map((h, i) => (
              <li key={`${i}-${h.text}`} className="flex items-center border-t border-line first:border-t-0">
                <label className="flex min-h-14 flex-1 cursor-pointer items-center gap-3 px-3.5 text-[15px] leading-7">
                  <input
                    type="checkbox"
                    checked={h.done}
                    onChange={() =>
                      setHomework((list) => list.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))
                    }
                    className="plan-check !mt-0"
                  />
                  <span className={h.done ? 'text-muted line-through' : ''}>{h.text}</span>
                </label>
                <button
                  type="button"
                  aria-label={`حذف الخطوة: ${h.text}`}
                  onClick={() => setHomework((list) => list.filter((_, j) => j !== i))}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:text-teal-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            addStep();
          }}
        >
          <input
            type="text"
            aria-label="خطوة جديدة"
            placeholder="اكتب خطوة جديدة…"
            value={step}
            onChange={(e) => setStep(e.target.value)}
            className="min-h-12 flex-1 rounded-2xl border border-line bg-card px-3.5 text-base text-ink"
          />
          <button
            type="submit"
            disabled={!step.trim()}
            className="min-h-12 rounded-2xl bg-teal px-5 text-[15px] font-bold text-card transition-opacity disabled:opacity-40"
          >
            إضافة
          </button>
        </form>
      </fieldset>

      <button type="button" onClick={save} className="min-h-12 rounded-full bg-teal px-6 text-base font-bold text-card">
        حفظ الملاحظات
      </button>
      <p className="text-center text-xs text-muted">ملاحظاتي خاصة ولا تدخل في الملخّص.</p>
    </div>
  );
}
