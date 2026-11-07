import { toArabicDigits } from '../lib/digits';

/** The two languages the app speaks. */
export type Lang = 'ar' | 'en';

/** English is the default: it is what a person sees until they choose. */
export const DEFAULT_LANGUAGE: Lang = 'en';

export const LANGUAGES: readonly Lang[] = ['en', 'ar'];

/** Text in both languages. Every user-facing string and every piece of content is written this way. */
export interface Bi {
  readonly ar: string;
  readonly en: string;
}

/** Values for `{name}` placeholders. Numbers are written with the digits of the active language. */
export type Vars = Record<string, string | number>;

/** Per-device copy of the choice, read by the inline script in index.html before the app starts. */
export const LANGUAGE_STORAGE_KEY = 'rafiq-language';

const TITLES: Record<Lang, string> = { ar: 'رفيق', en: 'Rafiq' };

export function isLang(value: unknown): value is Lang {
  return value === 'ar' || value === 'en';
}

let active: Lang = DEFAULT_LANGUAGE;

/** The language every `t()` call uses. The provider keeps it in step with the saved choice. */
export function currentLanguage(): Lang {
  return active;
}

export function setActiveLanguage(lang: Lang): void {
  active = lang;
}

export function directionOf(lang: Lang): 'rtl' | 'ltr' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

/** Digits for the active language: Arabic-Indic for Arabic, plain for English. Stored values are never converted. */
export function digits(value: number | string): string {
  return currentLanguage() === 'ar' ? toArabicDigits(value) : String(value);
}

/** Picks the text for the active language and fills `{name}` placeholders. */
export function t(text: Bi, vars?: Vars): string {
  const raw = text[currentLanguage()];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) => {
    if (!(name in vars)) return match;
    const value = vars[name];
    return typeof value === 'number' ? digits(value) : value;
  });
}

/** Keeps the page language, direction and title in step with the chosen language. */
export function applyDocumentLanguage(lang: Lang, doc: Document = document): void {
  doc.documentElement.lang = lang;
  doc.documentElement.dir = directionOf(lang);
  doc.title = TITLES[lang];
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Private mode or blocked storage: the splash falls back to English on the next start, nothing else is lost.
  }
}
