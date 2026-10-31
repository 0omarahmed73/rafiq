import type { Prompt } from '../../../content/schema';

export interface PromptProps {
  prompt: Prompt;
  value: unknown;
  onChange: (value: unknown) => void;
}
