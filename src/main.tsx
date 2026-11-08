import './styles/tokens.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router-dom';
import { App, SYNC_MERGED_EVENT } from './App';
import { openDb } from './db/open';
import { loadLock } from './features/lock/lockStore';
import { createSyncAccount } from './features/sync/syncAccount';
import { createSyncEngine } from './features/sync/syncEngine';
import { createSupabaseServer, isSyncConfigured } from './features/sync/supabaseServer';
import { withChangeSignal } from './features/sync/changeSignal';
import { installAccents } from './lib/accents';
import { applyTheme } from './lib/theme';
import { installAndroidLifecycle } from './platform/lifecycle';
import { handOverSplash } from './platform/launch';
import { installReminderLifecycle, reconcileDailyReminder } from './platform/notifications';
import { routes } from './routes';

const splashStartedAt = performance.now();

async function boot() {
  // The lock record is loaded before the first render, so a locked app is locked from the first frame.
  const [{ repo, persistent }] = await Promise.all([openDb(), loadLock()]);
  const settings = await repo.getSettings();
  applyTheme(settings.theme);
  installAccents(settings.accent);
  const router = createBrowserRouter(routes);
  void installAndroidLifecycle(router);
  void installReminderLifecycle(repo, (to) => router.navigate(to));
  void reconcileDailyReminder(repo);
  let appRepo = repo;
  let sync: Parameters<typeof App>[0]['sync'];
  if (isSyncConfigured()) {
    const server = createSupabaseServer();
    const engine = createSyncEngine({
      repo,
      server,
      onMerged: () => {
        window.dispatchEvent(new Event(SYNC_MERGED_EVENT));
      },
    });
    const account = createSyncAccount({ server, engine, repo });
    appRepo = withChangeSignal(repo, () => engine.requestSync('change'));
    sync = { engine, account };
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App router={router} repo={appRepo} persistent={persistent} language={settings.language} sync={sync} />
    </StrictMode>,
  );
  // Let the first screen paint underneath, then hand over from the system splash and fade the web splash.
  void handOverSplash(splashStartedAt);
}

void boot();
