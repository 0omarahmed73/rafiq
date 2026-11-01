const FADE_MS = 350;
/** Long enough to be seen and to feel calm, short enough not to get in the way. */
export const SPLASH_MIN_MS = 1200;
/** Inside the Android app: how long the animated web splash stays once the system splash has handed over to it. */
export const ANDROID_WEB_SPLASH_MS = 1500;

/**
 * Fades out and removes the static splash that index.html shows while the app starts. It stays up
 * until `minMs` have passed since the page began loading (`elapsedMs`), even if the app is ready sooner.
 */
export function hideSplash(
  doc: Document = document,
  opts: { reducedMotion?: boolean; elapsedMs?: number; minMs?: number; native?: boolean } = {},
): void {
  const el = doc.getElementById('splash');
  if (!el) return;
  const reduced =
    opts.reducedMotion ?? (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const elapsed = opts.elapsedMs ?? (typeof performance !== 'undefined' ? performance.now() : SPLASH_MIN_MS);
  // Inside the Android app the system splash only shows the mark, so the animated web splash is revealed when it
  // hands over and stays for its own time, counted from now rather than from the page start.
  const wait = opts.native ? (opts.minMs ?? ANDROID_WEB_SPLASH_MS) : Math.max(0, (opts.minMs ?? SPLASH_MIN_MS) - elapsed);

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
