import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRepo } from '../../db/RepoContext';
import type { Homework } from '../../db/schema';
import { formatArabicDate } from '../../lib/dates';
import { homeworkStatus, photosLabel } from './homeworkLabels';

type Filter = 'open' | 'done';

const chip = (active: boolean) =>
  `min-h-11 flex-1 rounded-full px-4 text-[15px] font-semibold ${
    active ? 'bg-teal text-card' : 'border border-line bg-card text-ink'
  }`;

/** «واجباتي»: every homework across sessions, open first. */
export function HomeworkListPage() {
  const repo = useRepo();
  const [filter, setFilter] = useState<Filter>('open');
  const [rows, setRows] = useState<Homework[] | null>(null);
  const [dates, setDates] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    void Promise.all([repo.listHomework(), repo.listSessions(), repo.countHomeworkImages()]).then(([homework, sessions, photos]) => {
      if (!alive) return;
      setRows(homework);
      setDates(Object.fromEntries(sessions.map((s) => [s.id, s.date])));
      setCounts(photos);
    });
    return () => {
      alive = false;
    };
  }, [repo]);

  if (!rows) return null;
  const shown = rows.filter((h) => (filter === 'done' ? h.done : !h.done));

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Link to="/therapist" className="flex min-h-11 items-center text-[15px] font-semibold text-teal">
        ‹ جلسات المعالج
      </Link>
      <h1 className="text-2xl font-bold leading-snug">واجباتي</h1>

      <div role="group" aria-label="تصفية الواجبات" className="flex gap-2">
        <button type="button" aria-pressed={filter === 'open'} onClick={() => setFilter('open')} className={chip(filter === 'open')}>
          المفتوحة
        </button>
        <button type="button" aria-pressed={filter === 'done'} onClick={() => setFilter('done')} className={chip(filter === 'done')}>
          المنجزة
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="m-0 rounded-2xl border border-dashed border-line bg-card p-5 text-[15px] leading-8 text-muted">
          {filter === 'open' ? 'لا توجد واجبات مفتوحة.' : 'لا توجد واجبات منجزة بعد.'}
        </p>
      ) : (
        <ul aria-label="الواجبات" className="m-0 flex list-none flex-col gap-2 p-0">
          {shown.map((h) => (
            <li key={h.id} className="min-w-0">
              <Link to={`/therapist/homework/${h.id}`} className="flex min-h-14 min-w-0 flex-col gap-1 rounded-2xl border border-line bg-card p-4">
                <span className="line-clamp-2 break-words text-base font-semibold leading-7 text-ink">{h.text}</span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
                  {dates[h.sessionId] && <span>{formatArabicDate(dates[h.sessionId])}</span>}
                  <span className="font-semibold text-teal-ink">{homeworkStatus(h)}</span>
                  {counts[h.id] > 0 && <span>{photosLabel(counts[h.id])}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
