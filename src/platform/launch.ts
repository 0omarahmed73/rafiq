import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { hideSplash } from '../lib/splash';

/**
 * Android: once the app has rendered and the web splash has painted, hide the system splash. By default it
 * hands over at once, so the animated web splash (name, tagline) is seen instead of being cut off.
 */
export async function releaseNativeSplash(
  splashStartedAt = performance.now(),
  minimumVisibleMs = 0,
): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const remaining = Math.max(0, minimumVisibleMs - (performance.now() - splashStartedAt));
  if (remaining > 0) await new Promise<void>((resolve) => setTimeout(resolve, remaining));
  try {
    await SplashScreen.hide({ fadeOutDuration: 0 });
  } catch {
    // The system splash is only decoration; a failure must never block the app.
  }
}

/**
 * Android: the system splash (the mark alone) hands over to the animated web splash, which stays for its own time and
 * then fades. Browser: the web splash fades after its normal minimum.
 */
export async function handOverSplash(splashStartedAt = performance.now()): Promise<void> {
  if (Capacitor.getPlatform() === 'android') {
    await releaseNativeSplash(splashStartedAt);
    hideSplash(document, { native: true });
    return;
  }
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  hideSplash(document);
}
