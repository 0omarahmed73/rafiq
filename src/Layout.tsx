import { Outlet, ScrollRestoration } from 'react-router-dom';
import { TabBar } from './components/TabBar';
import { LanguageGate } from './features/language/LanguageGate';
import { DisclaimerGate } from './features/settings/DisclaimerGate';

export function Layout() {
  return (
    <LanguageGate>
      <DisclaimerGate>
        <div className="app-layout mx-auto max-w-xl pb-24">
          <main className="px-4 pt-6">
            <Outlet />
          </main>
          <TabBar />
          <ScrollRestoration />
        </div>
      </DisclaimerGate>
    </LanguageGate>
  );
}
