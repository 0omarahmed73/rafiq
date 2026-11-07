import { RouterProvider, type createBrowserRouter } from 'react-router-dom';
import { StorageBanner } from './components/StorageBanner';
import { RepoProvider } from './db/RepoContext';
import type { Repo } from './db/repo';
import { type Lang } from './i18n';
import { LanguageProvider, useLanguage } from './i18n/LanguageProvider';
import { LockProvider } from './features/lock/LockProvider';
import { LockScreen } from './features/lock/LockScreen';

type AppRouter = ReturnType<typeof createBrowserRouter>;

export function App({
  router,
  repo,
  persistent,
  language,
}: {
  router: AppRouter;
  repo: Repo;
  persistent: boolean;
  /** The saved language, or `undefined` until the person has chosen one. */
  language?: Lang;
}) {
  return (
    <RepoProvider repo={repo}>
      <LanguageProvider initial={language}>
        <LockProvider screen={LockScreen}>
          <div className="mx-auto max-w-xl px-4 pt-4 empty:hidden">
            <StorageBanner persistent={persistent} />
          </div>
          <LocalizedRouter router={router} />
        </LockProvider>
      </LanguageProvider>
    </RepoProvider>
  );
}

/** Keyed by language, so every screen is rendered again in the new language when it changes. */
function LocalizedRouter({ router }: { router: AppRouter }) {
  const { lang } = useLanguage();
  return <RouterProvider key={lang} router={router} />;
}
