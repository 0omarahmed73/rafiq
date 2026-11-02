import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { newId } from '../../db/repo';
import { useRepo } from '../../db/RepoContext';
import type { Session } from '../../db/schema';
import { dayKey, formatDayLabel } from '../../lib/dates';
import { AddItemRow } from '../../components/AddItemRow';
import { agendaItems, type AgendaItem } from './agenda';
import { useI18n } from '../../i18n/LanguageProvider';

const btn = 'min-h-11 rounded-full border-[1.5px] px-4 text-sm font-bold';
const iconBtn =
  'flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-card hover:text-teal-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal';
const card = 'flex flex-col gap-2 rounded-2xl border border-line bg-card p-4';

export function TherapistPage() {
  const repo = useRepo();
  const { t } = useI18n();
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [homeworkBySession, setHomeworkBySession] = useState<Record<string, { done: number; total: number }>>({});
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string }>();
  const [deleting, setDeleting] = useState<string>();

  const load = useCallback(async () => {
    const [items, past, homework] = await Promise.all([agendaItems(repo), repo.listSessions(), repo.listHomework()]);
    const counts: Record<string, { done: number; total: number }> = {};
    for (const h of homework) {
      const c = (counts[h.sessionId] ??= { done: 0, total: 0 });
      c.total += 1;
      if (h.done) c.done += 1;
    }
    setAgenda(items);
    setSessions(past);
    setHomeworkBySession(counts);
  }, [repo]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addPoint(text: string) {
    await repo.saveAgendaPoint({ id: newId(), text, day: dayKey(new Date()), done: false });
    await load();
  }

  async function markDiscussed(id: string) {
    const point = (await repo.listAgendaPoints()).find((p) => p.id === id);
    if (point) await repo.saveAgendaPoint({ ...point, done: true });
    await load();
  }

  async function saveEdit() {
    const text = editing?.text.trim();
    if (!editing || !text) return;
    const point = (await repo.listAgendaPoints()).find((p) => p.id === editing.id);
    if (point) await repo.saveAgendaPoint({ ...point, text });
    setEditing(undefined);
    await load();
  }

  async function removePoint(id: string) {
    await repo.deleteAgendaPoint(id);
    setDeleting(undefined);
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-bold leading-snug">{t({ ar: 'جلسات المعالج', en: 'My therapist sessions' })}</h1>

      <section className={`${card} border-teal-soft bg-teal-soft`}>
        <h2 className="text-base font-bold text-teal-ink">{t({ ar: 'ما أريد مناقشته في الجلسة القادمة', en: 'What I want to discuss at the next session' })}</h2>
        {agenda.length === 0 ? (
          <p className="text-sm leading-7 text-teal-ink">
            {t({ ar: 'لا شيء بعد. أضع علامة «للنقاش في الجلسة القادمة» على أي تسجيل أو تمرين، أو أضيف نقطة هنا.', en: 'Nothing yet. I mark any check-in or practice with "To discuss at the next session", or I add a point here.' })}
          </p>
        ) : (
          <ul aria-label={t({ ar: 'ما أريد مناقشته', en: 'What I want to discuss' })} className="m-0 flex list-none flex-col p-0">
            {agenda.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="flex items-start gap-2.5 border-t border-line py-2 first:border-t-0">
                {editing?.id !== item.id &&
                  (item.kind === 'point' ? (
                    <input
                      type="checkbox"
                      aria-label={t({ ar: 'تمت مناقشتها: {label}', en: 'Discussed: {label}' }, { label: item.label })}
                      onChange={() => void markDiscussed(item.id)}
                      className="plan-check"
                    />
                  ) : (
                    <span aria-hidden="true" className="mt-3 h-2 w-2 shrink-0 rounded-full bg-teal" />
                  ))}
                {editing?.id === item.id ? (
                  <form
                    className="flex min-w-0 flex-1 flex-col gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void saveEdit();
                    }}
                  >
                    <input
                      type="text"
                      aria-label={t({ ar: 'تعديل النقطة', en: 'Edit the point' })}
                      autoFocus
                      value={editing.text}
                      onChange={(e) => setEditing({ id: item.id, text: e.target.value })}
                      className="min-h-12 w-full min-w-0 rounded-2xl border border-line bg-card px-3.5 text-base text-ink"
                    />
                    <div className="flex gap-2">
                      <button type="submit" className={`${btn} border-teal bg-teal text-card`}>
                        {t({ ar: 'حفظ', en: 'Save' })}
                      </button>
                      <button type="button" onClick={() => setEditing(undefined)} className={`${btn} border-line bg-card text-ink`}>
                        {t({ ar: 'إلغاء', en: 'Cancel' })}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 break-words text-[15px] leading-8">
                      {item.label}
                      <span className="block text-xs text-muted">{formatDayLabel(item.day)}</span>
                    </span>
                    {item.kind === 'point' && deleting !== item.id && (
                      <div className="flex shrink-0 items-center">
                        <button
                          type="button"
                          aria-label={t({ ar: 'تعديل: {label}', en: 'Edit: {label}' }, { label: item.label })}
                          onClick={() => setEditing({ id: item.id, text: item.label })}
                          className={iconBtn}
                        >
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z" />
                            <path d="M13.5 6.5l4 4" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          aria-label={t({ ar: 'حذف: {label}', en: 'Delete: {label}' }, { label: item.label })}
                          onClick={() => setDeleting(item.id)}
                          className={iconBtn}
                        >
                          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                          </svg>
                        </button>
                      </div>
                    )}
                    {item.kind === 'point' && deleting === item.id && (
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="text-xs font-semibold">{t({ ar: 'حذف هذه النقطة؟', en: 'Delete this point?' })}</span>
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => void removePoint(item.id)} className={`${btn} min-h-10 border-[#b3261e] bg-[#b3261e] text-white`}>
                            {t({ ar: 'تأكيد الحذف', en: 'Confirm deletion' })}
                          </button>
                          <button type="button" onClick={() => setDeleting(undefined)} className={`${btn} min-h-10 border-line bg-card text-ink`}>
                            {t({ ar: 'إلغاء', en: 'Cancel' })}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {adding ? (
          <AddItemRow label={t({ ar: 'نقطة جديدة', en: 'New point' })} onAdd={addPoint} onDone={() => setAdding(false)} />
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="min-h-11 self-start text-sm font-bold text-teal-ink"
          >
            {t({ ar: '+ إضافة نقطة', en: '+ Add a point' })}
          </button>
        )}
      </section>

      <Link
        to="/therapist/note"
        className="flex min-h-[50px] items-center justify-center rounded-full bg-teal text-base font-bold text-card"
      >
        {t({ ar: 'إضافة ملاحظات جلسة', en: 'Add session notes' })}
      </Link>

      {sessions.length > 0 && (
        <div>
          <h2 className="mb-2 text-[15px] font-bold">{t({ ar: 'الجلسات السابقة', en: 'Previous sessions' })}</h2>
          <ul aria-label={t({ ar: 'الجلسات السابقة', en: 'Previous sessions' })} className="m-0 flex list-none flex-col gap-2 p-0">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link to={`/therapist/note/${s.id}`} className={`${card} gap-1`}>
                  <span className="flex justify-between text-[13px] text-muted">
                    <span>{formatDayLabel(s.date)}</span>
                    {homeworkBySession[s.id] && (
                      <span className="font-semibold text-teal-ink">
                        {t(
                          { ar: 'الواجب: {done} من {total}', en: 'Homework: {done} of {total}' },
                          { done: homeworkBySession[s.id].done, total: homeworkBySession[s.id].total },
                        )}
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 text-[15px] leading-7">{s.therapistSaid}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link to="/therapist/homework" className="flex min-h-12 items-center justify-between px-1 text-[15px] font-semibold text-teal">
        {t({ ar: 'واجباتي', en: 'My homework' })} <span aria-hidden="true">{t({ ar: '‹', en: '›' })}</span>
      </Link>

      <Link to="/therapist/notes" className="flex min-h-12 items-center justify-between px-1 text-[15px] font-semibold text-teal">
        {t({ ar: 'ملاحظاتي', en: 'My notes' })} <span aria-hidden="true">{t({ ar: '‹', en: '›' })}</span>
      </Link>

      <Link to="/therapist/summary" className="flex min-h-12 items-center justify-between px-1 text-[15px] font-semibold text-teal">
        {t({ ar: 'إنشاء ملخّص لأعطيه لمعالجي', en: 'Create a summary to give my therapist' })} <span aria-hidden="true">{t({ ar: '‹', en: '›' })}</span>
      </Link>
    </div>
  );
}
