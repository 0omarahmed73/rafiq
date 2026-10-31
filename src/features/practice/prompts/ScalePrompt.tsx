import { IntensitySlider } from '../../../components/IntensitySlider';
import type { PromptProps } from './types';

export function ScalePrompt({ prompt, value, onChange }: PromptProps) {
  return (
    <IntensitySlider
      label={prompt.hint ?? prompt.label}
      value={typeof value === 'number' ? value : 5}
      onChange={onChange}
    />
  );
}
