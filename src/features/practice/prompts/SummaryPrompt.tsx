import type { PromptProps } from './types';

/** An information screen with no input; the label and hint are the content. */
export function SummaryPrompt({ prompt }: PromptProps) {
  return prompt.hint ? <p className="text-base leading-8 text-ink">{prompt.hint}</p> : <></>;
}
