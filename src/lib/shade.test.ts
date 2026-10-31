import { shadeFor } from './shade';

describe('shadeFor', () => {
  it.each([
    [0, 'light'],
    [3, 'light'],
    [4, 'mid'],
    [6, 'mid'],
    [7, 'strong'],
    [10, 'strong'],
  ] as const)('maps intensity %i to %s', (value, expected) => {
    expect(shadeFor(value)).toBe(expected);
  });
});
