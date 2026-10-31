import type { PracticeDef } from '../schema';

/** Every guided practice. Steps 1 to 3 and 4 to 10 register themselves here. */
export const practices: PracticeDef[] = [];

export function practiceById(id: string): PracticeDef | undefined {
  return practices.find((p) => p.id === id);
}

export function practicesForStep(stepId: number): PracticeDef[] {
  return practices.filter((p) => p.stepId === stepId);
}
