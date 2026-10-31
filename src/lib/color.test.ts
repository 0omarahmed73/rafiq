import { contrastRatio, luminance } from './color';

describe('luminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(luminance('#000000')).toBeCloseTo(0, 5);
    expect(luminance('#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('accepts lower case and three-digit hex', () => {
    expect(luminance('#fff')).toBeCloseTo(1, 5);
    expect(luminance('#ffffff')).toBeCloseTo(1, 5);
  });
});

describe('contrastRatio', () => {
  it('is 21 between black and white, in either order', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
  });

  it('is 1 for the same colour', () => {
    expect(contrastRatio('#2F6F66', '#2F6F66')).toBeCloseTo(1, 5);
  });

  it('matches the known value for #767676 on white (about 4.54)', () => {
    expect(contrastRatio('#767676', '#FFFFFF')).toBeGreaterThan(4.5);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeLessThan(4.5);
  });
});
