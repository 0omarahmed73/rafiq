import { countryLabel, countryOptions } from './countries';

describe('country labels for the country picker', () => {
  it('shows فلسطين and omits Israel from selectable countries', () => {
    const options = countryOptions();

    expect(options.find(({ code }) => code === 'PS')?.label).toBe('فلسطين');
    expect(options.some(({ code }) => code === 'IL')).toBe(false);
    expect(countryLabel('IL')).toBe('بلد غير متاح');
  });
});
