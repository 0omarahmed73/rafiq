import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { releaseNativeSplash } from './launch';

vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: vi.fn(() => 'android') } }));
vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: { hide: vi.fn(() => Promise.resolve()) } }));

beforeEach(() => {
  vi.mocked(SplashScreen.hide).mockClear();
  vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => cb(0));
});
afterEach(() => vi.unstubAllGlobals());

describe('releaseNativeSplash', () => {
  it('hands the screen to the web splash with no extra fade on Android', async () => {
    await releaseNativeSplash();
    expect(SplashScreen.hide).toHaveBeenCalledWith({ fadeOutDuration: 0 });
  });

  it('does nothing in the browser', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
    await releaseNativeSplash();
    expect(SplashScreen.hide).not.toHaveBeenCalled();
  });

  it('never throws when the native call fails', async () => {
    vi.mocked(SplashScreen.hide).mockRejectedValueOnce(new Error('no splash'));
    await expect(releaseNativeSplash()).resolves.toBeUndefined();
  });
});
