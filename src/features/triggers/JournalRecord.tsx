import { useState } from 'react';
import type { PracticeDef, Prompt } from '../../content/schema';
import { useRepo } from '../../db/RepoContext';
import type { PracticeRecord } from '../../db/schema';
import { formatAnswer } from '../summary/formatAnswer';

const primary = 'min-h-12 flex-1 rounded-full bg-teal px-5 text-[15px] font-bold text-card disabled:opacity-50';
const secondary = 'min-h-12 flex-1 rounded-full border-[1.5px] border-teal bg-card px-5 text-[15px] font-bold text-teal-ink';
const quiet = 'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-line bg-card px-4 text-[15px] font-semibold text-ink';

const icon = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

/** Imported answer payloads are deliberately open-ended; unreadable text must not break the journal. */
export function answerText(prompt: Prompt, value: unknown): string {
  if (prompt.kind !== 'text' || !value || typeof value !== 'object' || Array.isArray(value)) return '';
  const text = (value as { text?: unknown }).text;
  return typeof text === 'string' ? formatAnswer(prompt, { text }) : '';
}

type Mode = 'view' | 'edit' | 'delete';

/** The body of an opened journal record: its answers, with calm edit and delete actions. */
export function JournalRecord({
  record,
  def,
  onSaved,
  onDeleted,
}: {
  record: PracticeRecord;
  def: PracticeDef;
  onSaved: (record: PracticeRecord) => void;
  onDeleted: (id: string) => void;
}) {
  const repo = useRepo();
  const textPrompts = def.prompts.filter((p) => p.kind === 'text');
  const [mode, setMode] = useState<Mode>('view');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function startEdit() {
    setDrafts(Object.fromEntries(textPrompts.map((p) => [p.id, answerText(p, record.answers[p.id])])));
    setError('');
    setMode('edit');
  }

  function change(next: Mode) {
    setError('');
    setMode(next);
  }

  async function save() {
    setBusy(true);
    setError('');
    try {
      const answers = { ...record.answers };
      for (const p of textPrompts) {
        const text = (drafts[p.id] ?? '').trim();
        // Questions that were never answered stay absent; a cleared answer is kept as empty text.
        if (text !== '' || p.id in answers) answers[p.id] = { text };
      }
      const next = { ...record, answers };
      await repo.savePractice(next);
      onSaved(next);
      setMode('view');
    } catch {
      setError('تعذّر حفظ التعديل، يمكنني المحاولة مرة أخرى.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError('');
    try {
      await repo.deletePractice(record.id);
      onDeleted(record.id);
    } catch {
      setError('تعذّر حذف السجل، يمكنني المحاولة مرة أخرى.');
      setBusy(false);
    }
  }

  const hasText = textPrompts.some((p) => (drafts[p.id] ?? '').trim() !== '');

  return (
    <div className="border-t border-line px-4 pb-4 pt-3">
      <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold text-muted">
        {!record.share && !record.forNextSession && <span>خاص بي</span>}
        {record.share && <span>اخترتُ مشاركته</span>}
        {record.forNextSession && <span>للنقاش في جلستي</span>}
      </div>

      {mode === 'edit' ? (
        <div className="flex flex-col gap-4">
          {textPrompts.map((p) => (
            <div key={p.id} className="flex flex-col gap-1.5">
              <label htmlFor={`edit-${record.id}-${p.id}`} className="text-[13px] font-semibold leading-7 text-muted">
                {p.label}
              </label>
              <textarea
                id={`edit-${record.id}-${p.id}`}
                value={drafts[p.id] ?? ''}
                onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                rows={3}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus={p.id === textPrompts[0]?.id}
                className="min-h-24 w-full rounded-2xl border border-line bg-card px-3.5 py-3 text-base leading-8 text-ink"
              />
            </div>
          ))}
          {!hasText && <p className="m-0 text-xs text-muted">أكتب إجابة واحدة على الأقل.</p>}
          {error && <p role="alert" className="m-0 text-sm font-semibold leading-7 text-ink">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => void save()} disabled={busy || !hasText} className={primary}>حفظ التعديل</button>
            <button type="button" onClick={() => change('view')} disabled={busy} className={secondary}>إلغاء التعديل</button>
          </div>
        </div>
      ) : (
        <>
          <dl className="m-0 flex flex-col gap-4">
            {def.prompts.map((prompt) => (
              <div key={prompt.id}>
                <dt className="mb-1 text-[13px] font-semibold leading-7 text-muted">{prompt.label}</dt>
                <dd className="m-0 whitespace-pre-wrap break-words text-[15px] leading-8 text-ink">{answerText(prompt, record.answers[prompt.id]) || 'لا توجد إجابة محفوظة.'}</dd>
              </div>
            ))}
          </dl>

          {mode === 'delete' ? (
            <div role="group" aria-label="تأكيد الحذف" className="mt-4 flex flex-col gap-3 rounded-2xl bg-teal-soft p-4">
              <p className="m-0 text-[15px] font-semibold leading-8 text-teal-ink">أحذف هذا السجل؟ لا يمكن التراجع عن ذلك.</p>
              {error && <p role="alert" className="m-0 text-sm font-semibold leading-7 text-ink">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => void remove()} disabled={busy} className="min-h-12 flex-1 rounded-full bg-ink px-5 text-[15px] font-bold text-card disabled:opacity-50">نعم، أحذف</button>
                <button type="button" onClick={() => change('view')} disabled={busy} className={secondary}>إلغاء الحذف</button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={startEdit} className={quiet}>
                <svg {...icon}><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m14.5 7.5 3 3" /></svg>
                تعديل
              </button>
              <button type="button" onClick={() => change('delete')} className={quiet}>
                <svg {...icon}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" /></svg>
                حذف
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
