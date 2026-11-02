import { afterEach, beforeEach } from 'vitest';
import { setActiveLanguage } from '../i18n';
import {
  addDays,
  dayKey,
  formatDayLabel,
  formatFullDate,
  formatMonthYear,
  formatTime,
  weekStartSaturday,
} from './dates';

describe('formatFullDate', () => {
  it('writes day, month name and year without hyphens, so right-to-left text cannot scramble it', () => {
    expect(formatFullDate('2026-10-31')).toBe('٣١ أكتوبر ٢٠٢٦');
    expect(formatFullDate('2026-01-01')).toBe('١ يناير ٢٠٢٦');
  });
});

describe('formatTime', () => {
  it('writes local hours and minutes with two digits in Arabic-Indic digits', () => {
    expect(formatTime(new Date(2026, 9, 3, 9, 5).toISOString())).toBe('٠٩:٠٥');
    expect(formatTime(new Date(2026, 9, 3, 21, 30).toISOString())).toBe('٢١:٣٠');
  });
});

describe('formatMonthYear', () => {
  it('writes the month name and the year in Arabic-Indic digits', () => {
    expect(formatMonthYear('2026-10-31')).toBe('أكتوبر ٢٠٢٦');
  });
});

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

describe('formatDayLabel', () => {
  it('writes weekday, Arabic-Indic day and month name', () => {
    expect(formatDayLabel('2026-10-31')).toBe('السبت ٣١ أكتوبر');
  });
});

describe('dates in English', () => {
  beforeEach(() => setActiveLanguage('en'));
  afterEach(() => setActiveLanguage('ar'));

  it('writes the day, month and year in English words', () => {
    expect(formatFullDate('2026-10-31')).toBe('31 October 2026');
    expect(formatFullDate('2026-01-01')).toBe('1 January 2026');
  });

  it('writes the weekday with the day and month', () => {
    expect(formatDayLabel('2026-10-31')).toBe('Saturday, 31 October');
  });

  it('writes the month and year', () => {
    expect(formatMonthYear('2026-10-31')).toBe('October 2026');
  });

  it('writes the time with plain digits', () => {
    expect(formatTime(new Date(2026, 9, 3, 9, 5).toISOString())).toBe('09:05');
    expect(formatTime(new Date(2026, 9, 3, 21, 30).toISOString())).toBe('21:30');
  });
});
