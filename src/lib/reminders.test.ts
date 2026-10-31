import { reminderDue, shouldShowBackupReminder } from './reminders';

const DAY = 86_400_000;
const baseline = '2026-10-01T10:00:00.000Z';
const after = (days: number) => new Date(new Date(baseline).getTime() + days * DAY);

describe('shouldShowBackupReminder', () => {
  it('is false before 21 days and true from 21 days on', () => {
    expect(shouldShowBackupReminder(baseline, after(20))).toBe(false);
    expect(shouldShowBackupReminder(baseline, after(21))).toBe(true);
    expect(shouldShowBackupReminder(baseline, after(100))).toBe(true);
  });

  it('is false when there is no baseline yet', () => {
    expect(shouldShowBackupReminder(undefined, after(100))).toBe(false);
  });

  it('is false for a baseline that is not a date', () => {
    expect(shouldShowBackupReminder('ليس تاريخًا', after(100))).toBe(false);
  });
});

describe('reminderDue', () => {
  const at = (h: number, m: number) => new Date(2026, 9, 31, h, m);

  it('is due once the reminder time has come', () => {
    expect(reminderDue('20:00', undefined, at(20, 0))).toBe(true);
    expect(reminderDue('20:00', undefined, at(23, 59))).toBe(true);
  });

  it('is not due before the reminder time', () => {
    expect(reminderDue('20:00', undefined, at(19, 59))).toBe(false);
  });

  it('is not due again on a day it was already shown', () => {
    expect(reminderDue('20:00', '2026-10-31', at(21, 0))).toBe(false);
  });

  it('is due again the next day', () => {
    expect(reminderDue('20:00', '2026-10-30', at(20, 30))).toBe(true);
  });

  it('is never due without a valid reminder time', () => {
    expect(reminderDue(undefined, undefined, at(23, 0))).toBe(false);
    expect(reminderDue('', undefined, at(23, 0))).toBe(false);
    expect(reminderDue('عشرون', undefined, at(23, 0))).toBe(false);
    expect(reminderDue('25:00', undefined, at(23, 0))).toBe(false);
  });
});
