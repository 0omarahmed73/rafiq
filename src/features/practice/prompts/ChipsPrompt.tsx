import { Chip } from '../../../components/Chip';
import type { Prompt } from '../../../content/schema';
import { t } from '../../../i18n';
import { useI18n } from '../../../i18n/LanguageProvider';
import type { PromptProps } from './types';

interface ChipsValue {
  values: string[];
  text?: string;
}

function autoText(prompt: Prompt, values: string[]): string {
  if (!prompt.template || values.length === 0) return '';
  const labels = values.map((v) => {
    const option = prompt.options?.find((o) => o.value === v);
    return option ? t(option.label) : v;
  });
  return t(prompt.template).replace('{label}', labels.join(t({ ar: ' و', en: ' and ' })));
}

export function ChipsPrompt({ prompt, value, onChange }: PromptProps) {
  const { t } = useI18n();
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
            label={t(o.label)}
            selected={current.values.includes(o.value)}
            onToggle={() => toggle(o.value)}
          />
        ))}
      </div>
      {hasText && (
        <textarea
          aria-label={t(prompt.template ? { ar: 'أقولها لنفسي', en: 'Say it to myself' } : prompt.textLabel!)}
          rows={prompt.template ? 3 : 4}
          value={current.text ?? ''}
          onChange={(e) => onChange({ ...current, text: e.target.value })}
          className="w-full rounded-2xl border border-line bg-card p-3 text-base leading-8 text-ink"
        />
      )}
    </div>
  );
}
