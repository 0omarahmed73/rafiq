import { useI18n } from '../../../i18n/LanguageProvider';
import type { PromptProps } from './types';

/** An information screen with no input; the label and hint are the content. */
export function SummaryPrompt({ prompt }: PromptProps) {
  const { t } = useI18n();
  return prompt.hint ? <p className="text-base leading-8 text-ink">{t(prompt.hint)}</p> : <></>;
}
