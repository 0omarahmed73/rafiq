import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { installAndroidLifecycle } from './lifecycle';

vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: vi.fn(() => 'android') } }));
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn(), exitApp: vi.fn() } }));

type Handler = (event: never) => void;
const handlers = new Map<string, Handler>();
const removes: Record<string, ReturnType<typeof vi.fn>> = {};

function fakeRouter(pathname: string) {
  return { navigate: vi.fn(), state: { location: { pathname } } };
}

function setHistory(idx: number | undefined, length: number) {
  vi.spyOn(window.history, 'state', 'get').mockReturnValue(idx === undefined ? null : { idx });
  vi.spyOn(window.history, 'length', 'get').mockReturnValue(length);
}

beforeEach(() => {
  handlers.clear();
  vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
  vi.mocked(App.exitApp).mockClear();
  vi.mocked(App.addListener).mockReset();
  vi.mocked(App.addListener).mockImplementation(((name: string, handler: Handler) => {
    handlers.set(name, handler);
    removes[name] = vi.fn(() => Promise.resolve());
    return Promise.resolve({ remove: removes[name] });
  }) as never);
});
afterEach(() => vi.restoreAllMocks());

const pressBack = () => handlers.get('backButton')!({ canGoBack: true } as never);

describe('installAndroidLifecycle', () => {
  it('goes back through history on a non-root route', async () => {
    const router = fakeRouter('/journey');
    setHistory(2, 3);
    await installAndroidLifecycle(router);
    pressBack();
    expect(router.navigate).toHaveBeenCalledWith(-1);
    expect(App.exitApp).not.toHaveBeenCalled();
  });

  it('exits the app from the root route', async () => {
    const router = fakeRouter('/');
    setHistory(3, 4);
    await installAndroidLifecycle(router);
    pressBack();
    expect(App.exitApp).toHaveBeenCalledTimes(1);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('treats /calm as an ordinary route, not a root', async () => {
    const router = fakeRouter('/calm');
    setHistory(1, 2);
    await installAndroidLifecycle(router);
    pressBack();
    expect(router.navigate).toHaveBeenCalledWith(-1);
    expect(App.exitApp).not.toHaveBeenCalled();
  });

  it('returns home, replacing the entry, when a cold launch lands on a non-root route with no history', async () => {
    const router = fakeRouter('/step/3');
    setHistory(0, 1);
    await installAndroidLifecycle(router);
    pressBack();
    expect(router.navigate).toHaveBeenCalledWith('/', { replace: true });
    expect(App.exitApp).not.toHaveBeenCalled();
  });

  it('also uses the browser history length when the router has not stamped an index', async () => {
    const router = fakeRouter('/tracker');
    setHistory(undefined, 1);
    await installAndroidLifecycle(router);
    pressBack();
    expect(router.navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('flushes drafts through the existing pagehide signal when the app goes to the background', async () => {
    await installAndroidLifecycle(fakeRouter('/practice/validate'));
    const flushed = vi.fn();
    window.addEventListener('pagehide', flushed);
    handlers.get('appStateChange')!({ isActive: false } as never);
    expect(flushed).toHaveBeenCalledTimes(1);
    handlers.get('appStateChange')!({ isActive: true } as never);
    expect(flushed).toHaveBeenCalledTimes(1);
    window.removeEventListener('pagehide', flushed);
  });

  it('removes both native listeners on cleanup', async () => {
    const cleanup = await installAndroidLifecycle(fakeRouter('/'));
    cleanup();
    expect(removes.backButton).toHaveBeenCalledTimes(1);
    expect(removes.appStateChange).toHaveBeenCalledTimes(1);
  });

  it('registers nothing outside Android', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
    const cleanup = await installAndroidLifecycle(fakeRouter('/'));
    expect(App.addListener).not.toHaveBeenCalled();
    expect(() => cleanup()).not.toThrow();
  });
});
