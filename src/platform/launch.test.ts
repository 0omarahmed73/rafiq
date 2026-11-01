import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { ANDROID_WEB_SPLASH_MS, SPLASH_MIN_MS } from '../lib/splash';
import { handOverSplash, releaseNativeSplash } from './launch';

vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: vi.fn(() => 'android') } }));
vi.mock('@capacitor/splash-screen', () => ({ SplashScreen: { hide: vi.fn(() => Promise.resolve()) } }));

beforeEach(() => {
  vi.mocked(SplashScreen.hide).mockClear();
  vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => cb(0));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('releaseNativeSplash', () => {
  it('hands the screen to the web splash with no extra fade on Android', async () => {
    await releaseNativeSplash(performance.now() - 1200);
    expect(SplashScreen.hide).toHaveBeenCalledWith({ fadeOutDuration: 0 });
  });

  it('keeps the native splash visible until the minimum startup time has passed', async () => {
    vi.useFakeTimers();
    const release = releaseNativeSplash(performance.now(), 1200);
    await Promise.resolve();
    expect(SplashScreen.hide).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1200);
    await release;

    expect(SplashScreen.hide).toHaveBeenCalledWith({ fadeOutDuration: 0 });
  });

  it('does nothing in the browser', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
    await releaseNativeSplash();
    expect(SplashScreen.hide).not.toHaveBeenCalled();
  });

  it('never throws when the native call fails', async () => {
    vi.mocked(SplashScreen.hide).mockRejectedValueOnce(new Error('no splash'));
    await expect(releaseNativeSplash(performance.now() - 1200)).resolves.toBeUndefined();
  });
});

describe('handOverSplash on Android', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="splash"></div>';
  });

  it('hides the system splash right away, then keeps the animated web splash up before fading it', async () => {
    vi.useFakeTimers();
    const handOver = handOverSplash(performance.now());
    await vi.advanceTimersByTimeAsync(0);
    await handOver;
    expect(SplashScreen.hide).toHaveBeenCalledTimes(1);
    const el = document.getElementById('splash')!;
    expect(el.classList.contains('splash-hide')).toBe(false);

    await vi.advanceTimersByTimeAsync(ANDROID_WEB_SPLASH_MS);
    expect(el.classList.contains('splash-hide')).toBe(true);
  });

  it('does not wait for the old native minimum before revealing the web splash', async () => {
    vi.useFakeTimers();
    const handOver = handOverSplash(performance.now());
    await vi.advanceTimersByTimeAsync(0);
    await handOver;
    expect(SplashScreen.hide).toHaveBeenCalled();
  });
});

describe('handOverSplash in the browser', () => {
  it('leaves the system splash alone and fades the web splash after its normal minimum', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="splash"></div>';
    vi.spyOn(performance, 'now').mockReturnValue(100);
    await handOverSplash(100);
    expect(SplashScreen.hide).not.toHaveBeenCalled();
    const el = document.getElementById('splash')!;
    expect(el.classList.contains('splash-hide')).toBe(false);
    await vi.advanceTimersByTimeAsync(SPLASH_MIN_MS + 50);
    expect(el.classList.contains('splash-hide')).toBe(true);
  });
});
