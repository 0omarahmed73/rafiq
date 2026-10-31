export type AccentId = 'teal' | 'blue' | 'purple' | 'rose' | 'amber' | 'green';

/** The CSS variables a palette sets (see tokens.css): `--teal`, `--teal-soft`, `--teal-ink`, `--shade-*`. */
export interface AccentTokens {
  teal: string;
  tealSoft: string;
  tealInk: string;
  shadeLight: string;
  shadeMid: string;
  shadeStrong: string;
  shadeStrongInk: string;
  /** The page colours, tinted by the accent so the whole theme follows it. */
  bg: string;
  card: string;
  ink: string;
  muted: string;
  line: string;
}

export interface Accent {
  label: string;
  light: AccentTokens;
  dark: AccentTokens;
}

export const ACCENT_IDS: AccentId[] = ['teal', 'blue', 'purple', 'rose', 'amber', 'green'];

/**
 * Six palettes. Teal is the default and matches tokens.css. Every other palette was derived so that
 * text on it keeps a contrast of at least 4.5:1 in both modes; src/lib/accents.test.ts enforces it.
 */
export const ACCENTS: Record<AccentId, Accent> = {
  teal: {
    label: 'تركوازي',
    light: {
      teal: '#2F6F66',
      tealSoft: '#DCEBE7',
      tealInk: '#1F5249',
      shadeLight: '#DCEBE7',
      shadeMid: '#9CC7BE',
      shadeStrong: '#3E8077',
      shadeStrongInk: '#FFFFFF',
      bg: '#F3F6F4',
      card: '#FFFFFF',
      ink: '#17302B',
      muted: '#51655F',
      line: '#DCE5E1',
    },
    dark: {
      teal: '#5FB3A6',
      tealSoft: '#1D3B37',
      tealInk: '#BFE6DF',
      shadeLight: '#264B46',
      shadeMid: '#35756C',
      shadeStrong: '#5FB3A6',
      shadeStrongInk: '#0F1B18',
      bg: '#0F1B18',
      card: '#16262A',
      ink: '#E6F0EC',
      muted: '#A3B6B0',
      line: '#27403A',
    },
  },
  blue: {
    label: 'أزرق',
    light: {
      teal: '#356DB6',
      tealSoft: '#DDE4EE',
      tealInk: '#24497B',
      shadeLight: '#DDE4EE',
      shadeMid: '#7E9ABE',
      shadeStrong: '#4D77AC',
      shadeStrongInk: '#FFFFFF',
      bg: '#F2F3F5',
      card: '#FFFFFF',
      ink: '#162231',
      muted: '#606C7B',
      line: '#DCE0E5',
    },
    dark: {
      teal: '#7396C4',
      tealSoft: '#1D293A',
      tealInk: '#ECF1F9',
      shadeLight: '#26364B',
      shadeMid: '#496992',
      shadeStrong: '#7396C4',
      shadeStrongInk: '#0F1B18',
      bg: '#10151C',
      card: '#181F28',
      ink: '#E6EAEF',
      muted: '#7E8A9A',
      line: '#252F3C',
    },
  },
  purple: {
    label: 'بنفسجي',
    light: {
      teal: '#7447AE',
      tealSoft: '#E5DFEC',
      tealInk: '#52327B',
      shadeLight: '#E5DFEC',
      shadeMid: '#A38FBC',
      shadeStrong: '#8060A9',
      shadeStrongInk: '#FFFFFF',
      bg: '#F3F2F5',
      card: '#FFFFFF',
      ink: '#221631',
      muted: '#716581',
      line: '#E0DCE5',
    },
    dark: {
      teal: '#A289C2',
      tealSoft: '#2A2136',
      tealInk: '#F2EDF7',
      shadeLight: '#362A46',
      shadeMid: '#745A96',
      shadeStrong: '#A289C2',
      shadeStrongInk: '#0F1B18',
      bg: '#15101C',
      card: '#1F1828',
      ink: '#EAE6EF',
      muted: '#8D819C',
      line: '#2F253C',
    },
  },
  rose: {
    label: 'وردي',
    light: {
      teal: '#BA3B65',
      tealSoft: '#EDDEE3',
      tealInk: '#7C2743',
      shadeLight: '#EDDEE3',
      shadeMid: '#C0879A',
      shadeStrong: '#B15976',
      shadeStrongInk: '#FFFFFF',
      bg: '#F5F2F3',
      card: '#FFFFFF',
      ink: '#31161F',
      muted: '#7E636C',
      line: '#E5DCDF',
    },
    dark: {
      teal: '#C77F97',
      tealSoft: '#391E27',
      tealInk: '#F8ECF0',
      shadeLight: '#492732',
      shadeMid: '#9A5169',
      shadeStrong: '#C77F97',
      shadeStrongInk: '#0F1B18',
      bg: '#1C1014',
      card: '#28181D',
      ink: '#EFE6E9',
      muted: '#9C818A',
      line: '#3C252D',
    },
  },
  amber: {
    label: 'كهرماني',
    light: {
      teal: '#A85915',
      tealSoft: '#F1E5DA',
      tealInk: '#713C0E',
      shadeLight: '#F1E5DA',
      shadeMid: '#C48B5A',
      shadeStrong: '#A36733',
      shadeStrongInk: '#FFFFFF',
      bg: '#F5F3F2',
      card: '#FFFFFF',
      ink: '#312316',
      muted: '#786A5E',
      line: '#E5E0DC',
    },
    dark: {
      teal: '#CD803C',
      tealSoft: '#402A17',
      tealInk: '#FBF2E9',
      shadeLight: '#52361E',
      shadeMid: '#8B5B32',
      shadeStrong: '#CD803C',
      shadeStrongInk: '#0F1B18',
      bg: '#1C1510',
      card: '#281F18',
      ink: '#EFEAE6',
      muted: '#98897C',
      line: '#3C3025',
    },
  },
  green: {
    label: 'أخضر',
    light: {
      teal: '#327B48',
      tealSoft: '#DFECE3',
      tealInk: '#225331',
      shadeLight: '#DFECE3',
      shadeMid: '#70A981',
      shadeStrong: '#468158',
      shadeStrongInk: '#FFFFFF',
      bg: '#F2F5F3',
      card: '#FFFFFF',
      ink: '#16311E',
      muted: '#5A7261',
      line: '#DCE5DF',
    },
    dark: {
      teal: '#53A26B',
      tealSoft: '#213627',
      tealInk: '#EDF7F0',
      shadeLight: '#2A4632',
      shadeMid: '#437050',
      shadeStrong: '#53A26B',
      shadeStrongInk: '#0F1B18',
      bg: '#101C13',
      card: '#18281D',
      ink: '#E6EFE9',
      muted: '#799681',
      line: '#253C2C',
    },
  },
};

/** A known accent id, or teal for anything else (an old or hand-edited value). */
export function normalizeAccent(value: string | undefined): AccentId {
  return ACCENT_IDS.find((id) => id === value) ?? 'teal';
}

const vars = (t: AccentTokens) =>
  `--teal:${t.teal};--teal-soft:${t.tealSoft};--teal-ink:${t.tealInk};` +
  `--shade-light:${t.shadeLight};--shade-mid:${t.shadeMid};--shade-strong:${t.shadeStrong};` +
  `--shade-strong-ink:${t.shadeStrongInk};` +
  `--bg:${t.bg};--card:${t.card};--ink:${t.ink};--muted:${t.muted};--line:${t.line};`;

/**
 * CSS rules that override the accent tokens for `html[data-accent=…]`, in light mode, in the
 * system dark mode (unless the user forced light) and in the forced dark mode.
 */
export function accentCss(): string {
  return ACCENT_IDS.map((id) => {
    const { light, dark } = ACCENTS[id];
    return (
      `:root[data-accent='${id}']{${vars(light)}}` +
      `@media (prefers-color-scheme: dark){:root:not([data-theme='light'])[data-accent='${id}']{${vars(dark)}}}` +
      `:root[data-theme='dark'][data-accent='${id}']{${vars(dark)}}`
    );
  }).join('\n');
}

export function applyAccent(value: string | undefined): void {
  const id = normalizeAccent(value);
  document.documentElement.dataset.accent = id;
  // The browser toolbar follows the chosen colour too.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', ACCENTS[id].light.teal);
}

/** Adds the accent rules to the page once and applies the saved accent. Call before the first render. */
export function installAccents(saved: string | undefined): void {
  if (!document.getElementById('accent-css')) {
    const style = document.createElement('style');
    style.id = 'accent-css';
    style.textContent = accentCss();
    document.head.appendChild(style);
  }
  applyAccent(saved);
}
