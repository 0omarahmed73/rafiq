import { useId } from 'react';
import { useI18n } from '../../../i18n/LanguageProvider';
import type { PromptProps } from './types';

const box = 'w-full rounded-2xl border border-line bg-card p-3 text-base leading-8 text-ink';

export function TextPrompt({ prompt, value, onChange }: PromptProps) {
  const { t } = useI18n();
  const base = useId();
  const current = (value ?? {}) as Record<string, string>;
  const set = (id: string, text: string) => onChange({ ...current, [id]: text });

  if (!prompt.fields) {
    return (
      <textarea
        aria-label={t(prompt.label)}
        rows={6}
        value={current.text ?? ''}
        onChange={(e) => set('text', e.target.value)}
        className={box}
      />
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {prompt.fields.map((f) => (
        <div key={f.id} className="flex flex-col gap-1.5">
          <label htmlFor={`${base}-${f.id}`} className="text-[13px] font-semibold text-muted">
            {t(f.label)}
          </label>
          <textarea
            id={`${base}-${f.id}`}
            rows={4}
            placeholder={f.placeholder ? t(f.placeholder) : undefined}
            value={current[f.id] ?? ''}
            onChange={(e) => set(f.id, e.target.value)}
            className={box}
          />
        </div>
      ))}
    </div>
  );
}
