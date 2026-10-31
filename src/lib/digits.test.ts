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
