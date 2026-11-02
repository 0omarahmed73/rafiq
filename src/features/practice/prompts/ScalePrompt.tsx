import { IntensitySlider } from '../../../components/IntensitySlider';
import { useI18n } from '../../../i18n/LanguageProvider';
import type { PromptProps } from './types';

export function ScalePrompt({ prompt, value, onChange }: PromptProps) {
  const { t } = useI18n();
  return (
    <IntensitySlider
      label={t(prompt.hint ?? prompt.label)}
      value={typeof value === 'number' ? value : 5}
      onChange={onChange}
    />
  );
}
