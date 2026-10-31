import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export interface LifecycleRouter {
  navigate(to: number | string, options?: { replace?: boolean }): unknown;
  state: { location: { pathname: string } };
}

/** True when the browser history holds an earlier entry of this app to go back to. */
function hasHistory(): boolean {
  // React Router stamps each entry with an index; 0 is the first entry of this session.
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === 'number' ? idx > 0 : window.history.length > 1;
}

/**
 * Android only: Back walks the app history and exits from the home route; a cold launch on another route
 * (no history) returns home instead of exiting; going to the background flushes drafts through the same
 * `pagehide` signal the practice runner already listens to. Returns a cleanup that removes the listeners.
 */
export async function installAndroidLifecycle(router: LifecycleRouter): Promise<() => void> {
  if (Capacitor.getPlatform() !== 'android') return () => {};

  const back = await App.addListener('backButton', () => {
    if (router.state.location.pathname === '/') void App.exitApp();
    else if (hasHistory()) router.navigate(-1);
    else router.navigate('/', { replace: true });
  });
  const state = await App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) window.dispatchEvent(new Event('pagehide'));
  });

  return () => {
    void back.remove();
    void state.remove();
  };
}
