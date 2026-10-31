import { Outlet } from 'react-router-dom';
import { TabBar } from './components/TabBar';

export function Layout() {
  return (
    <div className="mx-auto min-h-screen max-w-xl pb-20">
      <main className="px-4 pt-6">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
