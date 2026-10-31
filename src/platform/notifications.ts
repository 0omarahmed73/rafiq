import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Repo } from '../db/repo';

const REMINDER_ID = 1;
const CHANNEL_ID = 'rafiq-daily';
const TITLE = 'رفيق';
/** Generic on purpose: no names, moods or notes ever go into a notification. */
const BODY = 'آخذ لحظة للاطمئنان على نفسي.';

export type ReminderResult = 'scheduled' | 'disabled' | 'permission-needed';

const isAndroid = () => Capacitor.getPlatform() === 'android';
const only = { notifications: [{ id: REMINDER_ID }] };

/** True when notifications are already allowed. Never shows a permission prompt. */
export async function getReminderPermission(): Promise<boolean> {
  if (!isAndroid()) return false;
  return (await LocalNotifications.checkPermissions()).display === 'granted';
}

/**
 * Android only. Keeps exactly one daily local notification (id 1) at the local `HH:MM`, or none when `time` is
* undefined. Permission is asked only when `requestPermission` is true (an explicit user action). The alarm is
 * inexact on purpose: no exact-alarm permission is needed, and Android may deliver it a little late. It is allowed to
 * wake an idle device; otherwise the plugin uses a non-waking alarm that waits until the screen next turns on.
 */
export async function setDailyReminder(time: string | undefined, requestPermission: boolean): Promise<ReminderResult> {
  if (!isAndroid()) return 'disabled';
  if (time === undefined) {
    await LocalNotifications.cancel(only);
    return 'disabled';
  }
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) throw new Error('The reminder time must be HH:MM');

  let allowed = (await LocalNotifications.checkPermissions()).display === 'granted';
  if (!allowed && requestPermission) allowed = (await LocalNotifications.requestPermissions()).display === 'granted';
  if (!allowed) return 'permission-needed';

  await LocalNotifications.createChannel({ id: CHANNEL_ID, name: 'التذكير اليومي', importance: 3 });
  await LocalNotifications.cancel(only);
  await LocalNotifications.schedule({
    notifications: [
      {
        id: REMINDER_ID,
        title: TITLE,
        body: BODY,
        channelId: CHANNEL_ID,
        schedule: { on: { hour: Number(match[1]), minute: Number(match[2]) }, allowWhileIdle: true },
        isExactNotification: false,
      },
    ],
  });
  return 'scheduled';
}

/** Startup, resume and import: bring the alarm in line with the saved time. Never prompts; never throws. */
export async function reconcileDailyReminder(repo: Pick<Repo, 'getSettings'>): Promise<void> {
  if (!isAndroid()) return;
  try {
    const { reminderTime } = await repo.getSettings();
    if (reminderTime === undefined) await setDailyReminder(undefined, false);
    else if (await getReminderPermission()) await setDailyReminder(reminderTime, false);
  } catch {
    // The reminder is a convenience; a native failure must never block the app.
  }
}

/** Android only: a tapped notification opens Home, and the alarm is re-checked when the app returns. */
export async function installReminderLifecycle(
  repo: Pick<Repo, 'getSettings'>,
  navigate: (to: string) => unknown,
): Promise<() => void> {
  if (!isAndroid()) return () => {};
  const tap = await LocalNotifications.addListener('localNotificationActionPerformed', () => {
    navigate('/');
  });
  const resume = await App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) void reconcileDailyReminder(repo);
  });
  return () => {
    void tap.remove();
    void resume.remove();
  };
}
