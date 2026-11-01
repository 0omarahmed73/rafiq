import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRepo } from '../../db/RepoContext';
import { newId } from '../../db/repo';
import { toArabicDigits } from '../../lib/digits';

/** A quick way to jot a note from Home; «تجديد» and the archive live on the full notes page. */
export function HomeNotes() {
  const repo = useRepo();
  const [draft, setDraft] = useState('');
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const refresh = () => repo.listNotes().then((rows) => setCount(rows.filter((n) => !n.archivedAt).length));
  useEffect(() => {
    let alive = true;
    void repo.listNotes().then((rows) => alive && setCount(rows.filter((n) => !n.archivedAt).length));
    return () => {
      alive = false;
    };
  }, [repo]);

  async function save() {
    const text = draft.trim();
    if (!text) return;
    setMessage(null);
    try {
      await repo.saveNote({ id: newId(), text, createdAt: new Date().toISOString() });
      setDraft('');
      setMessage({ kind: 'ok', text: 'أضفتُ الملاحظة.' });
      await refresh();
    } catch {
      setMessage({ kind: 'error', text: 'تعذّر الحفظ، يمكنني المحاولة مرة أخرى.' });
    }
  }

  return (
    <section aria-labelledby="home-notes-title" className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
      <h2 id="home-notes-title" className="text-base font-bold text-teal-ink">
        ملاحظاتي
      </h2>
      <label htmlFor="home-note" className="sr-only">
        ملاحظة سريعة
      </label>
      <textarea
        id="home-note"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="أكتب ما أريد تذكّره…"
        className="min-h-20 w-full resize-y rounded-2xl border border-line bg-card p-3.5 text-base leading-8 text-ink"
      />
      <button
        type="button"
        onClick={() => void save()}
        disabled={!draft.trim()}
        className="min-h-12 rounded-full bg-teal px-6 text-[15px] font-bold text-card disabled:opacity-50"
      >
        إضافة ملاحظة
      </button>
      {message && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className="m-0 text-sm font-semibold text-teal-ink">
          {message.text}
        </p>
      )}
      <Link to="/therapist/notes" className="flex min-h-11 items-center justify-between text-[15px] font-semibold text-teal">
        <span>{count > 0 ? `كل ملاحظاتي (${toArabicDigits(count)})` : 'كل ملاحظاتي'}</span>
        <span aria-hidden="true">‹</span>
      </Link>
    </section>
  );
}
