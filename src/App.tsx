import { useEffect } from 'react';
import { RouterProvider, type createBrowserRouter } from 'react-router-dom';
import { StorageBanner } from './components/StorageBanner';
import { RepoProvider } from './db/RepoContext';
import type { Repo } from './db/repo';

type AppRouter = ReturnType<typeof createBrowserRouter>;

export function App({
  router,
  repo,
  persistent,
}: {
  router: AppRouter;
  repo: Repo;
  persistent: boolean;
}) {
  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }, []);
  return (
    <RepoProvider repo={repo}>
      <div className="mx-auto max-w-xl px-4 pt-4 empty:hidden">
        <StorageBanner persistent={persistent} />
      </div>
      <RouterProvider router={router} />
    </RepoProvider>
  );
}
