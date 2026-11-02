import { useRef, useState } from 'react';
import { useI18n } from '../i18n/LanguageProvider';

/**
 * One line to type an item into and add it. The field keeps focus and empties after each add,
 * so several items can go in one after another without tapping the field again.
 */
export function AddItemRow({
  label,
  onAdd,
  onDone,
}: {
  label: string;
  onAdd: (text: string) => void | Promise<void>;
  /** When given, a «تم» button next to «إضافة» closes the row. */
  onDone?: () => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  async function add() {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await onAdd(text);
      setDraft('');
    } finally {
      setBusy(false);
      field.current?.focus();
    }
  }

  return (
    <form
      className="flex min-w-0 gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void add();
      }}
    >
      <input
        ref={field}
        type="text"
        aria-label={label}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="min-h-12 min-w-0 flex-1 rounded-2xl border border-line bg-card px-3.5 text-base text-ink"
      />
      <button
        type="submit"
        disabled={busy}
        className="min-h-12 shrink-0 rounded-2xl border-[1.5px] border-teal bg-card px-5 text-[15px] font-bold text-teal-ink disabled:opacity-50"
      >
        {t({ ar: 'إضافة', en: 'Add' })}
      </button>
      {onDone && (
        <button
          type="button"
          onClick={onDone}
          className="min-h-12 shrink-0 rounded-2xl border border-line bg-card px-4 text-[15px] font-bold text-ink"
        >
          {t({ ar: 'تم', en: 'Done' })}
        </button>
      )}
    </form>
  );
}
