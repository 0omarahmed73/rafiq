import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { newId } from '../../db/repo';
import { useRepo } from '../../db/RepoContext';
import type { Homework } from '../../db/schema';
import { dayKey } from '../../lib/dates';
import { homeworkStatus, photosLabel } from './homeworkLabels';
import { useI18n } from '../../i18n/LanguageProvider';

const label = 'text-[13px] font-semibold text-muted';
const area = 'w-full min-w-0 break-words rounded-2xl border border-line bg-card p-3 text-base leading-8 text-ink';

export function SessionNotePage() {
  const { t } = useI18n();
  const repo = useRepo();
  const navigate = useNavigate();
  const { id } = useParams();
  const sessionId = useRef(id ?? newId()).current;
  const startedAt = useRef(new Date().toISOString()).current;

  const [ready, setReady] = useState(!id);
  const [date, setDate] = useState(dayKey(new Date()));
  const [said, setSaid] = useState('');
  const [takeaway, setTakeaway] = useState('');
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let alive = true;
    void Promise.all([repo.listSessions(), repo.listHomeworkBySession(id), repo.countHomeworkImages()]).then(
      ([all, items, counts]) => {
        if (!alive) return;
        const found = all.find((s) => s.id === id);
        if (found) {
          setDate(found.date);
          setSaid(found.therapistSaid);
          setTakeaway(found.takeaway);
          setCreatedAt(found.createdAt);
        }
        setHomework(items);
        setPhotoCounts(counts);
        setReady(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [repo, id]);

  /** Homework lives in its own records, so the session row always carries an empty list. */
  async function saveSession() {
    await repo.saveSession({
      id: sessionId,
      date,
      therapistSaid: said,
      takeaway,
      homework: [],
      createdAt: createdAt ?? startedAt,
    });
  }

  async function save() {
    setError('');
    try {
      await saveSession();
      navigate('/therapist');
    } catch {
      setError(t({ ar: 'تعذّر حفظ الملاحظات، يمكنني المحاولة مرة أخرى.', en: 'Could not save the notes. I can try again.' }));
    }
  }

  async function addHomework() {
    setError('');
    try {
      await saveSession();
      navigate(`/therapist/homework/new?session=${sessionId}`);
    } catch {
      setError(t({ ar: 'تعذّر حفظ الملاحظات، يمكنني المحاولة مرة أخرى.', en: 'Could not save the notes. I can try again.' }));
    }
  }

  if (!ready) return null;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Link to="/therapist" className="flex min-h-11 items-center text-[15px] font-semibold text-teal">
        {t({ ar: '‹ جلسات المعالج', en: '‹ My therapist sessions' })}
      </Link>
      <h1 className="text-2xl font-bold leading-snug">{t({ ar: 'ملاحظات الجلسة', en: 'Session notes' })}</h1>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="session-date" className={label}>
          {t({ ar: 'تاريخ الجلسة', en: 'Session date' })}
        </label>
        <input
          id="session-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="min-h-12 w-full min-w-0 rounded-2xl border border-line bg-card px-3.5 text-base text-ink"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="session-said" className={label}>
          {t({ ar: 'أهم ما قاله المعالج', en: 'The main thing my therapist said' })}
        </label>
        <textarea id="session-said" rows={4} value={said} onChange={(e) => setSaid(e.target.value)} className={area} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="session-takeaway" className={label}>
          {t({ ar: 'ما الذي سآخذه معي؟', en: 'What will I take with me?' })}
        </label>
        <textarea
          id="session-takeaway"
          rows={3}
          value={takeaway}
          onChange={(e) => setTakeaway(e.target.value)}
          className={area}
        />
      </div>

      <section aria-labelledby="session-homework" className="flex min-w-0 flex-col gap-2">
        <h2 id="session-homework" className={label}>
          {t({ ar: 'الواجب', en: 'Homework' })}
        </h2>
        {homework.length === 0 ? (
          <p className="m-0 rounded-2xl border border-dashed border-line bg-card p-4 text-[15px] leading-8 text-muted">
            {t({ ar: 'لم أضف واجبًا بعد.', en: 'I have not added any homework yet.' })}
          </p>
        ) : (
          <ul aria-label={t({ ar: 'الواجب', en: 'Homework' })} className="m-0 flex list-none flex-col gap-2 p-0">
            {homework.map((h) => (
              <li key={h.id} className="min-w-0">
                <Link
                  to={`/therapist/homework/${h.id}`}
                  className="flex min-h-14 min-w-0 flex-col gap-1 rounded-2xl border border-line bg-card p-4"
                >
                  <span className="line-clamp-2 break-words text-[15px] font-semibold leading-7 text-ink">{h.text}</span>
                  <span className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-muted">
                    <span className="font-semibold text-teal-ink">{homeworkStatus(h)}</span>
                    {photoCounts[h.id] > 0 && <span>{photosLabel(photoCounts[h.id])}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => void addHomework()}
          className="min-h-12 rounded-full border-[1.5px] border-teal bg-card px-6 text-[15px] font-bold text-teal-ink"
        >
          {t({ ar: 'أضيف واجبًا', en: 'Add homework' })}
        </button>
      </section>

      {error && (
        <p role="alert" className="m-0 text-sm font-semibold leading-7 text-ink">
          {error}
        </p>
      )}

      <button type="button" onClick={() => void save()} className="min-h-12 rounded-full bg-teal px-6 text-base font-bold text-card">
        {t({ ar: 'حفظ الملاحظات', en: 'Save the notes' })}
      </button>
      <p className="text-center text-xs text-muted">{t({ ar: 'ملاحظاتي خاصة ولا تدخل في الملخّص.', en: 'My notes are private and do not go into the summary.' })}</p>
    </div>
  );
}
