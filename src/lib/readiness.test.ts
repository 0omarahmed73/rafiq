import { readinessMessage } from './readiness';

describe('readinessMessage', () => {
  it.each([
    [[4, 4, 3], 'ready'],
    [[3, 4, 4], 'ready'],
    [[5, 5, 1], 'ready'],
    [[3, 3, 3], 'stay'],
    [[3, 3, 4], 'stay'],
    [[4, 4, 2], 'stay'],
  ] as const)('%j is %s', (answers, expected) => {
    expect(readinessMessage([...answers])).toBe(expected);
  });

  it('treats a mean of exactly 3.5 as ready', () => {
    expect(readinessMessage([3, 4])).toBe('ready');
  });

  it('stays when there are no answers', () => {
    expect(readinessMessage([])).toBe('stay');
  });
});
