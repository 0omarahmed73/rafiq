import { dayKey, type DayKey } from './dates';

const DAY_MS = 86_400_000;
const BACKUP_REMINDER_DAYS = 21;

/** True when the last backup (or, before any, the day the app was first accepted) is 21 days old or older. */
export function shouldShowBackupReminder(baseline: string | undefined, now: Date): boolean {
  if (!baseline) return false;
  const then = Date.parse(baseline);
  if (Number.isNaN(then)) return false;
  return now.getTime() - then >= BACKUP_REMINDER_DAYS * DAY_MS;
}

/** True once per day, from the reminder time (`HH:MM`, 24-hour) onwards. */
export function reminderDue(
  reminderTime: string | undefined,
  lastShownDay: DayKey | undefined,
  now: Date,
): boolean {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(reminderTime ?? '');
  if (!match) return false;
  if (lastShownDay === dayKey(now)) return false;
  return now.getHours() * 60 + now.getMinutes() >= Number(match[1]) * 60 + Number(match[2]);
}
