import { useId } from 'react';
import type { PromptProps } from './types';

interface ChoiceValue {
  value?: string;
  text?: string;
}

export function ChoicePrompt({ prompt, value, onChange }: PromptProps) {
  const base = useId();
  const current = (value ?? {}) as ChoiceValue;

  return (
    <div className="flex flex-col gap-4">
      {prompt.textLabel && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`${base}-text`} className="text-[13px] font-semibold text-muted">
            {prompt.textLabel}
          </label>
          <input
            id={`${base}-text`}
            type="text"
            value={current.text ?? ''}
            onChange={(e) => onChange({ ...current, text: e.target.value })}
            className="min-h-12 w-full rounded-2xl border border-line bg-card px-3.5 text-base text-ink"
          />
        </div>
      )}
      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className="sr-only">{prompt.label}</legend>
        {prompt.options?.map((o) => (
          <label
            key={o.value}
            className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl border-[1.5px] p-3.5 ${
              current.value === o.value ? 'border-teal bg-teal-soft' : 'border-line bg-card'
            }`}
          >
            <input
              type="radio"
              name={`${base}-choice`}
              checked={current.value === o.value}
              onChange={() => onChange({ ...current, value: o.value })}
              aria-labelledby={`${base}-${o.value}-t`}
              aria-describedby={o.description ? `${base}-${o.value}-d` : undefined}
              className="mt-1 h-[22px] w-[22px] shrink-0 accent-teal"
            />
            <span>
              <span id={`${base}-${o.value}-t`} className="block text-base font-bold">
                {o.label}
              </span>
              {o.description && (
                <span id={`${base}-${o.value}-d`} className="block text-sm leading-6 text-muted">
                  {o.description}
                </span>
              )}
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}
