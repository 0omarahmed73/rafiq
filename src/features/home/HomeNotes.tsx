import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRepo } from '../../db/RepoContext';
import { newId } from '../../db/repo';
import { useI18n } from '../../i18n/LanguageProvider';

/** A quick way to jot a note from Home; «تجديد» and the archive live on the full notes page. */
export function HomeNotes() {
  const repo = useRepo();
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

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
      box.current?.focus();
      setMessage({ kind: 'ok', text: t({ ar: 'أضفتُ الملاحظة.', en: 'I added the note.' }) });
      await refresh();
    } catch {
      setMessage({
        kind: 'error',
        text: t({ ar: 'تعذّر الحفظ، يمكنني المحاولة مرة أخرى.', en: 'Could not save. I can try again.' }),
      });
    }
  }

  return (
    <section aria-labelledby="home-notes-title" className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
      <h2 id="home-notes-title" className="text-base font-bold text-teal-ink">
        {t({ ar: 'ملاحظاتي', en: 'My notes' })}
      </h2>
      <label htmlFor="home-note" className="sr-only">
        {t({ ar: 'ملاحظة سريعة', en: 'Quick note' })}
      </label>
      <textarea
        ref={box}
        id="home-note"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t({ ar: 'أكتب ما أريد تذكّره…', en: 'Write what I want to remember…' })}
        className="min-h-20 w-full resize-y rounded-2xl border border-line bg-card p-3.5 text-base leading-8 text-ink"
      />
      <button
        type="button"
        onClick={() => void save()}
        disabled={!draft.trim()}
        className="min-h-12 rounded-full bg-teal px-6 text-[15px] font-bold text-card disabled:opacity-50"
      >
        {t({ ar: 'إضافة ملاحظة', en: 'Add note' })}
      </button>
      {message && (
        <p role={message.kind === 'error' ? 'alert' : 'status'} className="m-0 text-sm font-semibold text-teal-ink">
          {message.text}
        </p>
      )}
      <Link to="/therapist/notes" className="flex min-h-11 items-center justify-between text-[15px] font-semibold text-teal">
        <span>
          {count > 0
            ? t({ ar: 'كل ملاحظاتي ({count})', en: 'All my notes ({count})' }, { count })
            : t({ ar: 'كل ملاحظاتي', en: 'All my notes' })}
        </span>
        <span aria-hidden="true">{t({ ar: '‹', en: '›' })}</span>
      </Link>
    </section>
  );
}
