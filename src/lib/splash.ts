const FADE_MS = 350;
/** Long enough to be seen and to feel calm, short enough not to get in the way. */
export const SPLASH_MIN_MS = 1200;

/**
 * Fades out and removes the static splash that index.html shows while the app starts. It stays up
 * until `minMs` have passed since the page began loading (`elapsedMs`), even if the app is ready sooner.
 */
export function hideSplash(
  doc: Document = document,
  opts: { reducedMotion?: boolean; elapsedMs?: number; minMs?: number } = {},
): void {
  const el = doc.getElementById('splash');
  if (!el) return;
  const reduced =
    opts.reducedMotion ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const elapsed = opts.elapsedMs ?? (typeof performance !== 'undefined' ? performance.now() : SPLASH_MIN_MS);
  const wait = Math.max(0, (opts.minMs ?? SPLASH_MIN_MS) - elapsed);

  const run = () => {
    if (reduced) {
      el.remove();
      return;
    }
    el.classList.add('splash-hide');
    setTimeout(() => el.remove(), FADE_MS);
  };
  if (wait > 0) setTimeout(run, wait);
  else run();
}
