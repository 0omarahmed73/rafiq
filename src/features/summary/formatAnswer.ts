import { emotionLabel } from '../../content';
import type { Prompt } from '../../content/schema';
import { digits, t } from '../../i18n';

const optionLabel = (prompt: Prompt, value: string) => {
  const option = prompt.options?.find((o) => o.value === value);
  return option ? t(option.label) : value;
};

/** Separator between several answers in one line, in the active language. */
const SEP = { ar: '، ', en: ', ' };

/** A plain-text rendering of one answer for the summary; an unanswered prompt gives an empty string. */
export function formatAnswer(prompt: Prompt, value: unknown): string {
  if (value === undefined || value === null) return '';

  switch (prompt.kind) {
    case 'text': {
      const fields = value as Record<string, string>;
      if (!prompt.fields) return (fields.text ?? '').trim();
      return prompt.fields
        .filter((f) => (fields[f.id] ?? '').trim())
        .map((f) => `${t(f.label)}: ${fields[f.id].trim()}`)
        .join('\n');
    }
    case 'chips': {
      const v = value as { values?: string[]; text?: string };
      const labels = (v.values ?? []).map((x) => optionLabel(prompt, x)).join(t(SEP));
      return [labels, v.text?.trim()].filter(Boolean).join('\n');
    }
    case 'choice': {
      const v = value as { value?: string; text?: string };
      const label = v.value ? optionLabel(prompt, v.value) : '';
      return [label, v.text?.trim()].filter(Boolean).join(' — ');
    }
    case 'scale':
      return typeof value === 'number' ? `${digits(value)} / ${digits(10)}` : '';
    case 'list':
      return Array.isArray(value) ? (value as string[]).join(t(SEP)) : '';
    case 'emotion':
      return Array.isArray(value)
        ? (value as { id: string; intensity: number }[])
            .map((e) => `${emotionLabel(e.id)} ${digits(e.intensity)} / ${digits(10)}`)
            .join(t(SEP))
        : '';
    default:
      return '';
  }
}
