// Shared set-up for the Sync card tests: a scriptable engine, a fake account, the real account on the fake server.
import { render, screen } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { LanguageProvider } from '../../i18n/LanguageProvider';
import { createSyncAccount, type SyncAccount, type VaultStatus } from './syncAccount';
import { createSyncEngine, type SyncEngine, type SyncState } from './syncEngine';
import { SyncProvider } from './SyncProvider';
import { createFakeSyncServer, FAKE_CODE } from './syncServer.fake';
import { SyncSettings } from './SyncSettings';

export const EMAIL = 'person@example.com';
export const PASS = 'long enough passphrase';

export function makeEngine(initial: SyncState = { status: 'off' }) {
  const listeners = new Set<(state: SyncState) => void>();
  let state = initial;
  const engine = {
    getState: () => state,
    subscribe: (fn: (next: SyncState) => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    start: vi.fn(),
    stop: vi.fn(),
    requestSync: vi.fn(),
    syncNow: vi.fn(async () => undefined),
    whenIdle: vi.fn(async () => undefined),
    refresh: vi.fn(async () => undefined),
  } satisfies SyncEngine;
  return {
    engine,
    publish(next: SyncState) {
      state = next;
      for (const listener of listeners) listener(next);
    },
  };
}

export function fakeAccount() {
  return {
    requestCode: vi.fn(async (_email: string) => undefined),
    verifyCode: vi.fn(async (_email: string, _code: string): Promise<{ email: string; vault: VaultStatus }> => ({
      email: EMAIL,
      vault: 'none',
    })),
    vaultStatus: vi.fn(async (): Promise<VaultStatus> => 'none'),
    createVault: vi.fn(async (_passphrase: string) => undefined),
    unlockVault: vi.fn(async (_passphrase: string) => true),
    resetVault: vi.fn(async (_passphrase: string, _opts?: { allowEmpty?: boolean }) => undefined),
    localRecordCount: vi.fn(async () => 1),
    signOut: vi.fn(async () => undefined),
  } satisfies SyncAccount;
}

export function renderWithSync({
  lang = 'en',
  state = { status: 'off' } as SyncState,
  account = fakeAccount(),
  engine = makeEngine(state).engine,
  repo = createMemoryRepo(),
}: {
  lang?: 'ar' | 'en';
  state?: SyncState;
  account?: SyncAccount;
  engine?: SyncEngine;
  repo?: Repo;
} = {}) {
  const view = render(
    <RepoProvider repo={repo}>
      <LanguageProvider initial={lang}>
        <SyncProvider engine={engine} account={account}>
          <SyncSettings />
        </SyncProvider>
      </LanguageProvider>
    </RepoProvider>,
  );
  return { ...view, repo, account, engine };
}

/** The real account and engine on the fake server; the engine's own start timer is switched off. */
export function realSetup() {
  const server = createFakeSyncServer();
  const repo = createMemoryRepo();
  const engine = createSyncEngine({ repo, server });
  vi.spyOn(engine, 'start').mockImplementation(() => {});
  const account = createSyncAccount({ server, engine, repo, iterations: 1000 });
  return { server, repo, engine, account };
}

/** Signs the real account in and creates its vault, as another device would have done earlier. */
export async function withVault(setup: ReturnType<typeof realSetup>) {
  await setup.server.requestCode(EMAIL);
  await setup.server.verifyCode(EMAIL, FAKE_CODE);
  await setup.account.createVault(PASS);
}

export async function enterCode(user: ReturnType<typeof userEvent.setup>, email = EMAIL, code = FAKE_CODE) {
  await user.click(screen.getByRole('button', { name: 'Turn on sync' }));
  await user.type(screen.getByLabelText('Email address'), email);
  await user.click(screen.getByRole('button', { name: 'Send a code' }));
  await user.type(screen.getByLabelText('Email code'), code);
  await user.click(screen.getByRole('button', { name: 'Verify code' }));
}

/** The card's own live status region (the passphrase hint is a separate one). */
export function cardStatus(): HTMLElement {
  const region = document.getElementById('sync-status');
  if (!region) throw new Error('The sync status region is missing');
  return region;
}
