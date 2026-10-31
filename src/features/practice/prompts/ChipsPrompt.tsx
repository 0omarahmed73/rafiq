import { Chip } from '../../../components/Chip';
import type { Prompt } from '../../../content/schema';
import type { PromptProps } from './types';

interface ChipsValue {
  values: string[];
  text?: string;
}

function autoText(prompt: Prompt, values: string[]): string {
  if (!prompt.template || values.length === 0) return '';
  const labels = values.map((v) => prompt.options?.find((o) => o.value === v)?.label ?? v);
  return prompt.template.replace('{label}', labels.join(' و'));
}

export function ChipsPrompt({ prompt, value, onChange }: PromptProps) {
  const current = (value ?? { values: [] }) as ChipsValue;
  const hasText = Boolean(prompt.template || prompt.textLabel);

  function toggle(option: string) {
    const selected = current.values.includes(option);
    const values = prompt.multi
      ? selected
        ? current.values.filter((v) => v !== option)
        : [...current.values, option]
      : selected
        ? []
        : [option];
    let text = current.text;
    if (prompt.template && (!text || text === autoText(prompt, current.values))) {
      text = autoText(prompt, values);
    }
    onChange({ values, ...(text !== undefined ? { text } : {}) });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {prompt.options?.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            selected={current.values.includes(o.value)}
            onToggle={() => toggle(o.value)}
          />
        ))}
      </div>
      {hasText && (
        <textarea
          aria-label={prompt.template ? 'أقولها لنفسي' : prompt.textLabel}
          rows={prompt.template ? 3 : 4}
          value={current.text ?? ''}
          onChange={(e) => onChange({ ...current, text: e.target.value })}
          className="w-full rounded-2xl border border-line bg-card p-3 text-base leading-8 text-ink"
        />
      )}
    </div>
  );
}
