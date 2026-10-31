import type { PracticeDef } from '../schema';
import { accept } from './accept';
import { regulation, regulationFollowup } from './regulation';
import { validate } from './validate';

/** Every guided practice. Steps 4 to 10 are added here by their own files. */
export const practices: PracticeDef[] = [validate, accept, regulation, regulationFollowup];

export function practiceById(id: string): PracticeDef | undefined {
  return practices.find((p) => p.id === id);
}

export function practicesForStep(stepId: number): PracticeDef[] {
  return practices.filter((p) => p.stepId === stepId);
}
