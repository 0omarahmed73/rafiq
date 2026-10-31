import { useEffect } from 'react';
import { RouterProvider, type createBrowserRouter } from 'react-router-dom';

type AppRouter = ReturnType<typeof createBrowserRouter>;

export function App({ router }: { router: AppRouter }) {
  useEffect(() => {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }, []);
  return <RouterProvider router={router} />;
}
