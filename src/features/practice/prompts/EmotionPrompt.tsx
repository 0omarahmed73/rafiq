import { Chip } from '../../../components/Chip';
import { IntensitySlider } from '../../../components/IntensitySlider';
import { emotionGroups, emotionLabel } from '../../../content';
import type { PromptProps } from './types';

interface EmotionEntry {
  id: string;
  intensity: number;
}

export function EmotionPrompt({ prompt, value, onChange }: PromptProps) {
  const entries = Array.isArray(value) ? (value as EmotionEntry[]) : [];

  function toggle(id: string) {
    if (entries.some((e) => e.id === id)) {
      onChange(entries.filter((e) => e.id !== id));
    } else if (prompt.multi) {
      onChange([...entries, { id, intensity: 5 }]);
    } else {
      onChange([{ id, intensity: 5 }]);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {emotionGroups.map((g) => (
        <fieldset key={g.id} className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-[13px] font-semibold text-muted">{g.label}</legend>
          <div className="flex flex-wrap gap-2">
            {g.words.map((w) => (
              <Chip
                key={w.id}
                label={w.label}
                selected={entries.some((e) => e.id === w.id)}
                onToggle={() => toggle(w.id)}
              />
            ))}
          </div>
        </fieldset>
      ))}
      {entries.map((e) => (
        <section key={e.id} className="rounded-2xl border border-line bg-card p-4">
          <IntensitySlider
            label={`شدّة ${emotionLabel(e.id)}`}
            value={e.intensity}
            onChange={(intensity) =>
              onChange(entries.map((x) => (x.id === e.id ? { ...x, intensity } : x)))
            }
          />
        </section>
      ))}
    </div>
  );
}
