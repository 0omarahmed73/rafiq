import { Outlet, ScrollRestoration } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { DisclaimerGate } from './features/settings/DisclaimerGate';

export function Layout() {
  return (
    <DisclaimerGate>
      <div className="app-layout mx-auto max-w-xl pb-24">
        <main className="px-4 pt-6">
          <Outlet />
        </main>
        <TabBar />
        <ScrollRestoration />
      </div>
    </DisclaimerGate>
  );
}
