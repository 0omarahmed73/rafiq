import { ordinalAr } from './ordinal';

describe('ordinalAr', () => {
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
    expect(ordinalAr(n)).toBe(word);
  });

  it('falls back to Arabic-Indic digits outside 1–99', () => {
    expect(ordinalAr(0)).toBe('٠');
    expect(ordinalAr(120)).toBe('١٢٠');
  });
});
