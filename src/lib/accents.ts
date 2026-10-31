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
    },
    dark: {
      teal: '#5FB3A6',
      tealSoft: '#1D3B37',
      tealInk: '#BFE6DF',
      shadeLight: '#264B46',
      shadeMid: '#35756C',
      shadeStrong: '#5FB3A6',
      shadeStrongInk: '#0F1B18',
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
    },
    dark: {
      teal: '#7396C4',
      tealSoft: '#1D293A',
      tealInk: '#ECF1F9',
      shadeLight: '#26364B',
      shadeMid: '#496992',
      shadeStrong: '#7396C4',
      shadeStrongInk: '#0F1B18',
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
    },
    dark: {
      teal: '#A289C2',
      tealSoft: '#2A2136',
      tealInk: '#F2EDF7',
      shadeLight: '#362A46',
      shadeMid: '#745A96',
      shadeStrong: '#A289C2',
      shadeStrongInk: '#0F1B18',
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
    },
    dark: {
      teal: '#C77F97',
      tealSoft: '#391E27',
      tealInk: '#F8ECF0',
      shadeLight: '#492732',
      shadeMid: '#9A5169',
      shadeStrong: '#C77F97',
      shadeStrongInk: '#0F1B18',
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
    },
    dark: {
      teal: '#CD803C',
      tealSoft: '#402A17',
      tealInk: '#FBF2E9',
      shadeLight: '#52361E',
      shadeMid: '#8B5B32',
      shadeStrong: '#CD803C',
      shadeStrongInk: '#0F1B18',
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
    },
    dark: {
      teal: '#53A26B',
      tealSoft: '#213627',
      tealInk: '#EDF7F0',
      shadeLight: '#2A4632',
      shadeMid: '#437050',
      shadeStrong: '#53A26B',
      shadeStrongInk: '#0F1B18',
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
  `--shade-strong-ink:${t.shadeStrongInk};`;

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
  document.documentElement.dataset.accent = normalizeAccent(value);
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
