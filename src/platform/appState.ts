import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Reports whether the app is in the foreground: `document.visibilitychange` everywhere, plus Capacitor's
 * `appStateChange` on Android. Returns a cleanup that removes every listener.
 */
export function onForegroundChange(cb: (active: boolean) => void): () => void {
  const onVisibility = () => cb(!document.hidden);
  document.addEventListener('visibilitychange', onVisibility);

  let stopped = false;
  let removeNative: (() => void) | undefined;
  if (Capacitor.getPlatform() === 'android') {
    void App.addListener('appStateChange', ({ isActive }) => cb(isActive))
      .then((handle) => {
        if (stopped) void handle.remove();
        else removeNative = () => void handle.remove();
      })
      .catch(() => {});
  }

  return () => {
    stopped = true;
    document.removeEventListener('visibilitychange', onVisibility);
    removeNative?.();
  };
}
