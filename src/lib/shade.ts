export type Shade = 'light' | 'mid' | 'strong';

/** Calendar shade for a day, from its highest intensity (0..10). */
export function shadeFor(maxIntensity: number): Shade {
  if (maxIntensity <= 3) return 'light';
  if (maxIntensity <= 6) return 'mid';
  return 'strong';
}
