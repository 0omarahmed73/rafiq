import { z } from 'zod';
import type { Bi } from '../i18n';

/** Text in both languages. Arabic is the original; the English is a draft until the therapist has read it. */
export const BiSchema = z.object({ ar: z.string().min(1), en: z.string().min(1) });

export const StepSchema = z.object({
  id: z.number().int().min(1).max(10),
  title: BiSchema,
  coreQuestion: BiSchema,
  lesson: BiSchema,
});
export type Step = z.infer<typeof StepSchema>;

export const PromptKindSchema = z.enum(['text', 'chips', 'scale', 'choice', 'list', 'emotion', 'summary']);

const OptionSchema = z.object({
  /** The stored answer. It is an id, so saved answers read the same in either language. */
  value: z.string().min(1),
  label: BiSchema,
  description: BiSchema.optional(),
});

const FieldSchema = z.object({
  id: z.string().min(1),
  label: BiSchema,
  placeholder: BiSchema.optional(),
});

export const PromptSchema = z.object({
  id: z.string().min(1),
  kind: PromptKindSchema,
  label: BiSchema,
  hint: BiSchema.optional(),
  example: BiSchema.optional(),
  options: z.array(OptionSchema).optional(),
  fields: z.array(FieldSchema).optional(),
  /** Adds a free-text box (chips and choice prompts). */
  textLabel: BiSchema.optional(),
  /** Editable sentence for chips; `{label}` is replaced by the chosen chip labels. */
  template: BiSchema.optional(),
  multi: z.boolean().optional(),
  prefill: z.literal('soothingList').optional(),
  /** On finish, the items of a list prompt are added to the soothing list with this source. */
  saveToSoothing: z.enum(['step1', 'step9']).optional(),
  showWhen: z.object({ promptId: z.string().min(1), equals: z.string().min(1) }).optional(),
});
export type Prompt = z.infer<typeof PromptSchema>;

export const SinkSchema = z.enum([
  'letter:self',
  'letter:gratitude',
  'letter:forgiveness',
  'acceptDecision',
  'followup',
]);

export const PracticeDefSchema = z.object({
  id: z.string().min(1),
  stepId: z.number().int().min(1).max(10),
  title: BiSchema,
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
  label: BiSchema,
});

export const EmotionGroupSchema = z.object({
  id: z.string().min(1),
  label: BiSchema,
  words: z.array(EmotionWordSchema).min(1),
});
export type EmotionGroup = z.infer<typeof EmotionGroupSchema>;

/** Keeps the type of `Bi` visible to the content files. */
export type { Bi };
