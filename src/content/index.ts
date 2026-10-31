import { z } from 'zod';
import { emotionGroups } from './emotions';
import { EmotionGroupSchema, StepSchema } from './schema';
import { steps } from './steps';

export { emotionGroups } from './emotions';
export { steps } from './steps';
export type { EmotionGroup, Step } from './schema';

const labelById = new Map(emotionGroups.flatMap((g) => g.words).map((w) => [w.id, w.label]));

/** Arabic label for an emotion id; an unknown id is returned unchanged. */
export function emotionLabel(id: string): string {
  return labelById.get(id) ?? id;
}

/** Throws if the shipped content breaks its schema or its id rules. */
export function validateContent(): void {
  const parsedSteps = z.array(StepSchema).length(10).parse(steps);
  parsedSteps.forEach((s, i) => {
    if (s.id !== i + 1) throw new Error(`Step at position ${i + 1} has id ${s.id}`);
  });
  const parsedGroups = z.array(EmotionGroupSchema).min(1).parse(emotionGroups);
  const ids = parsedGroups.flatMap((g) => g.words.map((w) => w.id));
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate emotion id');
}
