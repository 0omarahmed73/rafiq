import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import {
  getReminderPermission,
  installReminderLifecycle,
  reconcileDailyReminder,
  setDailyReminder,
} from './notifications';

vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: vi.fn(() => 'android') } }));
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn() } }));
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    createChannel: vi.fn(() => Promise.resolve()),
    cancel: vi.fn(() => Promise.resolve()),
    schedule: vi.fn(() => Promise.resolve({ notifications: [] })),
    addListener: vi.fn(),
  },
}));

const ln = vi.mocked(LocalNotifications);
const permission = (display: string) => ({ display }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
  ln.checkPermissions.mockResolvedValue(permission('granted'));
  ln.requestPermissions.mockResolvedValue(permission('granted'));
  ln.createChannel.mockResolvedValue(undefined);
  ln.cancel.mockResolvedValue(undefined);
  ln.schedule.mockResolvedValue({ notifications: [] });
});

describe('setDailyReminder', () => {
  it('schedules one generic daily notification at the local hour and minute, inexact, on its own channel', async () => {
    await expect(setDailyReminder('20:30', false)).resolves.toBe('scheduled');
    expect(ln.createChannel).toHaveBeenCalledWith(expect.objectContaining({ id: 'rafiq-daily' }));
    expect(ln.schedule).toHaveBeenCalledTimes(1);
    expect(ln.schedule).toHaveBeenCalledWith({
      notifications: [
        {
          id: 1,
          title: 'رفيق',
          body: 'آخذ لحظة للاطمئنان على نفسي.',
          channelId: 'rafiq-daily',
          schedule: { on: { hour: 20, minute: 30 }, allowWhileIdle: true },
          isExactNotification: false,
        },
      ],
    });
  });

  it('cancels the existing alarm before scheduling, so a changed time replaces it', async () => {
    const order: string[] = [];
    ln.cancel.mockImplementation(async () => void order.push('cancel'));
    ln.schedule.mockImplementation(async () => (order.push('schedule'), { notifications: [] }));
    await setDailyReminder('07:05', false);
    expect(order).toEqual(['cancel', 'schedule']);
    expect(ln.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1 }] });
  });

  it('never asks for permission when told not to, and reports that it is needed', async () => {
    ln.checkPermissions.mockResolvedValue(permission('prompt'));
    await expect(setDailyReminder('20:30', false)).resolves.toBe('permission-needed');
    expect(ln.requestPermissions).not.toHaveBeenCalled();
    expect(ln.schedule).not.toHaveBeenCalled();
  });

  it('asks once on an explicit request and schedules when allowed', async () => {
    ln.checkPermissions.mockResolvedValue(permission('prompt'));
    await expect(setDailyReminder('20:30', true)).resolves.toBe('scheduled');
    expect(ln.requestPermissions).toHaveBeenCalledTimes(1);
    expect(ln.schedule).toHaveBeenCalledTimes(1);
  });

  it('reports permission-needed, and schedules nothing, when the user denies', async () => {
    ln.checkPermissions.mockResolvedValue(permission('denied'));
    ln.requestPermissions.mockResolvedValue(permission('denied'));
    await expect(setDailyReminder('20:30', true)).resolves.toBe('permission-needed');
    expect(ln.schedule).not.toHaveBeenCalled();
  });

  it('cancels an old alarm when notification permission is denied', async () => {
    await setDailyReminder('20:30', false);
    ln.checkPermissions.mockResolvedValue(permission('denied'));
    ln.requestPermissions.mockResolvedValue(permission('denied'));

    await expect(setDailyReminder('21:00', true)).resolves.toBe('permission-needed');

    expect(ln.cancel).toHaveBeenCalledTimes(2);
    expect(ln.schedule).toHaveBeenCalledTimes(1);
  });

  it('cancels the one alarm and reports disabled when there is no time, without touching permission', async () => {
    await expect(setDailyReminder(undefined, true)).resolves.toBe('disabled');
    expect(ln.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1 }] });
    expect(ln.checkPermissions).not.toHaveBeenCalled();
    expect(ln.requestPermissions).not.toHaveBeenCalled();
    expect(ln.schedule).not.toHaveBeenCalled();
  });

  it('lets a native scheduling failure reach the caller', async () => {
    ln.schedule.mockRejectedValueOnce(new Error('alarm failed'));
    await expect(setDailyReminder('20:30', false)).rejects.toThrow('alarm failed');
  });

  it('rejects a time that is not HH:MM instead of scheduling', async () => {
    await expect(setDailyReminder('25:99', false)).rejects.toThrow();
    expect(ln.schedule).not.toHaveBeenCalled();
  });

  it('does nothing outside Android', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
    await expect(setDailyReminder('20:30', true)).resolves.toBe('disabled');
    expect(ln.schedule).not.toHaveBeenCalled();
    expect(ln.cancel).not.toHaveBeenCalled();
  });
});

describe('getReminderPermission', () => {
  it('is true only when notifications are granted, and never prompts', async () => {
    await expect(getReminderPermission()).resolves.toBe(true);
    ln.checkPermissions.mockResolvedValue(permission('prompt'));
    await expect(getReminderPermission()).resolves.toBe(false);
    expect(ln.requestPermissions).not.toHaveBeenCalled();
  });
});

describe('reconcileDailyReminder', () => {
  const repoWith = (reminderTime?: string) => ({
    getSettings: () => Promise.resolve({ id: 'settings', theme: 'system', reminderTime }),
  });

  it('re-schedules the saved time when notifications are already allowed', async () => {
    await reconcileDailyReminder(repoWith('21:15') as never);
    expect(ln.schedule).toHaveBeenCalledTimes(1);
  });

  it('never prompts: without permission it schedules nothing and does not ask', async () => {
    ln.checkPermissions.mockResolvedValue(permission('prompt'));
    await reconcileDailyReminder(repoWith('21:15') as never);
    expect(ln.requestPermissions).not.toHaveBeenCalled();
    expect(ln.schedule).not.toHaveBeenCalled();
  });

  it('cancels a stale alarm when permission was revoked', async () => {
    await setDailyReminder('20:30', false);
    ln.cancel.mockClear();
    ln.schedule.mockClear();
    ln.checkPermissions.mockResolvedValue(permission('denied'));

    await reconcileDailyReminder(repoWith('21:15') as never);

    expect(ln.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1 }] });
    expect(ln.schedule).not.toHaveBeenCalled();
  });

  it('cancels the alarm when no time is saved', async () => {
    await reconcileDailyReminder(repoWith(undefined) as never);
    expect(ln.cancel).toHaveBeenCalledWith({ notifications: [{ id: 1 }] });
    expect(ln.schedule).not.toHaveBeenCalled();
  });

  it('swallows native failures so startup is never blocked', async () => {
    ln.schedule.mockRejectedValueOnce(new Error('boom'));
    await expect(reconcileDailyReminder(repoWith('21:15') as never)).resolves.toBeUndefined();
  });
});

describe('installReminderLifecycle', () => {
  const handlers = new Map<string, (event: never) => void>();
  const removed: string[] = [];
  const handle = (name: string) => Promise.resolve({ remove: () => (removed.push(name), Promise.resolve()) });
  const repo = { getSettings: () => Promise.resolve({ id: 'settings', theme: 'system', reminderTime: '21:15' }) };

  beforeEach(() => {
    handlers.clear();
    removed.length = 0;
    ln.addListener.mockImplementation(((name: string, cb: never) => (handlers.set(name, cb), handle(name))) as never);
    vi.mocked(App.addListener).mockImplementation(((name: string, cb: never) => (handlers.set(name, cb), handle(name))) as never);
  });

  it('opens Home when the notification is tapped', async () => {
    const navigate = vi.fn();
    await installReminderLifecycle(repo as never, navigate);
    handlers.get('localNotificationActionPerformed')!({} as never);
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('reconciles on resume but not when going to the background', async () => {
    await installReminderLifecycle(repo as never, vi.fn());
    handlers.get('appStateChange')!({ isActive: false } as never);
    await Promise.resolve();
    expect(ln.schedule).not.toHaveBeenCalled();
    handlers.get('appStateChange')!({ isActive: true } as never);
    await vi.waitFor(() => expect(ln.schedule).toHaveBeenCalledTimes(1));
    expect(ln.requestPermissions).not.toHaveBeenCalled();
  });

  it('removes both listeners on cleanup and registers nothing outside Android', async () => {
    const cleanup = await installReminderLifecycle(repo as never, vi.fn());
    cleanup();
    expect(removed.sort()).toEqual(['appStateChange', 'localNotificationActionPerformed']);

    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
    ln.addListener.mockClear();
    await installReminderLifecycle(repo as never, vi.fn());
    expect(ln.addListener).not.toHaveBeenCalled();
  });
});
