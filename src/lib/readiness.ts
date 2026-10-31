export type Readiness = 'ready' | 'stay';

/** A mean of 3.5 or more out of 5 means it seems time to move on; no answers means stay. */
export function readinessMessage(answers: number[]): Readiness {
  if (answers.length === 0) return 'stay';
  const mean = answers.reduce((a, b) => a + b, 0) / answers.length;
  return mean >= 3.5 ? 'ready' : 'stay';
}
