import { addDays, dayKey, formatArabicDate, weekStartSaturday } from './dates';

describe('dayKey', () => {
  it('keeps a late-night time on the same local day', () => {
    expect(dayKey(new Date(2026, 9, 31, 23, 59))).toBe('2026-10-31');
  });

  it('moves just after midnight to the next day', () => {
    expect(dayKey(new Date(2026, 10, 1, 0, 1))).toBe('2026-11-01');
  });
});

describe('addDays', () => {
  it('adds a day across a month boundary', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  });

  it('adds a day across a year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('subtracts days across a month boundary', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('weekStartSaturday', () => {
  it('returns the same day when it is a Saturday', () => {
    expect(weekStartSaturday(new Date(2026, 9, 31))).toBe('2026-10-31');
    expect(weekStartSaturday(new Date(2026, 10, 7))).toBe('2026-11-07');
  });

  it('returns the previous Saturday for other days', () => {
    expect(weekStartSaturday(new Date(2026, 10, 3))).toBe('2026-10-31');
    expect(weekStartSaturday(new Date(2026, 10, 6))).toBe('2026-10-31');
  });
});

describe('formatArabicDate', () => {
  it('writes weekday, Arabic-Indic day and month name', () => {
    expect(formatArabicDate('2026-10-31')).toBe('السبت ٣١ أكتوبر');
  });
});
