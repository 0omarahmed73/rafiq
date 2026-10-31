import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banner } from '../../components/Banner';
import { useRepo } from '../../db/RepoContext';
import { dayKey } from '../../lib/dates';
import { isAndroidPlatform } from '../../platform/documents';
import { reminderDue, shouldShowBackupReminder } from '../../lib/reminders';

/** The daily check-in reminder and the 21-day backup reminder, as banners at the top of Home. */
export function HomeReminders({ now = new Date() }: { now?: Date }) {
  const repo = useRepo();
  const [backupDue, setBackupDue] = useState(false);
  const [dailyDue, setDailyDue] = useState(false);

  useEffect(() => {
    let alive = true;
    void repo.getSettings().then(async (s) => {
      if (!alive) return;
      setBackupDue(shouldShowBackupReminder(s.lastBackupAt ?? s.disclaimerAcceptedAt, now));
      const due = reminderDue(s.reminderTime, s.lastReminderDay, now);
      setDailyDue(due);
      // In the browser, where the user allowed notifications, also say it once as a notification.
      // The Android app has its own native reminder, so no browser Notification is made there.
      if (due && !isAndroidPlatform() && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          new Notification('رفيق', { body: 'حان وقت تسجيل مشاعري اليوم.' });
          await repo.saveSettings({ ...s, lastReminderDay: dayKey(now) });
        } catch {
          // The banner below still shows.
        }
      }
    });
    return () => {
      alive = false;
    };
    // Re-evaluated per day, not per Date object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, now.toDateString()]);

  async function dismissDaily() {
    const settings = await repo.getSettings();
    await repo.saveSettings({ ...settings, lastReminderDay: dayKey(now) });
    setDailyDue(false);
  }

  if (!backupDue && !dailyDue) return null;
  return (
    <div className="flex flex-col gap-2">
      {dailyDue && (
        <Banner>
          <div className="flex items-center justify-between gap-3">
            <span>حان وقت تسجيل مشاعري اليوم.</span>
            <button
              type="button"
              onClick={() => void dismissDaily()}
              className="min-h-11 px-3 text-sm font-bold text-teal-ink"
            >
              حسنًا
            </button>
          </div>
        </Banner>
      )}
      {backupDue && (
        <Banner>
          <div className="flex items-center justify-between gap-3">
            <span>مرّت ٢١ يومًا أو أكثر دون نسخة احتياطية. بياناتي على جهازي فقط، فأحتفظ بنسخة منها.</span>
            <Link to="/settings" className="flex min-h-11 shrink-0 items-center px-3 text-sm font-bold">
              فتح الإعدادات
            </Link>
          </div>
        </Banner>
      )}
    </div>
  );
}
