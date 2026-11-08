import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import { App, SYNC_MERGED_EVENT } from './App';
import { createMemoryRepo } from './db/memoryRepo';
import { IDBFactory } from 'fake-indexeddb';
import { writeLockDb } from './features/lock/lockDb';
import { loadLock, resetLockStoreForTests } from './features/lock/lockStore';
import { hashSecret } from './features/lock/pin';
import type { SyncAccount } from './features/sync/syncAccount';
import type { SyncEngine } from './features/sync/syncEngine';
import type { Lang } from './i18n';
import { t } from './i18n';
import { useI18n, useLanguage } from './i18n/LanguageProvider';
import { routes } from './routes';

/** Arabic by default, so the Arabic copy checks below run as they always did. */
/** `null` means no language has been chosen yet. */
type SyncProps = { engine: SyncEngine; account: SyncAccount };

function createSyncProps(): SyncProps {
  const engine = {
    getState: vi.fn(() => ({ status: 'off' as const })),
    subscribe: vi.fn(() => () => {}),
    start: vi.fn(),
    stop: vi.fn(),
    requestSync: vi.fn(),
    syncNow: vi.fn().mockResolvedValue(undefined),
    whenIdle: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
  };
  return { engine: engine as unknown as SyncEngine, account: {} as SyncAccount };
}

function DraftRoute() {
  const { t } = useI18n();
  const [draft, setDraft] = useState('');
  return (
    <main>
      <p>{t({ ar: 'النص العربي', en: 'English text' })}</p>
      <label>
        Draft
        <input value={draft} onChange={(event) => setDraft(event.target.value)} />
      </label>
    </main>
  );
}

/** Like most routed pages: calls the plain `t()` and never subscribes to the language. */
function HooklessBody() {
  const [draft, setDraft] = useState('');
  return (
    <main>
      <p>{t({ ar: 'النص العربي', en: 'English text' })}</p>
      <label>
        Draft
        <input value={draft} onChange={(event) => setDraft(event.target.value)} />
      </label>
      <SwitchToEnglish />
    </main>
  );
}

function SwitchToEnglish() {
  const { setLanguage } = useLanguage();
  return <button onClick={() => void setLanguage('en')}>Switch</button>;
}

function renderApp(
  path: string,
  persistent = true,
  language: Lang | null = 'ar',
  repo = createMemoryRepo(),
  sync?: SyncProps,
) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<App router={router} repo={repo} persistent={persistent} language={language ?? undefined} sync={sync} />);
  return { router, repo };
}

describe('App', () => {
  it('redirects unknown routes to the home route', () => {
    const { router } = renderApp('/does-not-exist');
    expect(router.state.location.pathname).toBe('/');
  });

  it('sets Arabic language and right-to-left direction on the document', () => {
    renderApp('/');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');
  });

  it('warns when storage is not persistent', () => {
    renderApp('/', false);
    expect(screen.getByRole('status')).toHaveTextContent('لن تُحفظ بياناتي');
  });

  it('shows no storage warning when storage is persistent', () => {
    renderApp('/', true);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('applies merged theme and accent without remounting an open form when sync is configured', async () => {
    const user = userEvent.setup();
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'light', accent: 'teal', language: 'ar' });
    const router = createMemoryRouter([{ path: '/', element: <DraftRoute /> }]);
    render(<App router={router} repo={repo} persistent language="ar" sync={createSyncProps()} />);

    const input = screen.getByRole('textbox', { name: 'Draft' });
    await user.type(input, 'unsaved text');
    await act(async () => {
      await repo.saveSettings({ id: 'settings', theme: 'dark', accent: 'rose', language: 'ar' });
      window.dispatchEvent(new Event(SYNC_MERGED_EVENT));
    });

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    expect(document.documentElement.dataset.accent).toBe('rose');
    expect(screen.getByRole('textbox', { name: 'Draft' })).toBe(input);
    expect(input).toHaveValue('unsaved text');
    expect(screen.getByText('النص العربي')).toBeInTheDocument();
  });

  it('remounts on a merged language change so a page that calls t() directly shows the new language', async () => {
    const user = userEvent.setup();
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'light', language: 'ar' });
    const router = createMemoryRouter([{ path: '/', element: <HooklessBody /> }]);
    render(<App router={router} repo={repo} persistent language="ar" sync={createSyncProps()} />);

    await user.type(screen.getByRole('textbox', { name: 'Draft' }), 'unsaved text');
    expect(screen.getByText('النص العربي')).toBeInTheDocument();
    await act(async () => {
      await repo.saveSettings({ id: 'settings', theme: 'light', language: 'en' });
      window.dispatchEvent(new Event(SYNC_MERGED_EVENT));
    });

    expect(await screen.findByText('English text')).toBeInTheDocument();
    expect(screen.queryByText('النص العربي')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Draft' })).toHaveValue('');
    expect(document.documentElement.lang).toBe('en');
  });

  it('still remounts on a language change when sync is not configured', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter([{ path: '/', element: <HooklessBody /> }]);
    render(<App router={router} repo={createMemoryRepo()} persistent language="ar" />);

    await user.type(screen.getByRole('textbox', { name: 'Draft' }), 'unsaved text');
    await user.click(screen.getByRole('button', { name: 'Switch' }));

    expect(await screen.findByText('English text')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Draft' })).toHaveValue('');
  });
});

describe('first run language', () => {
  it('asks for a language before anything else, with English preselected', () => {
    renderApp('/', true, null);
    expect(screen.getByRole('heading', { name: /Choose your language/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'العربية' })).not.toBeChecked();
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('saves the chosen language and then shows the disclaimer in that language', async () => {
    const user = userEvent.setup();
    const { repo } = renderApp('/', true, null);
    await user.click(screen.getByRole('radio', { name: 'العربية' }));
    await user.click(screen.getByRole('button', { name: /متابعة/ }));
    expect((await repo.getSettings()).language).toBe('ar');
    expect(await screen.findByRole('heading', { name: 'مرحبًا في رفيق' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('keeps the calm page reachable behind the language screen', () => {
    renderApp('/calm', true, null);
    expect(screen.getByRole('heading', { name: 'I need calm' })).toBeInTheDocument();
    expect(within(document.body).queryByRole('radio')).not.toBeInTheDocument();
  });
});

describe('app lock', () => {
  beforeEach(async () => {
    // Opening a screen after unlock restores the scroll position, which jsdom does not implement.
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    // A cold start with a lock on disk, loaded before the first render as at boot.
    globalThis.indexedDB = new IDBFactory();
    resetLockStoreForTests();
    await writeLockDb({
      v: 1,
      pin: await hashSecret('2468', 1000),
      recovery: await hashSecret('ABCDEFGHJKMN', 1000),
      biometric: false,
      autoLockMs: 60000,
      failures: 0,
      blockedUntil: 0,
    });
    await loadLock();
  });
  afterEach(() => {
    resetLockStoreForTests();
    vi.restoreAllMocks();
  });

  async function acceptedRepo() {
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'system', language: 'ar', disclaimerAcceptedAt: '2026-10-01T10:00:00.000Z' });
    return repo;
  }

  async function enterPin(user: ReturnType<typeof userEvent.setup>, pin: string) {
    for (const d of pin) await user.click(screen.getByRole('button', { name: d }));
    await user.click(screen.getByRole('button', { name: 'فتح' }));
  }

  it('shows the lock screen and no tab bar while locked, and Home after the PIN', async () => {
    const user = userEvent.setup();
    renderApp('/', true, 'ar', await acceptedRepo());
    expect(screen.getByRole('heading', { level: 1, name: 'رفيق' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'كيف حالك اليوم؟' })).not.toBeInTheDocument();
    await enterPin(user, '2468');
    expect(await screen.findByRole('heading', { name: 'كيف حالك اليوم؟' })).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'فتح' })).not.toBeInTheDocument();
  });

  it('keeps sync mounted while the lock screen is shown', async () => {
    const sync = createSyncProps();
    renderApp('/', true, 'ar', await acceptedRepo(), sync);
    await waitFor(() => expect(sync.engine.start).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('heading', { level: 1, name: 'رفيق' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('applies a navigation requested while locked (a notification tap) only once unlocked', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/', true, 'ar', await acceptedRepo());
    await act(() => router.navigate('/settings'));
    expect(screen.queryByRole('heading', { name: 'الإعدادات' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    await enterPin(user, '2468');
    expect(await screen.findByRole('heading', { name: 'الإعدادات' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/settings');
  });

  it('keeps a deep link behind the lock and opens it after unlock', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/settings', true, 'ar', await acceptedRepo());
    expect(screen.queryByRole('heading', { name: 'الإعدادات' })).not.toBeInTheDocument();
    await enterPin(user, '2468');
    expect(await screen.findByRole('heading', { name: 'الإعدادات' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/settings');
  });
});
