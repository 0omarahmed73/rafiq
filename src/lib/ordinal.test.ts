import { afterEach, beforeEach } from 'vitest';
import { setActiveLanguage } from '../i18n';
import { ordinal } from './ordinal';

describe('ordinal', () => {
  it.each([
    [1, 'الأول'],
    [5, 'الخامس'],
    [10, 'العاشر'],
    [11, 'الحادي عشر'],
    [12, 'الثاني عشر'],
    [19, 'التاسع عشر'],
    [20, 'العشرون'],
    [25, 'الخامس والعشرون'],
    [30, 'الثلاثون'],
    [31, 'الحادي والثلاثون'],
    [99, 'التاسع والتسعون'],
  ])('writes %i as %s', (n, word) => {
    expect(ordinal(n)).toBe(word);
  });

  it('falls back to Arabic-Indic digits outside 1–99', () => {
    expect(ordinal(0)).toBe('٠');
    expect(ordinal(120)).toBe('١٢٠');
  });
});

describe('ordinal in English', () => {
  beforeEach(() => setActiveLanguage('en'));
  afterEach(() => setActiveLanguage('ar'));

  it('writes the English ordinal, with the teens taking "th"', () => {
    expect([1, 2, 3, 4, 21, 22, 23, 25, 31].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '21st', '22nd', '23rd', '25th', '31st']);
    expect([11, 12, 13, 111].map(ordinal)).toEqual(['11th', '12th', '13th', '111th']);
  });
});
