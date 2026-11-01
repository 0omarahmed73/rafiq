import './styles/tokens.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router-dom';
import { App } from './App';
import { openDb } from './db/open';
import { installAccents } from './lib/accents';
import { applyTheme } from './lib/theme';
import { hideSplash } from './lib/splash';
import { installAndroidLifecycle } from './platform/lifecycle';
import { isAndroidPlatform } from './platform/documents';
import { releaseNativeSplash } from './platform/launch';
import { installReminderLifecycle, reconcileDailyReminder } from './platform/notifications';
import { routes } from './routes';

const splashStartedAt = performance.now();

async function boot() {
  const { repo, persistent } = await openDb();
  const settings = await repo.getSettings();
  applyTheme(settings.theme);
  installAccents(settings.accent);
  const router = createBrowserRouter(routes);
  void installAndroidLifecycle(router);
  void installReminderLifecycle(repo, (to) => router.navigate(to));
  void reconcileDailyReminder(repo);
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App router={router} repo={repo} persistent={persistent} />
    </StrictMode>,
  );
  void releaseNativeSplash(splashStartedAt);
  // Let the first screen paint underneath before the splash fades.
  requestAnimationFrame(() => requestAnimationFrame(() => hideSplash(document, { native: isAndroidPlatform() })));
}

void boot();
