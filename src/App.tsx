import { useEffect } from 'react';
import { RouterProvider, type createBrowserRouter } from 'react-router-dom';
import { StorageBanner } from './components/StorageBanner';
import { RepoProvider, useRepo } from './db/RepoContext';
import type { Repo } from './db/repo';
import { type Lang } from './i18n';
import { LanguageProvider, useLanguage } from './i18n/LanguageProvider';
import { LockProvider } from './features/lock/LockProvider';
import { LockScreen } from './features/lock/LockScreen';
import { SyncProvider } from './features/sync/SyncProvider';
import type { SyncAccount } from './features/sync/syncAccount';
import type { SyncEngine } from './features/sync/syncEngine';
import { installAccents } from './lib/accents';
import { applyTheme } from './lib/theme';

type AppRouter = ReturnType<typeof createBrowserRouter>;
export const SYNC_MERGED_EVENT = 'rafiq:sync-merged';

export function App({
  router,
  repo,
  persistent,
  language,
  sync,
}: {
  router: AppRouter;
  repo: Repo;
  persistent: boolean;
  /** The saved language, or `undefined` until the person has chosen one. */
  language?: Lang;
  sync?: { engine: SyncEngine; account: SyncAccount };
}) {
  return (
    <RepoProvider repo={repo}>
      <LanguageProvider initial={language}>
        {sync ? (
          <SyncProvider engine={sync.engine} account={sync.account}>
            <SyncSettingsRefresh />
            <AppContent router={router} persistent={persistent} syncEnabled />
          </SyncProvider>
        ) : (
          <AppContent router={router} persistent={persistent} />
        )}
      </LanguageProvider>
    </RepoProvider>
  );
}

function AppContent({
  router,
  persistent,
  syncEnabled = false,
}: {
  router: AppRouter;
  persistent: boolean;
  syncEnabled?: boolean;
}) {
  return (
    <LockProvider screen={LockScreen}>
      <div className="mx-auto max-w-xl px-4 pt-4 empty:hidden">
        <StorageBanner persistent={persistent} />
      </div>
      <LocalizedRouter router={router} syncEnabled={syncEnabled} />
    </LockProvider>
  );
}

function SyncSettingsRefresh() {
  const repo = useRepo();
  const { reload } = useLanguage();

  useEffect(() => {
    const refresh = () => {
      void repo
        .getSettings()
        .then((settings) => {
          applyTheme(settings.theme);
          installAccents(settings.accent);
          return reload();
        })
        .catch(() => undefined);
    };
    window.addEventListener(SYNC_MERGED_EVENT, refresh);
    return () => window.removeEventListener(SYNC_MERGED_EVENT, refresh);
  }, [repo, reload]);

  return null;
}

function LocalizedRouter({ router, syncEnabled }: { router: AppRouter; syncEnabled: boolean }) {
  const { lang } = useLanguage();
  return syncEnabled ? <RouterProvider router={router} /> : <RouterProvider key={lang} router={router} />;
}
