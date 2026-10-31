export type Trend = 'up' | 'flat' | 'down';

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Compares the mean of the first half with the mean of the second half
 * (the middle value of an odd-length list is ignored). A difference under 0.5 is flat.
 */
export function trendOf(values: number[]): Trend {
  const half = Math.floor(values.length / 2);
  if (half === 0) return 'flat';
  const first = values.slice(0, half);
  const second = values.slice(values.length - half);
  const diff = mean(second) - mean(first);
  if (Math.abs(diff) < 0.5) return 'flat';
  return diff > 0 ? 'up' : 'down';
}
