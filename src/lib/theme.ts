import type { Settings } from '../db/schema';

/** Automatic mode leaves CSS free to follow the device's current colour scheme. */
export function applyTheme(theme: Settings['theme']): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = theme;
}
