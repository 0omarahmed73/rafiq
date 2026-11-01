import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { SPLASH_MIN_MS } from '../lib/splash';

/**
 * Android: after the app has rendered, keep the system splash up until the web splash is ready and the minimum
 * startup time has passed. This avoids a flash on quick launches and a blank screen on slow storage.
 */
export async function releaseNativeSplash(
  splashStartedAt = performance.now(),
  minimumVisibleMs = SPLASH_MIN_MS,
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
