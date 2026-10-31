import { z } from 'zod';

export const StepSchema = z.object({
  id: z.number().int().min(1).max(10),
  title: z.string().min(1),
  coreQuestion: z.string().min(1),
  lesson: z.string().min(1),
});
export type Step = z.infer<typeof StepSchema>;

export const PromptKindSchema = z.enum(['text', 'chips', 'scale', 'choice', 'list', 'emotion', 'summary']);

const OptionSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
});

const FieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  placeholder: z.string().optional(),
});

export const PromptSchema = z.object({
  id: z.string().min(1),
  kind: PromptKindSchema,
  label: z.string().min(1),
  hint: z.string().optional(),
  example: z.string().optional(),
  options: z.array(OptionSchema).optional(),
  fields: z.array(FieldSchema).optional(),
  /** Adds a free-text box (chips and choice prompts). */
  textLabel: z.string().optional(),
  /** Editable sentence for chips; `{label}` is replaced by the chosen chip labels. */
  template: z.string().optional(),
  multi: z.boolean().optional(),
  prefill: z.literal('soothingList').optional(),
  showWhen: z.object({ promptId: z.string().min(1), equals: z.string().min(1) }).optional(),
});
export type Prompt = z.infer<typeof PromptSchema>;

export const SinkSchema = z.enum(['letter:self', 'letter:gratitude', 'letter:forgiveness', 'acceptDecision']);

export const PracticeDefSchema = z.object({
  id: z.string().min(1),
  stepId: z.number().int().min(1).max(10),
  title: z.string().min(1),
  prompts: z.array(PromptSchema).min(1),
  sink: SinkSchema.optional(),
});
export type PracticeDef = z.infer<typeof PracticeDefSchema>;

/** Throws when a practice breaks its schema or the rules the engine relies on. */
export function validatePractice(def: PracticeDef): void {
  PracticeDefSchema.parse(def);
  const seen = new Set<string>();
  for (const p of def.prompts) {
    if (seen.has(p.id)) throw new Error(`Duplicate prompt id ${p.id} in ${def.id}`);
    if ((p.kind === 'chips' || p.kind === 'choice') && !p.options?.length) {
      throw new Error(`Prompt ${p.id} in ${def.id} needs options`);
    }
    if (p.showWhen && !seen.has(p.showWhen.promptId)) {
      throw new Error(`showWhen of ${p.id} in ${def.id} must point at an earlier prompt`);
    }
    seen.add(p.id);
  }
}

export const EmotionWordSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

export const EmotionGroupSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  words: z.array(EmotionWordSchema).min(1),
});
export type EmotionGroup = z.infer<typeof EmotionGroupSchema>;
