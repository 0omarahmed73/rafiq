import type { PracticeDef } from '../schema';
import { accept } from './accept';
import { boundaries } from './boundaries';
import { care } from './care';
import { compassion, compassionLetter, gratitudeLetter } from './compassion';
import { forgive, forgivenessLetter } from './forgive';
import { regulation, regulationFollowup } from './regulation';
import { trust } from './trust';
import { understand } from './understand';
import { validate } from './validate';
import { values } from './values';

/** Every guided practice, in step order. */
export const practices: PracticeDef[] = [
  validate,
  accept,
  regulation,
  regulationFollowup,
  understand,
  compassion,
  compassionLetter,
  gratitudeLetter,
  forgive,
  forgivenessLetter,
  boundaries,
  trust,
  care,
  values,
];

export function practiceById(id: string): PracticeDef | undefined {
  return practices.find((p) => p.id === id);
}

export function practicesForStep(stepId: number): PracticeDef[] {
  return practices.filter((p) => p.stepId === stepId);
}
