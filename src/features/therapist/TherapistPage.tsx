import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { newId } from '../../db/repo';
import { useRepo } from '../../db/RepoContext';
import type { Session } from '../../db/schema';
import { dayKey, formatArabicDate } from '../../lib/dates';
import { toArabicDigits } from '../../lib/digits';
import { agendaItems, type AgendaItem } from './agenda';

const card = 'flex flex-col gap-2 rounded-2xl border border-line bg-card p-4';

export function TherapistPage() {
  const repo = useRepo();
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const load = useCallback(async () => {
    const [items, past] = await Promise.all([agendaItems(repo), repo.listSessions()]);
    setAgenda(items);
    setSessions(past);
  }, [repo]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addPoint() {
    const text = draft.trim();
    if (!text) return;
    await repo.saveAgendaPoint({ id: newId(), text, day: dayKey(new Date()), done: false });
    setDraft('');
    setAdding(false);
    await load();
  }

  async function markDiscussed(id: string) {
    const point = (await repo.listAgendaPoints()).find((p) => p.id === id);
    if (point) await repo.saveAgendaPoint({ ...point, done: true });
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-bold leading-snug">جلسات المعالج</h1>

      <section className={`${card} border-teal-soft bg-teal-soft`}>
        <h2 className="text-base font-bold text-teal-ink">ما أريد مناقشته في الجلسة القادمة</h2>
        {agenda.length === 0 ? (
          <p className="text-sm leading-7 text-teal-ink">
            لا شيء بعد. أضع علامة «للنقاش في الجلسة القادمة» على أي تسجيل أو تمرين، أو أضيف نقطة هنا.
          </p>
        ) : (
          <ul aria-label="ما أريد مناقشته" className="m-0 flex list-none flex-col p-0">
            {agenda.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="flex items-start gap-2.5 border-t border-line py-2 first:border-t-0">
                {item.kind === 'point' ? (
                  <input
                    type="checkbox"
                    aria-label={`تمت مناقشتها: ${item.label}`}
                    onChange={() => void markDiscussed(item.id)}
                    className="mt-1.5 h-[22px] w-[22px] shrink-0 accent-teal"
                  />
                ) : (
                  <span aria-hidden="true" className="mt-3 h-2 w-2 shrink-0 rounded-full bg-teal" />
                )}
                <span className="flex-1 text-[15px] leading-8">
                  {item.label}
                  <span className="block text-xs text-muted">{formatArabicDate(item.day)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {adding ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void addPoint();
            }}
          >
            <input
              type="text"
              aria-label="نقطة جديدة"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="min-h-12 flex-1 rounded-2xl border border-line bg-card px-3.5 text-base text-ink"
            />
            <button
              type="submit"
              className="min-h-12 rounded-2xl border-[1.5px] border-teal bg-card px-5 text-[15px] font-bold text-teal-ink"
            >
              إضافة
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="min-h-11 self-start text-sm font-bold text-teal-ink"
          >
            + أضف نقطة
          </button>
        )}
      </section>

      <Link
        to="/therapist/note"
        className="flex min-h-[50px] items-center justify-center rounded-full bg-teal text-base font-bold text-card"
      >
        أضف ملاحظات جلسة
      </Link>

      {sessions.length > 0 && (
        <div>
          <h2 className="mb-2 text-[15px] font-bold">الجلسات السابقة</h2>
          <ul aria-label="الجلسات السابقة" className="m-0 flex list-none flex-col gap-2 p-0">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link to={`/therapist/note/${s.id}`} className={`${card} gap-1`}>
                  <span className="flex justify-between text-[13px] text-muted">
                    <span>{formatArabicDate(s.date)}</span>
                    <span className="font-semibold text-teal-ink">
                      {`الواجب: ${toArabicDigits(s.homework.filter((h) => h.done).length)} من ${toArabicDigits(s.homework.length)}`}
                    </span>
                  </span>
                  <span className="line-clamp-2 text-[15px] leading-7">{s.therapistSaid}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link to="/therapist/summary" className="flex min-h-12 items-center justify-between px-1 text-[15px] font-semibold text-teal">
        إنشاء ملخّص لأعطيه لمعالجي <span aria-hidden="true">‹</span>
      </Link>
    </div>
  );
}
