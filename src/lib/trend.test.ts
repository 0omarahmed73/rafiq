import { trendOf } from './trend';

describe('trendOf', () => {
  it('is up when the second half averages clearly higher', () => {
    expect(trendOf([2, 2, 8, 8])).toBe('up');
  });

  it('is down when the second half averages clearly lower', () => {
    expect(trendOf([8, 8, 2, 2])).toBe('down');
  });

  it('is flat when the halves differ by less than 0.5', () => {
    expect(trendOf([5, 5, 5.3, 5.3])).toBe('flat');
  });

  it('is not flat when the halves differ by exactly 0.5', () => {
    expect(trendOf([5, 5.5])).toBe('up');
  });

  it('ignores the middle value of an odd-length list', () => {
    expect(trendOf([1, 9, 1])).toBe('flat');
  });

  it('is flat for one value or none', () => {
    expect(trendOf([5])).toBe('flat');
    expect(trendOf([])).toBe('flat');
  });
});
