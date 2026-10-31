import { useState } from 'react';
import type { PromptProps } from './types';

export function ListPrompt({ value, onChange }: PromptProps) {
  const items = Array.isArray(value) ? (value as string[]) : [];
  const [draft, setDraft] = useState('');

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
