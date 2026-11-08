import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onForegroundChange } from '../../platform/appState';
import type { SyncAccount } from './syncAccount';
import type { SyncEngine, SyncState } from './syncEngine';

export interface SyncApi {
  state: SyncState;
  configured: true;
  account: SyncAccount;
  syncNow(): Promise<void>;
}

const SyncContext = createContext<SyncApi | null>(null);

export function SyncProvider({
  engine,
  account,
  children,
}: {
  engine: SyncEngine;
  account: SyncAccount;
  children: ReactNode;
}) {
  const [state, setState] = useState(() => engine.getState());

  useEffect(() => {
    const unsubscribe = engine.subscribe(setState);
    engine.start();
    const removeForegroundListener = onForegroundChange((active) => {
      if (active) engine.requestSync('foreground');
    });
    const onOnline = () => engine.requestSync('online');
    window.addEventListener('online', onOnline);

    return () => {
      unsubscribe();
      removeForegroundListener();
      window.removeEventListener('online', onOnline);
    };
  }, [engine]);

  const value = useMemo<SyncApi>(
    () => ({ state, configured: true, account, syncNow: () => engine.syncNow() }),
    [state, account, engine],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncApi | null {
  return useContext(SyncContext);
}
