import { toArabicDigits } from './digits';

describe('toArabicDigits', () => {
  it('converts a date string to Arabic-Indic digits and keeps separators', () => {
    expect(toArabicDigits('2026-10-31')).toBe('٢٠٢٦-١٠-٣١');
  });

  it('converts a number', () => {
    expect(toArabicDigits(6)).toBe('٦');
  });

  it('leaves Arabic letters untouched', () => {
    expect(toArabicDigits('يوم 5')).toBe('يوم ٥');
  });
});

describe('digits in the active language', () => {
  it('keeps the Arabic conversion for Arabic and leaves English digits plain', async () => {
    const { digits } = await import('../i18n');
    const { setActiveLanguage } = await import('../i18n');
    setActiveLanguage('en');
    expect(digits(25)).toBe('25');
    setActiveLanguage('ar');
    expect(digits(25)).toBe('٢٥');
  });
});
