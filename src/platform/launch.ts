import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Android: the system splash stays until the web page has painted its own static splash (two frames), then
 * hands over with no extra fade, so there is neither a blank flash nor a second forced wait.
 */
export async function releaseNativeSplash(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  try {
    await SplashScreen.hide({ fadeOutDuration: 0 });
  } catch {
    // The system splash is only decoration; a failure must never block the app.
  }
}
