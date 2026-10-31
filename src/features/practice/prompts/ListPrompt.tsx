import { useEffect, useState } from 'react';
import { useOptionalRepo } from '../../../db/RepoContext';
import type { PromptProps } from './types';

export function ListPrompt({ prompt, value, onChange }: PromptProps) {
  const repo = useOptionalRepo();
  const items = Array.isArray(value) ? (value as string[]) : [];
  const [draft, setDraft] = useState('');

  // The first time only: start from the user's soothing list. An emptied list stays empty.
  useEffect(() => {
    if (prompt.prefill !== 'soothingList' || value !== undefined || !repo) return;
    let alive = true;
    void repo.listSoothing().then((list) => {
      if (alive && list.length > 0) onChange(list.map((s) => s.text));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function add() {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, text]);
    setDraft('');
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((item, i) => (
          <li
            key={`${i}-${item}`}
            className="flex items-center gap-2 rounded-2xl border border-line bg-card py-1 ps-3.5 pe-1 text-[15px] leading-7"
          >
            <span className="flex-1">{item}</span>
            <button
              type="button"
              aria-label={`حذف: ${item}`}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="flex min-h-11 min-w-11 items-center justify-center text-lg text-muted"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          type="text"
          aria-label="إضافة"
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
    </div>
  );
}
