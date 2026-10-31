import { z } from 'zod';

export const StepSchema = z.object({
  id: z.number().int().min(1).max(10),
  title: z.string().min(1),
  coreQuestion: z.string().min(1),
  lesson: z.string().min(1),
});
export type Step = z.infer<typeof StepSchema>;

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
