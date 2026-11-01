import { ANDROID_WEB_SPLASH_MS, hideSplash } from './splash';

function addSplash() {
  document.body.innerHTML = '<div id="splash"></div>';
  return document.getElementById('splash')!;
}

describe('hideSplash', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fades the splash out, then removes it', () => {
    const el = addSplash();
    hideSplash(document, { reducedMotion: false, elapsedMs: 5000 });
    expect(el.classList.contains('splash-hide')).toBe(true);
    expect(document.getElementById('splash')).not.toBeNull();
    vi.advanceTimersByTime(600);
    expect(document.getElementById('splash')).toBeNull();
  });

  it('removes it at once when the person prefers reduced motion', () => {
    addSplash();
    hideSplash(document, { reducedMotion: true, elapsedMs: 5000 });
    expect(document.getElementById('splash')).toBeNull();
  });

  it('inside the Android app keeps the web splash visible long enough to play its animation, counted from when it is revealed', () => {
    vi.useFakeTimers();
    const el = addSplash();
    hideSplash(document, { reducedMotion: false, elapsedMs: 5000, native: true });
    vi.advanceTimersByTime(ANDROID_WEB_SPLASH_MS - 1);
    expect(el.classList.contains('splash-hide')).toBe(false);
    vi.advanceTimersByTime(1);
    expect(el.classList.contains('splash-hide')).toBe(true);
    vi.useRealTimers();
  });

  it('gives the animation at least a second on Android', () => {
    expect(ANDROID_WEB_SPLASH_MS).toBeGreaterThanOrEqual(1000);
  });

  it('still keeps the minimum wait in the browser', () => {
    const el = addSplash();
    hideSplash(document, { reducedMotion: false, elapsedMs: 0 });
    expect(el.classList.contains('splash-hide')).toBe(false);
  });

  it('does nothing when there is no splash', () => {
    document.body.innerHTML = '';
    expect(() => hideSplash(document, { reducedMotion: false })).not.toThrow();
  });

  it('stays up until the minimum time has passed since the page started', () => {
    const el = addSplash();
    hideSplash(document, { reducedMotion: false, elapsedMs: 300, minMs: 1500 });
    vi.advanceTimersByTime(1100);
    expect(el.classList.contains('splash-hide')).toBe(false);
    vi.advanceTimersByTime(200);
    expect(el.classList.contains('splash-hide')).toBe(true);
  });

  it('also holds for the minimum time with reduced motion, then removes it at once', () => {
    addSplash();
    hideSplash(document, { reducedMotion: true, elapsedMs: 0, minMs: 1500 });
    vi.advanceTimersByTime(1400);
    expect(document.getElementById('splash')).not.toBeNull();
    vi.advanceTimersByTime(200);
    expect(document.getElementById('splash')).toBeNull();
  });
});
