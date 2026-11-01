import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { exportBackup } from '../../db/backup';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { RepoProvider } from '../../db/RepoContext';
import { SettingsPage } from './SettingsPage';

const documents = vi.hoisted(() => ({
  isAndroidPlatform: vi.fn(),
  saveBackupDocument: vi.fn(),
  readBackupDocument: vi.fn(),
  canShareBackup: vi.fn(),
  shareBackupDocument: vi.fn(),
}));

vi.mock('../../platform/documents', () => documents);

const notifications = vi.hoisted(() => ({
  setDailyReminder: vi.fn(() => Promise.resolve('scheduled')),
  getReminderPermission: vi.fn(() => Promise.resolve(true)),
  reconcileDailyReminder: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../platform/notifications', () => notifications);

function setup(repo: Repo = createMemoryRepo(), download = vi.fn()) {
  render(
    <RepoProvider repo={repo}>
      <MemoryRouter>
        <SettingsPage download={download} />
      </MemoryRouter>
    </RepoProvider>,
  );
  return { repo, download, user: userEvent.setup() };
}

async function backupText(withSoothing: string) {
  const source = createMemoryRepo();
  await source.addSoothing(withSoothing, 'user');
  return JSON.stringify(await exportBackup(source));
}

const upload = (user: ReturnType<typeof userEvent.setup>, text: string) =>
  user.upload(
    screen.getByLabelText('اختيار ملف النسخة الاحتياطية'),
    new File([text], 'backup.json', { type: 'application/json' }),
  );

describe('SettingsPage navigation', () => {
  it('has a back link to Home before the heading', async () => {
    setup();
    const back = await screen.findByRole('link', { name: /الرجوع/ });
    expect(back).toHaveAttribute('href', '/');
    const heading = screen.getByRole('heading', { level: 1, name: 'الإعدادات' });
    expect(back.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('SettingsPage profile', () => {
  it('has a «معلوماتي» section', async () => {
    setup();
    expect(await screen.findByRole('heading', { name: 'معلوماتي' })).toBeInTheDocument();
  });

  it('saves a manually selected country code for local support information', async () => {
    const repo = createMemoryRepo();
    const { user } = setup(repo);
    const country = await screen.findByRole('combobox', { name: 'بلد أرقام الدعم' });

    await user.selectOptions(country, 'US');

    await waitFor(async () => expect((await repo.getSettings()).currentCountryCode).toBe('US'));
    expect(await screen.findByRole('status')).toHaveTextContent('حُفظ بلدي على هذا الجهاز.');
  });
});

describe('SettingsPage backup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    documents.isAndroidPlatform.mockReturnValue(false);
  });

  it('downloads a dated backup file and remembers when', async () => {
    const repo = createMemoryRepo();
    await repo.addSoothing('الرسم', 'user');
    const { user, download } = setup(repo);
    await user.click(await screen.findByRole('button', { name: 'تصدير نسخة احتياطية' }));

    expect(download).toHaveBeenCalledTimes(1);
    const [filename, text] = download.mock.calls[0];
    expect(filename).toMatch(/^rafiq-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(text).version).toBe(1);
    expect((await repo.getSettings()).lastBackupAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('shows the error and changes nothing when the chosen file is not a backup', async () => {
    const repo = createMemoryRepo();
    await repo.addSoothing('قديم', 'user');
    const { user } = setup(repo);
    await upload(user, 'هذا ليس ملفًا صالحًا');
    await user.click(await screen.findByRole('button', { name: 'استيراد' }));
    await user.click(await screen.findByRole('button', { name: 'نعم، أستورد' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('الملف غير صالح');
    expect((await repo.listSoothing()).map((s) => s.text)).toEqual(['قديم']);
  });

  it('asks for confirmation before replacing, and replaces only after yes', async () => {
    const repo = createMemoryRepo();
    await repo.addSoothing('قديم', 'user');
    const { user } = setup(repo);
    await upload(user, await backupText('جديد'));
    await user.click(await screen.findByRole('radio', { name: 'استبدال بياناتي الحالية' }));
    await user.click(screen.getByRole('button', { name: 'استيراد' }));

    expect(await screen.findByText(/سأستبدل كل بياناتي الحالية/)).toBeInTheDocument();
    expect((await repo.listSoothing()).map((s) => s.text)).toEqual(['قديم']);

    await user.click(screen.getByRole('button', { name: 'نعم، أستورد' }));
    expect(await screen.findByText('تم استيراد النسخة الاحتياطية.')).toBeInTheDocument();
    expect((await repo.listSoothing()).map((s) => s.text)).toEqual(['جديد']);
  });

  it('asks for confirmation before merging too, and keeps local data', async () => {
    const repo = createMemoryRepo();
    await repo.addSoothing('قديم', 'user');
    const { user } = setup(repo);
    await upload(user, await backupText('جديد'));
    await user.click(await screen.findByRole('radio', { name: 'دمج مع بياناتي' }));
    await user.click(screen.getByRole('button', { name: 'استيراد' }));

    expect(await screen.findByText(/سأدمج ما في الملف مع بياناتي الحالية/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'نعم، أستورد' }));
    await screen.findByText('تم استيراد النسخة الاحتياطية.');
    expect((await repo.listSoothing()).map((s) => s.text).sort()).toEqual(['جديد', 'قديم']);
  });

  it('lets the user back out of the confirmation without importing', async () => {
    const repo = createMemoryRepo();
    const { user } = setup(repo);
    await upload(user, await backupText('جديد'));
    await user.click(await screen.findByRole('button', { name: 'استيراد' }));
    await user.click(await screen.findByRole('button', { name: 'تراجع' }));
    expect(await repo.listSoothing()).toHaveLength(0);
  });

  it('tells me in the browser too that a backup may contain homework photos', async () => {
    documents.isAndroidPlatform.mockReturnValue(false);
    setup();
    expect(await screen.findByText(/وقد تحتوي النسخة على صور الواجب/)).toBeInTheDocument();
  });

  it('shows the native privacy copy and hides the browser input on Android', async () => {
    documents.isAndroidPlatform.mockReturnValue(true);
    setup();

    expect(await screen.findByText('نسختي تحتوي على بيانات شخصية وقد تحتوي على صور، وليست مشفّرة. أختار مكانًا على جهازي لحفظها.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'اختيار ملف النسخة الاحتياطية' })).toBeInTheDocument();
    expect(screen.queryByLabelText('اختيار ملف النسخة الاحتياطية')).not.toBeInTheDocument();
  });

  it('saves the Android backup and updates lastBackupAt only after the picker saves', async () => {
    const repo = createMemoryRepo();
    await repo.addSoothing('الرسم', 'user');
    documents.isAndroidPlatform.mockReturnValue(true);
    documents.saveBackupDocument.mockResolvedValue('saved');
    const { user, download } = setup(repo);

    await user.click(await screen.findByRole('button', { name: 'تصدير نسخة احتياطية' }));

    await waitFor(() => expect(documents.saveBackupDocument).toHaveBeenCalledOnce());
    const [filename, text] = documents.saveBackupDocument.mock.calls[0];
    expect(filename).toMatch(/^rafiq-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(text).data.soothingList[0].text).toBe('الرسم');
    expect(download).not.toHaveBeenCalled();
    await waitFor(async () => expect((await repo.getSettings()).lastBackupAt).toMatch(/^\d{4}-\d{2}-\d{2}T/));
  });

  it('hides the share button where sharing is unavailable', async () => {
    documents.canShareBackup.mockReturnValue(false);
    setup();

    await screen.findByRole('button', { name: 'تصدير نسخة احتياطية' });
    expect(screen.queryByRole('button', { name: 'مشاركة نسخة احتياطية' })).not.toBeInTheDocument();
  });

  it('shares the full backup, says only that the sheet opened, and does not record a backup', async () => {
    const repo = createMemoryRepo();
    await repo.addSoothing('الرسم', 'user');
    documents.canShareBackup.mockReturnValue(true);
    documents.shareBackupDocument.mockResolvedValue('opened');
    const { user } = setup(repo);

    await user.click(await screen.findByRole('button', { name: 'مشاركة نسخة احتياطية' }));

    await waitFor(() => expect(documents.shareBackupDocument).toHaveBeenCalledOnce());
    const [filename, text] = documents.shareBackupDocument.mock.calls[0];
    expect(filename).toMatch(/^rafiq-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(text).data.soothingList[0].text).toBe('الرسم');
    expect(await screen.findByRole('status')).toHaveTextContent('فتحتُ قائمة المشاركة.');
    expect((await repo.getSettings()).lastBackupAt).toBeUndefined();
    expect(screen.getByText(/أشاركها مع تطبيق أثق به فقط/)).toBeInTheDocument();
  });

  it('shows nothing when the share sheet is dismissed on the web', async () => {
    documents.canShareBackup.mockReturnValue(true);
    documents.shareBackupDocument.mockResolvedValue('cancelled');
    const { user } = setup();

    await user.click(await screen.findByRole('button', { name: 'مشاركة نسخة احتياطية' }));

    await waitFor(() => expect(documents.shareBackupDocument).toHaveBeenCalledOnce());
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('reports a share failure in Arabic and lets the user retry', async () => {
    documents.canShareBackup.mockReturnValue(true);
    documents.shareBackupDocument.mockRejectedValueOnce(new Error('no chooser')).mockResolvedValueOnce('opened');
    const { user } = setup();
    const button = await screen.findByRole('button', { name: 'مشاركة نسخة احتياطية' });

    await user.click(button);
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّرت المشاركة، يمكنني المحاولة مرة أخرى.');

    await user.click(button);
    expect(await screen.findByRole('status')).toHaveTextContent('فتحتُ قائمة المشاركة.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not update lastBackupAt when Android saving is cancelled', async () => {
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'system', lastBackupAt: '2026-10-01T12:00:00.000Z' });
    documents.isAndroidPlatform.mockReturnValue(true);
    documents.saveBackupDocument.mockResolvedValue('cancelled');
    const { user } = setup(repo);

    await user.click(await screen.findByRole('button', { name: 'تصدير نسخة احتياطية' }));

    await waitFor(() => expect(documents.saveBackupDocument).toHaveBeenCalledOnce());
    expect((await repo.getSettings()).lastBackupAt).toBe('2026-10-01T12:00:00.000Z');
    expect(await screen.findByRole('status')).toHaveTextContent('لم أحفظ النسخة الاحتياطية.');
  });

  it('reports Android write errors in Arabic without recording a backup', async () => {
    const repo = createMemoryRepo();
    documents.isAndroidPlatform.mockReturnValue(true);
    documents.saveBackupDocument.mockRejectedValue(new Error('provider write failed'));
    const { user } = setup(repo);

    await user.click(await screen.findByRole('button', { name: 'تصدير نسخة احتياطية' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر حفظ النسخة الاحتياطية.');
    expect((await repo.getSettings()).lastBackupAt).toBeUndefined();
  });

  it('clears a previously selected native file when the next selection is cancelled', async () => {
    const repo = createMemoryRepo();
    await repo.addSoothing('قديم', 'user');
    documents.isAndroidPlatform.mockReturnValue(true);
    documents.readBackupDocument.mockResolvedValueOnce(await backupText('جديد')).mockResolvedValueOnce(null);
    const { user } = setup(repo);
    const choose = () => screen.getByRole('button', { name: 'اختيار ملف النسخة الاحتياطية' });

    await user.click(await screen.findByRole('button', { name: 'اختيار ملف النسخة الاحتياطية' }));
    expect(await screen.findByRole('button', { name: 'استيراد' })).toBeInTheDocument();
    await user.click(choose());

    await waitFor(() => expect(screen.queryByRole('button', { name: 'استيراد' })).not.toBeInTheDocument());
    expect((await repo.listSoothing()).map((item) => item.text)).toEqual(['قديم']);
  });

  it('reports Android read errors and does not leave stale import content', async () => {
    documents.isAndroidPlatform.mockReturnValue(true);
    documents.readBackupDocument.mockRejectedValue(new Error('provider read failed'));
    const { user } = setup();

    await user.click(await screen.findByRole('button', { name: 'اختيار ملف النسخة الاحتياطية' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر اختيار ملف النسخة الاحتياطية.');
    expect(screen.queryByRole('button', { name: 'استيراد' })).not.toBeInTheDocument();
  });

  it('leaves every table unchanged when an unsupported native backup is imported', async () => {
    const repo = createMemoryRepo();
    await repo.addSoothing('قديم', 'user');
    documents.isAndroidPlatform.mockReturnValue(true);
    documents.readBackupDocument.mockResolvedValue(JSON.stringify({ version: 2, data: {} }));
    const { user } = setup(repo);
    const before = await repo.exportAll();

    await user.click(await screen.findByRole('button', { name: 'اختيار ملف النسخة الاحتياطية' }));
    await user.click(await screen.findByRole('button', { name: 'استيراد' }));
    await user.click(await screen.findByRole('button', { name: 'نعم، أستورد' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('إصدار الملف غير مدعوم');
    expect(await repo.exportAll()).toEqual(before);
    expect(screen.queryByRole('button', { name: 'استيراد' })).not.toBeInTheDocument();
  });
});

describe('SettingsPage reminder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    documents.isAndroidPlatform.mockReturnValue(false);
  });

  const pick = async (user: ReturnType<typeof userEvent.setup>, hour: string, minute: string) => {
    await user.selectOptions(await screen.findByLabelText('الساعة'), hour);
    await user.selectOptions(screen.getByLabelText('الدقيقة'), minute);
  };

  it('saves the daily reminder time and clears it', async () => {
    const { repo, user } = setup();
    await pick(user, '20', '30');
    await user.click(screen.getByRole('button', { name: 'حفظ التذكير' }));
    expect((await repo.getSettings()).reminderTime).toBe('20:30');

    await user.click(screen.getByRole('button', { name: 'إيقاف التذكير' }));
    expect((await repo.getSettings()).reminderTime).toBeUndefined();
    expect(notifications.setDailyReminder).not.toHaveBeenCalled();
  });

  it('restores a saved time into the selects', async () => {
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'system', reminderTime: '06:07' });
    setup(repo);
    await waitFor(() => expect((screen.getByLabelText('الساعة') as HTMLSelectElement).value).toBe('06'));
    expect((screen.getByLabelText('الدقيقة') as HTMLSelectElement).value).toBe('07');
  });

  describe('on Android', () => {
    beforeEach(() => {
      documents.isAndroidPlatform.mockReturnValue(true);
      notifications.getReminderPermission.mockResolvedValue(true);
    });

    it('does not ask for permission or schedule anything when the page opens', async () => {
      setup();
      await screen.findByLabelText('الساعة');
      expect(notifications.setDailyReminder).not.toHaveBeenCalled();
    });

    it('schedules the saved time through the native path and says so', async () => {
      notifications.setDailyReminder.mockResolvedValue('scheduled');
      const { repo, user } = setup();
      await pick(user, '20', '30');
      await user.click(screen.getByRole('button', { name: 'حفظ التذكير' }));
      expect(notifications.setDailyReminder).toHaveBeenCalledWith('20:30', true);
      expect(await screen.findByText(/تم حفظ التذكير/)).toBeInTheDocument();
      expect((await repo.getSettings()).reminderTime).toBe('20:30');
    });

    it('explains the possible delay in neutral words', async () => {
      setup();
      expect(await screen.findByText('قد يصلني التذكير بعد الوقت المحدّد قليلًا بحسب إعدادات جهازي.')).toBeInTheDocument();
    });

    it('keeps the time but is honest that the reminder is off when notifications are not allowed, then offers the button', async () => {
      notifications.getReminderPermission.mockResolvedValue(false);
      notifications.setDailyReminder.mockResolvedValueOnce('permission-needed');
      const { repo, user } = setup();
      await pick(user, '20', '30');
      await user.click(screen.getByRole('button', { name: 'حفظ التذكير' }));
      expect(await screen.findByText(/الإشعارات غير مسموحة/)).toBeInTheDocument();
      expect(screen.queryByText(/تم حفظ التذكير/)).not.toBeInTheDocument();
      expect((await repo.getSettings()).reminderTime).toBe('20:30');

      notifications.setDailyReminder.mockResolvedValueOnce('scheduled');
      await user.click(screen.getByRole('button', { name: 'السماح بالإشعارات' }));
      expect(notifications.setDailyReminder).toHaveBeenLastCalledWith('20:30', true);
      expect(await screen.findByText(/تم حفظ التذكير/)).toBeInTheDocument();
    });

    it('shows a retryable error and no success message when native scheduling fails', async () => {
      notifications.setDailyReminder.mockRejectedValueOnce(new Error('alarm failed'));
      const { user } = setup();
      await pick(user, '20', '30');
      await user.click(screen.getByRole('button', { name: 'حفظ التذكير' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر ضبط التذكير، يمكنني المحاولة مرة أخرى.');
      expect(screen.queryByText(/تم حفظ التذكير/)).not.toBeInTheDocument();

      notifications.setDailyReminder.mockResolvedValueOnce('scheduled');
      await user.click(screen.getByRole('button', { name: 'حفظ التذكير' }));
      expect(await screen.findByText(/تم حفظ التذكير/)).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('cancels the native alarm when the reminder is turned off', async () => {
      notifications.setDailyReminder.mockResolvedValue('disabled');
      const { repo, user } = setup();
      await pick(user, '20', '30');
      await user.click(screen.getByRole('button', { name: 'إيقاف التذكير' }));
      expect(notifications.setDailyReminder).toHaveBeenLastCalledWith(undefined, true);
      expect((await repo.getSettings()).reminderTime).toBeUndefined();
      expect(await screen.findByText('أوقفتُ التذكير.')).toBeInTheDocument();
    });

    it('does not offer the browser notification button on Android', async () => {
      vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn() });
      notifications.getReminderPermission.mockResolvedValue(true);
      setup();
      await screen.findByLabelText('الساعة');
      expect(screen.queryByRole('button', { name: 'السماح بالإشعارات' })).not.toBeInTheDocument();
      vi.unstubAllGlobals();
    });
  });
});

describe('SettingsPage about', () => {
  it('repeats that the app does not replace therapy and links to the calm page', async () => {
    setup();
    expect(await screen.findByText(/ليس بديلًا عن العلاج/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'أحتاج تهدئة الآن' })).toHaveAttribute('href', '/calm');
  });
});


afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  documents.isAndroidPlatform.mockReturnValue(false);
});

describe('SettingsPage theme', () => {
  it('offers automatic mode by default', async () => {
    setup();
    expect(await screen.findByRole('radio', { name: 'تلقائي' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'فاتح' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'داكن' })).not.toBeChecked();
  });

  it('applies and persists each mode without changing the other settings', async () => {
    const repo = createMemoryRepo();
    await repo.saveSettings({ id: 'settings', theme: 'system', accent: 'rose', displayName: 'اسم', reminderTime: '20:00' });
    const { user } = setup(repo);
    for (const [label, value] of [['داكن', 'dark'], ['فاتح', 'light'], ['تلقائي', 'system']] as const) {
      await user.click(await screen.findByRole('radio', { name: label }));
      await waitFor(() => expect(screen.getByRole('radio', { name: label })).toBeChecked());
      expect((await repo.getSettings())).toMatchObject({ theme: value, accent: 'rose', displayName: 'اسم', reminderTime: '20:00' });
      expect(document.documentElement.getAttribute('data-theme')).toBe(value === 'system' ? null : value);
    }
  });

  it('shows the saved choice when settings are reopened', async () => {
    const { repo, user } = setup();
    await user.click(await screen.findByRole('radio', { name: 'داكن' }));
    await waitFor(() => expect(screen.getByRole('radio', { name: 'داكن' })).toBeChecked());
    cleanup();
    setup(repo);
    await waitFor(() => expect(screen.getByRole('radio', { name: 'داكن' })).toBeChecked());
  });

  it('applies the theme restored from a backup and updates the picker', async () => {
    const source = createMemoryRepo();
    await source.saveSettings({ id: 'settings', theme: 'dark' });
    const { user } = setup();
    await upload(user, JSON.stringify(await exportBackup(source)));
    await user.click(screen.getByRole('radio', { name: 'استبدال بياناتي الحالية' }));
    await user.click(screen.getByRole('button', { name: 'استيراد' }));
    await user.click(screen.getByRole('button', { name: 'نعم، أستورد' }));
    await screen.findByText('تم استيراد النسخة الاحتياطية.');
    expect(screen.getByRole('radio', { name: 'داكن' })).toBeChecked();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('keeps the current choice and reports when saving is unavailable', async () => {
    const { repo, user } = setup();
    await screen.findByRole('radio', { name: 'تلقائي' });
    vi.spyOn(repo, 'saveSettings').mockRejectedValueOnce(new Error('storage unavailable'));
    await user.click(screen.getByRole('radio', { name: 'داكن' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('لم يُحفظ اختياري بعد. أحاول مرة أخرى.');
    expect(screen.getByRole('radio', { name: 'تلقائي' })).toBeChecked();
    expect((await repo.getSettings()).theme).toBe('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

describe('SettingsPage developer attribution', () => {
  beforeEach(() => documents.isAndroidPlatform.mockReturnValue(false));

  it('shows the developer name, role and clickable public profile links', async () => {
    setup();
    const section = (await screen.findByRole('heading', { name: 'عن المطوّر' })).closest('section')!;
    expect(section).toHaveTextContent('Omar A. Saeed');
    expect(section).toHaveTextContent('Full Stack Developer');
    expect(section).not.toHaveTextContent('مطوّر ويب متكامل');
    for (const label of ['جيت هب', 'لينكد إن', 'الموقع الشخصي']) expect(section).toHaveTextContent(label);
    const links = [
      ['github.com/0omarahmed73', 'https://github.com/0omarahmed73'],
      ['linkedin.com/in/0omarahmed73', 'https://linkedin.com/in/0omarahmed73'],
      ['omarasaeed.dev', 'https://omarasaeed.dev'],
    ];
    for (const [address, href] of links) {
      const link = screen.getByRole('link', { name: address });
      expect(link).toHaveAttribute('href', href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link.querySelector('bdi')).toHaveAttribute('dir', 'ltr');
    }
    expect(section).not.toHaveTextContent('linkedin.con');
  });

  it('uses only links for remote content in the attribution', async () => {
    setup();
    const section = (await screen.findByRole('heading', { name: 'عن المطوّر' })).closest('section')!;
    expect(section.querySelectorAll('a')).toHaveLength(3);
    expect(section.querySelectorAll('img, iframe, video, audio, link, script, [src]')).toHaveLength(0);
    expect(section.querySelector('ul')).toHaveAccessibleName('عناوين المطوّر');
  });

  it('keeps the personal profile card separate from the developer card', async () => {
    setup();
    expect(await screen.findByRole('heading', { name: 'معلوماتي' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'عن المطوّر' }).closest('section')).not.toContainElement(
      screen.getByRole('heading', { name: 'معلوماتي' }),
    );
  });

  it('adds the app-versus-browser storage note only on Android', async () => {
    const note = 'بياناتي في التطبيق مستقلة عن بياناتي في المتصفّح. أنقلها بنسخة احتياطية إذا أردت.';
    setup();
    await screen.findByRole('heading', { name: 'عن رفيق' });
    expect(screen.queryByText(note)).not.toBeInTheDocument();
    cleanup();

    documents.isAndroidPlatform.mockReturnValue(true);
    setup();
    expect(await screen.findByText(note)).toBeInTheDocument();
  });
});

describe('SettingsPage import re-checks the native reminder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    documents.isAndroidPlatform.mockReturnValue(true);
    documents.readBackupDocument.mockResolvedValue(null);
  });

  it('reconciles the daily reminder with the imported settings, without asking for permission', async () => {
    const source = createMemoryRepo();
    await source.saveSettings({ id: 'settings', theme: 'system', reminderTime: '19:45' });
    documents.readBackupDocument.mockResolvedValue(JSON.stringify(await exportBackup(source)));
    const { user } = setup();
    await user.click(await screen.findByRole('button', { name: 'اختيار ملف النسخة الاحتياطية' }));
    await user.click(await screen.findByRole('button', { name: 'استيراد' }));
    await user.click(await screen.findByRole('button', { name: 'نعم، أستورد' }));
    await screen.findByText('تم استيراد النسخة الاحتياطية.');
    expect(notifications.reconcileDailyReminder).toHaveBeenCalledTimes(1);
    expect(notifications.setDailyReminder).not.toHaveBeenCalled();
  });
});
