import { ACCENTS, ACCENT_IDS, accentCss, applyAccent, normalizeAccent } from './accents';
import { contrastRatio, luminance } from './color';

/** The page colours the accent sits on, from tokens.css. */
const PAGE = {
  light: { card: '#FFFFFF', bg: '#F3F6F4', ink: '#17302B' },
  dark: { card: '#16262A', bg: '#0F1B18', ink: '#E6F0EC' },
} as const;

describe('accent palettes', () => {
  it('offers six accents, teal first, with Arabic labels', () => {
    expect(ACCENT_IDS).toEqual(['teal', 'blue', 'purple', 'rose', 'amber', 'green']);
    expect(ACCENT_IDS.map((id) => ACCENTS[id].label)).toEqual([
      'تركوازي',
      'أزرق',
      'بنفسجي',
      'وردي',
      'كهرماني',
      'أخضر',
    ]);
  });

  it('keeps teal exactly as the default tokens in tokens.css', () => {
    expect(ACCENTS.teal.light).toMatchObject({ teal: '#2F6F66', tealSoft: '#DCEBE7', tealInk: '#1F5249' });
    expect(ACCENTS.teal.dark).toMatchObject({ teal: '#5FB3A6', tealSoft: '#1D3B37', tealInk: '#BFE6DF' });
  });

  describe.each(ACCENT_IDS)('%s', (id) => {
    describe.each(['light', 'dark'] as const)('in %s mode', (mode) => {
      const t = ACCENTS[id][mode];
      const page = PAGE[mode];

      it('keeps the accent readable as text on the card and on the page', () => {
        expect(contrastRatio(t.teal, page.card)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(t.teal, page.bg)).toBeGreaterThanOrEqual(4.5);
      });

      it('keeps button text readable on the accent', () => {
        expect(contrastRatio(page.card, t.teal)).toBeGreaterThanOrEqual(4.5);
      });

      it('keeps ink readable on the soft background', () => {
        expect(contrastRatio(t.tealInk, t.tealSoft)).toBeGreaterThanOrEqual(4.5);
      });

      it('keeps page text readable on the light and medium calendar shades', () => {
        expect(contrastRatio(page.ink, t.shadeLight)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(page.ink, t.shadeMid)).toBeGreaterThanOrEqual(4.5);
      });

      it('keeps day numbers readable on the strong calendar shade', () => {
        expect(contrastRatio(t.shadeStrongInk, t.shadeStrong)).toBeGreaterThanOrEqual(4.5);
      });

      it('makes each calendar shade more prominent than the one before', () => {
        const [a, b, c] = [t.shadeLight, t.shadeMid, t.shadeStrong].map(luminance);
        if (mode === 'light') {
          expect(a).toBeGreaterThan(b);
          expect(b).toBeGreaterThan(c);
        } else {
          expect(a).toBeLessThan(b);
          expect(b).toBeLessThan(c);
        }
      });
    });
  });
});

describe('normalizeAccent', () => {
  it('keeps a known accent and falls back to teal otherwise', () => {
    expect(normalizeAccent('blue')).toBe('blue');
    expect(normalizeAccent('nonsense')).toBe('teal');
    expect(normalizeAccent(undefined)).toBe('teal');
    expect(normalizeAccent('')).toBe('teal');
  });
});

describe('applyAccent', () => {
  afterEach(() => document.documentElement.removeAttribute('data-accent'));

  it('sets the accent on the document element', () => {
    applyAccent('blue');
    expect(document.documentElement.dataset.accent).toBe('blue');
  });

  it('uses teal for an unknown or missing accent', () => {
    applyAccent('nonsense');
    expect(document.documentElement.dataset.accent).toBe('teal');
    applyAccent(undefined);
    expect(document.documentElement.dataset.accent).toBe('teal');
  });
});

describe('accentCss', () => {
  const css = accentCss();

  it('has light, system-dark and explicit-dark rules for every accent', () => {
    for (const id of ACCENT_IDS) {
      expect(css).toContain(`:root[data-accent='${id}']`);
      expect(css).toContain(`:root:not([data-theme='light'])[data-accent='${id}']`);
      expect(css).toContain(`:root[data-theme='dark'][data-accent='${id}']`);
    }
  });

  it('sets every accent token', () => {
    for (const name of ['--teal', '--teal-soft', '--teal-ink', '--shade-light', '--shade-mid', '--shade-strong', '--shade-strong-ink']) {
      expect(css).toContain(`${name}:`);
    }
  });

  it('guards the system-dark rules with the dark media query', () => {
    expect(css).toContain('@media (prefers-color-scheme: dark)');
  });
});
