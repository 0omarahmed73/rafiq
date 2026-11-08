import { IDBFactory } from 'fake-indexeddb';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRepo } from '../../db/memoryRepo';
import { RepoProvider } from '../../db/RepoContext';
import { LanguageProvider } from '../../i18n/LanguageProvider';
import { createFakeSyncServer, FAKE_CODE } from './syncServer.fake';
import { createSyncAccount, type SyncAccount, type VaultStatus } from './syncAccount';
import { SyncSettings } from './SyncSettings';
import { SyncProvider } from './SyncProvider';
import { createSyncEngine, type SyncEngine, type SyncState } from './syncEngine';
import { clearSyncIdentity } from './syncKeyStore';

function makeEngine(initial: SyncState = { status: 'off' }) {
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

function fakeAccount(): SyncAccount {
  return {
    requestCode: vi.fn(async () => undefined),
    verifyCode: vi.fn(async (): Promise<{ email: string; vault: VaultStatus }> => ({ email: 'person@example.com', vault: 'none' })),
    vaultStatus: vi.fn(async (): Promise<VaultStatus> => 'none'),
    createVault: vi.fn(async () => undefined),
    unlockVault: vi.fn(async () => true),
    resetVault: vi.fn(async () => undefined),
    localRecordCount: vi.fn(async () => 1),
    signOut: vi.fn(async () => undefined),
  };
}

function renderWithSync({
  lang = 'en',
  state = { status: 'off' } as SyncState,
  account = fakeAccount(),
  engine = makeEngine(state).engine,
}: {
  lang?: 'ar' | 'en';
  state?: SyncState;
  account?: ReturnType<typeof fakeAccount>;
  engine?: SyncEngine;
} = {}) {
  const repo = createMemoryRepo();
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

const EMAIL = 'person@example.com';
const PASS = 'long enough passphrase';

async function enterCode(user: ReturnType<typeof userEvent.setup>, email = EMAIL) {
  await user.click(screen.getByRole('button', { name: 'Turn on sync' }));
  await user.type(screen.getByLabelText('Email address'), email);
  await user.click(screen.getByRole('button', { name: 'Send a code' }));
  await user.type(screen.getByLabelText('Email code'), FAKE_CODE);
  await user.click(screen.getByRole('button', { name: 'Verify code' }));
}

describe('SyncSettings', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await clearSyncIdentity();
  });

  it('renders nothing when sync is not configured', () => {
    const { container } = render(<SyncSettings />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the honest note in both languages while sync is off', () => {
    const view = renderWithSync();
    expect(screen.getByText('My data is encrypted on this phone before it leaves it. If I forget the passphrase, I can reset the cloud copy from a device that still has my data.')).toBeInTheDocument();
    view.unmount();
    renderWithSync({ lang: 'ar' });
    expect(screen.getByText('بياناتي تُشفَّر على هذا الهاتف قبل أن تغادره. إذا نسيت عبارة المرور أستطيع إعادة ضبط النسخة السحابية من جهاز ما زال يحتوي بياناتي.')).toBeInTheDocument();
  });

  it('signs in with an email code and creates a passphrase-protected vault', async () => {
    const user = userEvent.setup();
    const server = createFakeSyncServer();
    const repo = createMemoryRepo();
    const engine = createSyncEngine({ repo, server });
    vi.spyOn(engine, 'start').mockImplementation(() => {});
    const account = createSyncAccount({ server, engine, repo, iterations: 1000 });
    render(
      <RepoProvider repo={repo}>
        <LanguageProvider initial="en">
          <SyncProvider engine={engine} account={account}>
            <SyncSettings />
          </SyncProvider>
        </LanguageProvider>
      </RepoProvider>,
    );

    await enterCode(user);
    await user.type(screen.getByLabelText('Passphrase'), 'short');
    await user.type(screen.getByLabelText('Repeat passphrase'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create encrypted copy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('at least 10 characters');

    await user.clear(screen.getByLabelText('Passphrase'));
    await user.clear(screen.getByLabelText('Repeat passphrase'));
    await user.type(screen.getByLabelText('Passphrase'), PASS);
    await user.type(screen.getByLabelText('Repeat passphrase'), 'different phrase');
    await user.click(screen.getByRole('button', { name: 'Create encrypted copy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('do not match');

    await user.clear(screen.getByLabelText('Repeat passphrase'));
    await user.type(screen.getByLabelText('Repeat passphrase'), PASS);
    await user.click(screen.getByRole('button', { name: 'Create encrypted copy' }));
    expect(await screen.findByText('person@example.com')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('I created an encrypted copy');
    expect(server.vault()).not.toBeNull();
    expect(screen.queryByLabelText('Passphrase')).not.toBeInTheDocument();
  });

  it('keeps an accepted account on a failed vault lookup and retries without another code', async () => {
    const user = userEvent.setup();
    const verifyCode = vi.fn(async () => ({ email: EMAIL, vault: 'unknown' as VaultStatus }));
    const vaultStatus = vi.fn(async (): Promise<VaultStatus> => 'none');
    const account = { ...fakeAccount(), verifyCode, vaultStatus };
    renderWithSync({ account });

    await enterCode(user);
    expect(screen.getByText('I signed in, but could not check the cloud copy.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check again' }));
    expect(await screen.findByLabelText('Passphrase')).toBeInTheDocument();
    expect(account.verifyCode).toHaveBeenCalledTimes(1);
    expect(account.vaultStatus).toHaveBeenCalledTimes(1);
  });

  it('allows resending an email code after the cooldown', async () => {
    vi.useFakeTimers();
    const account = fakeAccount();
    renderWithSync({ account });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Turn on sync' }));
    });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: EMAIL } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send a code' }));
    });

    const resend = screen.getByRole('button', { name: 'Resend in 60 seconds' });
    expect(resend).toBeDisabled();
    expect(account.requestCode).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
    });
    expect(account.requestCode).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Resend in 60 seconds' })).toBeDisabled();
  });

  it('lets an existing account retry a wrong passphrase', async () => {
    const user = userEvent.setup();
    const server = createFakeSyncServer();
    const repo = createMemoryRepo();
    const engine = createSyncEngine({ repo, server });
    vi.spyOn(engine, 'start').mockImplementation(() => {});
    const account = createSyncAccount({ server, engine, repo, iterations: 1000 });
    await server.requestCode(EMAIL);
    await server.verifyCode(EMAIL, FAKE_CODE);
    await account.createVault(PASS);
    await account.signOut();
    render(
      <RepoProvider repo={repo}>
        <LanguageProvider initial="en">
          <SyncProvider engine={engine} account={account}>
            <SyncSettings />
          </SyncProvider>
        </LanguageProvider>
      </RepoProvider>,
    );

    await enterCode(user);
    expect(await screen.findByLabelText('Passphrase')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Passphrase'), 'wrong passphrase');
    await user.click(screen.getByRole('button', { name: 'Unlock copy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('not right');
    await user.type(screen.getByLabelText('Passphrase'), PASS);
    await user.click(screen.getByRole('button', { name: 'Unlock copy' }));
    expect(await screen.findByText(EMAIL)).toBeInTheDocument();
  });

  it('requires typed confirmation before an empty local copy can replace the cloud vault', async () => {
    const user = userEvent.setup();
    const server = createFakeSyncServer();
    const repo = createMemoryRepo();
    const engine = createSyncEngine({ repo, server });
    vi.spyOn(engine, 'start').mockImplementation(() => {});
    const account = createSyncAccount({ server, engine, repo, iterations: 1000 });
    await server.requestCode(EMAIL);
    await server.verifyCode(EMAIL, FAKE_CODE);
    await account.createVault(PASS);
    const reset = vi.spyOn(account, 'resetVault');
    render(
      <RepoProvider repo={repo}>
        <LanguageProvider initial="en">
          <SyncProvider engine={engine} account={account}>
            <SyncSettings />
          </SyncProvider>
        </LanguageProvider>
      </RepoProvider>,
    );

    await screen.findByText(EMAIL);
    await user.click(screen.getByRole('button', { name: 'Reset cloud copy' }));
    await screen.findByLabelText('Type “ERASE” to confirm');
    const continueButton = screen.getByRole('button', { name: 'Continue and enter a new passphrase' });
    expect(continueButton).toBeDisabled();
    await user.type(screen.getByLabelText('Type “ERASE” to confirm'), 'ERASE');
    await user.click(continueButton);
    await user.type(screen.getByLabelText('New passphrase'), PASS);
    await user.type(screen.getByLabelText('Repeat new passphrase'), PASS);
    await user.click(screen.getByRole('button', { name: 'Replace cloud copy' }));

    await waitFor(() => expect(reset).toHaveBeenCalledWith(PASS, { allowEmpty: true }));
    await waitFor(() => expect(server.vault()?.version).toBeGreaterThan(1));
  });

  it('shows state-specific attention and retries without losing the account card', async () => {
    const user = userEvent.setup();
    const { engine, publish } = makeEngine({ status: 'attention', issue: 'damaged', email: EMAIL });
    const account = fakeAccount();
    renderWithSync({ state: { status: 'attention', issue: 'damaged', email: EMAIL }, account, engine });

    expect(screen.getByRole('status')).toHaveTextContent('could not be opened or validated');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(engine.syncNow).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Reset cloud copy' }));
    expect(await screen.findByText('Records on this device: 1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    act(() => publish({ status: 'attention', issue: 'newerVersion', email: EMAIL }));
    expect(screen.getByRole('status')).toHaveTextContent('newer version of the app');
  });

  it('turns sync off on this device without erasing local data', async () => {
    const user = userEvent.setup();
    const { engine } = makeEngine({ status: 'idle', email: EMAIL });
    const account = fakeAccount();
    const { repo } = renderWithSync({ state: { status: 'idle', email: EMAIL }, account, engine });
    await repo.saveSettings({ id: 'settings', theme: 'dark', displayName: 'keep me' });

    await user.click(screen.getByRole('button', { name: 'Turn off sync on this device' }));
    expect(account.signOut).toHaveBeenCalledTimes(1);
    expect(await repo.getSettings()).toMatchObject({ displayName: 'keep me' });
    expect(screen.getByRole('status')).toHaveTextContent('local data stays here');
  });
});
