import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRepo } from '../../db/RepoContext';
import type { Note } from '../../db/schema';
import { dayKey, formatArabicDate, formatArabicTime } from '../../lib/dates';
import { toArabicDigits } from '../../lib/digits';

/** Arabic count phrase for a number of notes (1: ملاحظة واحدة, 2: ملاحظتين, 3 to 10: ملاحظات, 11+: ملاحظة). */
function notesPhrase(n: number): string {
  if (n === 1) return 'ملاحظة واحدة';
  if (n === 2) return 'ملاحظتين';
  if (n <= 10) return `${toArabicDigits(n)} ملاحظات`;
  return `${toArabicDigits(n)} ملاحظة`;
}

const card = 'flex flex-col gap-3 rounded-2xl border border-line bg-card p-4';
const primary = 'min-h-12 rounded-full bg-teal px-6 text-[15px] font-bold text-card disabled:opacity-50';
const secondary = 'min-h-12 rounded-full border-[1.5px] border-teal bg-card px-5 text-[15px] font-bold text-teal-ink disabled:opacity-50';
const small = 'min-h-11 rounded-full px-4 text-sm font-semibold text-teal-ink';
const field = 'min-h-24 w-full resize-y rounded-2xl border border-line bg-card p-3.5 text-base leading-8 text-ink';

function stamp(n: Note): string {
  return `${formatArabicDate(dayKey(new Date(n.createdAt)))} · ${formatArabicTime(n.createdAt)}`;
}

/** «ملاحظاتي»: notes written through the week. «تجديد» moves them to an archive; nothing is deleted by it. */
export function NotesPage() {
  const repo = useRepo();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [renewing, setRenewing] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const reload = useCallback(async () => setNotes(await repo.listNotes()), [repo]);
  useEffect(() => {
    void reload();
  }, [reload]);

  async function guarded(action: () => Promise<void>) {
    setMessage(null);
    try {
      await action();
      await reload();
    } catch {
      setMessage({ kind: 'error', text: 'تعذّر الحفظ، يمكنني المحاولة مرة أخرى.' });
    }
  }

  const add = () =>
    guarded(async () => {
      const text = draft.trim();
      if (!text) return;
      await repo.saveNote({ id: crypto.randomUUID(), text, createdAt: new Date().toISOString() });
      setDraft('');
    });

  const saveEdit = () =>
    guarded(async () => {
      if (!editing) return;
      const note = notes?.find((n) => n.id === editing.id);
      const text = editing.text.trim();
      if (!note || !text) return;
      await repo.saveNote({ ...note, text });
      setEditing(null);
    });

  const remove = (id: string) =>
    guarded(async () => {
      await repo.deleteNote(id);
      setDeleting(null);
    });

  const renew = () =>
    guarded(async () => {
      const count = await repo.archiveNotes();
      setRenewing(false);
      setMessage({ kind: 'ok', text: `نقلتُ ${notesPhrase(count)} إلى الأرشيف.` });
    });

  if (!notes) return null;
  const current = notes.filter((n) => !n.archivedAt);
  const groups = new Map<string, Note[]>();
  for (const n of notes) if (n.archivedAt) groups.set(n.archivedAt, [...(groups.get(n.archivedAt) ?? []), n]);
  const archives = [...groups].sort(([a], [b]) => b.localeCompare(a));

  function item(n: Note) {
    const isEditing = editing?.id === n.id;
    return (
      <li key={n.id} className="flex min-w-0 flex-col gap-1.5 border-t border-line pt-3 first:border-t-0 first:pt-0">
        <span className="text-[13px] text-muted">{stamp(n)}</span>
        {isEditing ? (
          <>
            <textarea
              aria-label="تعديل الملاحظة"
              value={editing.text}
              onChange={(e) => setEditing({ id: n.id, text: e.target.value })}
              className={field}
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => void saveEdit()} disabled={!editing.text.trim()} className={`${secondary} flex-1`}>
                حفظ التعديل
              </button>
              <button type="button" onClick={() => setEditing(null)} className={small}>
                إلغاء التعديل
              </button>
            </div>
          </>
        ) : (
          <p className="m-0 whitespace-pre-wrap break-words text-[15px] leading-8 text-ink">{n.text}</p>
        )}
        {deleting === n.id ? (
          <div className="flex flex-col gap-2 rounded-xl bg-teal-soft p-3">
            <span className="text-sm font-semibold">أحذف هذه الملاحظة؟ لا يمكن التراجع عن ذلك.</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => void remove(n.id)} className={`${secondary} flex-1`}>
                نعم، أحذف
              </button>
              <button type="button" onClick={() => setDeleting(null)} className={small}>
                إلغاء الحذف
              </button>
            </div>
          </div>
        ) : (
          !isEditing && (
            <div className="flex gap-1">
              {!n.archivedAt && (
                <button type="button" aria-label="تعديل الملاحظة" onClick={() => setEditing({ id: n.id, text: n.text })} className={small}>
                  تعديل
                </button>
              )}
              <button type="button" aria-label="حذف الملاحظة" onClick={() => setDeleting(n.id)} className={small}>
                حذف
              </button>
            </div>
          )
        )}
      </li>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Link to="/therapist" className="flex min-h-11 items-center text-[15px] font-semibold text-teal">
        ‹ جلسات المعالج
      </Link>
      <div>
        <h1 className="mb-1 text-2xl font-bold leading-snug">ملاحظاتي</h1>
        <p className="m-0 text-sm leading-7 text-muted">أكتب ما أريد تذكّره طوال الأسبوع. تبقى على جهازي، وأضيفها إلى الملخّص إن شئت.</p>
      </div>

      <section className={card}>
        <label htmlFor="new-note" className="text-[13px] font-semibold text-muted">
          ملاحظة جديدة
        </label>
        <textarea id="new-note" value={draft} onChange={(e) => setDraft(e.target.value)} className={field} />
        <button type="button" onClick={() => void add()} disabled={!draft.trim()} className={primary}>
          إضافة ملاحظة
        </button>
      </section>

      {message && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className="m-0 text-sm font-semibold text-teal-ink">
          {message.text}
        </p>
      )}

      <section className={card}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">ملاحظات هذا الأسبوع</h2>
          <button type="button" onClick={() => setRenewing(true)} disabled={current.length === 0} className={secondary}>
            تجديد
          </button>
        </div>
        {renewing && (
          <div className="flex flex-col gap-2 rounded-xl bg-teal-soft p-3">
            <span className="text-sm leading-7">أنقل ملاحظات هذا الأسبوع إلى الأرشيف؟ لن يُحذف شيء، وتبدأ القائمة فارغة.</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => void renew()} className={`${primary} flex-1`}>
                نعم، أجدّد
              </button>
              <button type="button" onClick={() => setRenewing(false)} className={small}>
                إلغاء التجديد
              </button>
            </div>
          </div>
        )}
        {current.length === 0 ? (
          <p className="m-0 text-[15px] leading-8 text-muted">لا توجد ملاحظات هذا الأسبوع بعد.</p>
        ) : (
          <ul aria-label="ملاحظات هذا الأسبوع" className="m-0 flex list-none flex-col gap-3 p-0">
            {current.map(item)}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-bold">الأرشيف</h2>
        {archives.length === 0 ? (
          <p className="m-0 rounded-2xl border border-dashed border-line bg-card p-5 text-[15px] leading-8 text-muted">
            لم أنقل ملاحظات إلى الأرشيف بعد.
          </p>
        ) : (
          archives.map(([archivedAt, rows]) => {
            const isOpen = open.has(archivedAt);
            const id = `archive-${archivedAt}`;
            const toggle = () =>
              setOpen((prev) => {
                const next = new Set(prev);
                if (!next.delete(archivedAt)) next.add(archivedAt);
                return next;
              });
            return (
              <div key={archivedAt} className="overflow-hidden rounded-2xl border border-line bg-card">
                <button
                  type="button"
                  id={`${id}-toggle`}
                  aria-expanded={isOpen}
                  aria-controls={id}
                  onClick={toggle}
                  className="flex min-h-16 w-full items-center gap-3 p-4 text-start"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-bold text-ink">
                      {`أُرشفت في ${formatArabicDate(dayKey(new Date(archivedAt)))} · ${notesPhrase(rows.length)}`}
                    </span>
                    {!isOpen && <span className="truncate text-[13px] text-muted">{rows[0].text}</span>}
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className={`h-5 w-5 shrink-0 fill-none stroke-teal stroke-2 transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <div
                  className={`grid transition-[grid-template-rows,visibility] duration-300 ease-out motion-reduce:transition-none ${
                    isOpen ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]'
                  }`}
                >
                  <div
                    id={id}
                    role="region"
                    aria-labelledby={`${id}-toggle`}
                    aria-hidden={!isOpen}
                    className="min-h-0 overflow-hidden"
                  >
                    <div
                      className={`border-t border-line p-4 transition-opacity duration-300 motion-reduce:transition-none ${
                        isOpen ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <ul className="m-0 flex list-none flex-col gap-3 p-0">{rows.map(item)}</ul>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
