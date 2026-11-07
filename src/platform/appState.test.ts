import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { onForegroundChange } from './appState';

vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: vi.fn(() => 'web') } }));
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn() } }));

let hidden = false;
beforeEach(() => {
  hidden = false;
  vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
  vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
  vi.mocked(App.addListener).mockReset();
});
afterEach(() => vi.restoreAllMocks());

const fireVisibility = (h: boolean) => {
  hidden = h;
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('onForegroundChange', () => {
  it('reports false when hidden and true when visible', () => {
    const cb = vi.fn();
    const stop = onForegroundChange(cb);
    fireVisibility(true);
    expect(cb).toHaveBeenLastCalledWith(false);
    fireVisibility(false);
    expect(cb).toHaveBeenLastCalledWith(true);
    stop();
  });

  it('stops reporting after cleanup', () => {
    const cb = vi.fn();
    onForegroundChange(cb)();
    fireVisibility(true);
    expect(cb).not.toHaveBeenCalled();
  });

  it('registers no native listener on web', () => {
    onForegroundChange(vi.fn())();
    expect(App.addListener).not.toHaveBeenCalled();
  });

  it('also follows the native appStateChange on Android and removes it on cleanup', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    let handler: (e: { isActive: boolean }) => void = () => {};
    const remove = vi.fn(() => Promise.resolve());
    vi.mocked(App.addListener).mockImplementation(((_n: string, h: typeof handler) => {
      handler = h;
      return Promise.resolve({ remove });
    }) as never);
    const cb = vi.fn();
    const stop = onForegroundChange(cb);
    await Promise.resolve();
    handler({ isActive: false });
    expect(cb).toHaveBeenLastCalledWith(false);
    handler({ isActive: true });
    expect(cb).toHaveBeenLastCalledWith(true);
    stop();
    await Promise.resolve();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('removes the native listener even if cleanup runs before it registers', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
    const remove = vi.fn(() => Promise.resolve());
    vi.mocked(App.addListener).mockImplementation((() => Promise.resolve({ remove })) as never);
    onForegroundChange(vi.fn())();
    await Promise.resolve();
    await Promise.resolve();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
