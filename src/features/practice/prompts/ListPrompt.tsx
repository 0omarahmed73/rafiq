import { useEffect } from 'react';
import { AddItemRow } from '../../../components/AddItemRow';
import { useOptionalRepo } from '../../../db/RepoContext';
import { useI18n } from '../../../i18n/LanguageProvider';
import type { PromptProps } from './types';

export function ListPrompt({ prompt, value, onChange }: PromptProps) {
  const { t } = useI18n();
  const repo = useOptionalRepo();
  const items = Array.isArray(value) ? (value as string[]) : [];

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

  function remove(index: number) {
    const item = items[index];
    onChange(items.filter((_, j) => j !== index));
    // A soothing list is one list: an item removed here must not come back from it next time.
    if (repo && (prompt.prefill === 'soothingList' || prompt.saveToSoothing)) void repo.removeSoothing(item);
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((item, i) => (
          <li
            key={`${i}-${item}`}
            className="flex items-center gap-2 rounded-2xl border border-line bg-card py-1 ps-3.5 pe-1 text-[15px] leading-7"
          >
            <span className="min-w-0 flex-1 break-words">{item}</span>
            <button
              type="button"
              aria-label={t({ ar: 'حذف: {item}', en: 'Remove: {item}' }, { item })}
              onClick={() => remove(i)}
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center text-lg text-muted"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <AddItemRow label={t({ ar: 'إضافة', en: 'Add' })} onAdd={(text) => onChange([...items, text])} />
    </div>
  );
}
