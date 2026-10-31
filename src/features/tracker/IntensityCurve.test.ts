import { curvePoints } from './IntensityCurve';

describe('curvePoints', () => {
  it('places the oldest value on the right and the newest on the left', () => {
    const [oldest, newest] = curvePoints([2, 8], 300, 60);
    expect(oldest.x).toBeGreaterThan(newest.x);
  });

  it('puts a higher intensity higher on the chart (smaller y)', () => {
    const [low, high] = curvePoints([2, 8], 300, 60);
    expect(high.y).toBeLessThan(low.y);
  });

  it('keeps every point inside the drawing', () => {
    for (const p of curvePoints([0, 10, 5], 300, 60)) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(300);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(60);
    }
  });
});
