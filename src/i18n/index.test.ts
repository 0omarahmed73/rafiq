import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyDocumentLanguage,
  digits,
  directionOf,
  isLang,
  LANGUAGE_STORAGE_KEY,
  setActiveLanguage,
  t,
  type Bi,
} from '.';

const greeting: Bi = { ar: 'أهلًا {name}، لديك {count} رسالة', en: 'Hello {name}, you have {count} messages' };

describe('t', () => {
  afterEach(() => setActiveLanguage('ar'));

  it('picks the text of the active language', () => {
    setActiveLanguage('ar');
    expect(t({ ar: 'مرحبًا', en: 'Welcome' })).toBe('مرحبًا');
    setActiveLanguage('en');
    expect(t({ ar: 'مرحبًا', en: 'Welcome' })).toBe('Welcome');
  });

  it('fills placeholders, showing numbers in the digits of the active language', () => {
    setActiveLanguage('ar');
    expect(t(greeting, { name: 'عمر', count: 3 })).toBe('أهلًا عمر، لديك ٣ رسالة');
    setActiveLanguage('en');
    expect(t(greeting, { name: 'Omar', count: 3 })).toBe('Hello Omar, you have 3 messages');
  });

  it('leaves a placeholder it was not given, so a missing value is visible', () => {
    setActiveLanguage('en');
    expect(t(greeting, { name: 'Omar' })).toBe('Hello Omar, you have {count} messages');
  });
});

describe('digits', () => {
  afterEach(() => setActiveLanguage('ar'));

  it('uses Arabic-Indic digits in Arabic and plain digits in English', () => {
    setActiveLanguage('ar');
    expect(digits(10)).toBe('١٠');
    setActiveLanguage('en');
    expect(digits(10)).toBe('10');
    expect(digits('16328')).toBe('16328');
  });
});

describe('directionOf and isLang', () => {
  it('reads Arabic right to left and English left to right', () => {
    expect(directionOf('ar')).toBe('rtl');
    expect(directionOf('en')).toBe('ltr');
  });

  it('accepts only the two supported languages', () => {
    expect(isLang('ar')).toBe(true);
    expect(isLang('en')).toBe(true);
    expect(isLang('fr')).toBe(false);
    expect(isLang(undefined)).toBe(false);
  });
});

describe('applyDocumentLanguage', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('sets the page language, direction and title, and remembers the choice on this device', () => {
    applyDocumentLanguage('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.title).toBe('Rafiq');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');

    applyDocumentLanguage('ar');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.title).toBe('رفيق');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('ar');
  });

  it('still applies the language when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => applyDocumentLanguage('en')).not.toThrow();
    expect(document.documentElement.dir).toBe('ltr');
  });
});
