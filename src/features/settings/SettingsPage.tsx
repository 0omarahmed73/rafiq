import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BackLink } from '../../components/BackLink';
import { BackupError, exportBackup, importBackup } from '../../db/backup';
import { useRepo } from '../../db/RepoContext';
import type { Settings } from '../../db/schema';
import { type Bi, type Lang } from '../../i18n';
import { useI18n, useLanguage } from '../../i18n/LanguageProvider';
import { applyTheme } from '../../lib/theme';
import { dayKey } from '../../lib/dates';
import { downloadText } from '../../lib/download';
import {
  canShareBackup,
  isAndroidPlatform,
  readBackupDocument,
  saveBackupDocument,
  shareBackupDocument,
} from '../../platform/documents';
import { AccentPicker } from './AccentPicker';
import { getReminderPermission, reconcileDailyReminder, setDailyReminder } from '../../platform/notifications';
import { DeveloperInfo } from './DeveloperInfo';
import { ReminderTimePicker } from './ReminderTimePicker';
import { ProfileCard } from './ProfileCard';
import { CurrentCountryPicker } from './CurrentCountryPicker';
import { LanguageChoice } from '../language/LanguageChoice';
import { LockSettings } from '../lock/LockSettings';

type Mode = 'replace' | 'merge';

const card = 'flex flex-col gap-3 rounded-2xl border border-line bg-card p-4';
const primary = 'min-h-12 rounded-full bg-teal px-6 text-[15px] font-bold text-card';
const secondary = 'min-h-12 rounded-full border-[1.5px] border-teal bg-card px-6 text-[15px] font-bold text-teal-ink';

const CONFIRM: Record<Mode, Bi> = {
  replace: {
    ar: 'سأستبدل كل بياناتي الحالية بما في هذا الملف. هل أنا متأكد؟',
    en: 'I will replace all my current data with what is in this file. Am I sure?',
  },
  merge: {
    ar: 'سأدمج ما في الملف مع بياناتي الحالية، وأحتفظ بالأحدث عند التعارض. هل أنا متأكد؟',
    en: 'I will merge what is in the file with my current data, and keep the newer record when they conflict. Am I sure?',
  },
};

/** Reads a chosen file as text (FileReader works in every browser we support, and in tests). */
function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function SettingsPage({
  download = downloadText,
}: {
  download?: (filename: string, text: string) => void;
}) {
  const repo = useRepo();
  const { t } = useI18n();
  const { lang, setLanguage, reload: reloadLanguage } = useLanguage();
  const [languageMessage, setLanguageMessage] = useState<string | null>(null);
  const isAndroid = isAndroidPlatform();
  const canShare = canShareBackup();
  const [reminder, setReminder] = useState('');
  const [theme, setTheme] = useState<Settings['theme']>('system');
  const [savingTheme, setSavingTheme] = useState(false);
  const [fileText, setFileText] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('merge');
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [canAskNotifications, setCanAskNotifications] = useState(false);
  const [nativeAllowed, setNativeAllowed] = useState<boolean | null>(null);
  const [reminderStatus, setReminderStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    void repo.getSettings().then((s) => {
      if (!alive) return;
      setReminder(s.reminderTime ?? '');
      setTheme(s.theme);
    });
    if (isAndroid) {
      // Only reads the current permission; nothing is asked until the user presses a button.
      void getReminderPermission().then((allowed) => alive && setNativeAllowed(allowed));
    } else {
      setCanAskNotifications(typeof Notification !== 'undefined' && Notification.permission === 'default');
    }
    return () => {
      alive = false;
    };
  }, [repo]);

  async function exportNow() {
    setMessage(null);
    try {
      const file = await exportBackup(repo);
      const filename = `rafiq-backup-${dayKey(new Date())}.json`;
      const text = JSON.stringify(file);
      if (isAndroid) {
        const result = await saveBackupDocument(filename, text);
        if (result === 'cancelled') {
          setMessage({ kind: 'ok', text: t({ ar: 'لم أحفظ النسخة الاحتياطية.', en: 'I did not save the backup.' }) });
          return;
        }
      } else {
        download(filename, text);
      }
      const settings = await repo.getSettings();
      await repo.saveSettings({ ...settings, lastBackupAt: new Date().toISOString() });
      setMessage({ kind: 'ok', text: t({ ar: 'تم حفظ النسخة الاحتياطية.', en: 'The backup has been saved.' }) });
    } catch {
      setMessage({ kind: 'error', text: isAndroid ? t({ ar: 'تعذّر حفظ النسخة الاحتياطية.', en: 'Could not save the backup.' }) : t({ ar: 'تعذّر تصدير النسخة الاحتياطية.', en: 'Could not export the backup.' }) });
    }
  }

  async function shareNow() {
    setMessage(null);
    try {
      const file = await exportBackup(repo);
      const result = await shareBackupDocument(`rafiq-backup-${dayKey(new Date())}.json`, JSON.stringify(file));
      // Opening the sheet does not prove delivery, so it never counts as a saved backup.
      if (result === 'opened') setMessage({ kind: 'ok', text: t({ ar: 'فتحتُ قائمة المشاركة.', en: 'I opened the share sheet.' }) });
    } catch {
      setMessage({ kind: 'error', text: t({ ar: 'تعذّرت المشاركة، يمكنني المحاولة مرة أخرى.', en: 'Sharing failed. I can try again.' }) });
    }
  }

  async function chooseFile(file: File | undefined) {
    setMessage(null);
    setConfirming(false);
    setFileText(null);
    if (!file) return;
    try {
      setFileText(await readFileText(file));
    } catch {
      setMessage({ kind: 'error', text: t({ ar: 'تعذّرت قراءة الملف.', en: 'Could not read the file.' }) });
    }
  }

  async function chooseNativeFile() {
    setMessage(null);
    setConfirming(false);
    setFileText(null);
    try {
      const text = await readBackupDocument();
      if (text === null) {
        setMessage({ kind: 'ok', text: t({ ar: 'ألغيت اختيار الملف.', en: 'I cancelled choosing the file.' }) });
        return;
      }
      setFileText(text);
    } catch {
      setMessage({ kind: 'error', text: t({ ar: 'تعذّر اختيار ملف النسخة الاحتياطية.', en: 'Could not choose a backup file.' }) });
    }
  }

  async function runImport() {
    if (fileText === null) return;
    setConfirming(false);
    try {
      await importBackup(repo, fileText, mode);
      const restored = await repo.getSettings();
      setTheme(restored.theme);
      applyTheme(restored.theme);
      await reloadLanguage();
      if (isAndroid) void reconcileDailyReminder(repo);
      setMessage({ kind: 'ok', text: t({ ar: 'تم استيراد النسخة الاحتياطية.', en: 'The backup has been imported.' }) });
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof BackupError ? e.message : t({ ar: 'تعذّر الاستيراد', en: 'Import failed' }) });
    } finally {
      setFileText(null);
    }
  }

  async function chooseLanguage(next: Lang) {
    setLanguageMessage(null);
    try {
      await setLanguage(next);
    } catch {
      setLanguageMessage(t({ ar: 'لم يُحفظ اختياري بعد. أحاول مرة أخرى.', en: 'My choice is not saved yet. I will try again.' }));
    }
  }

  async function chooseTheme(value: Settings['theme']) {
    setSavingTheme(true);
    setMessage(null);
    try {
      const settings = await repo.getSettings();
      await repo.saveSettings({ ...settings, theme: value });
      setTheme(value);
      applyTheme(value);
    } catch {
      setMessage({ kind: 'error', text: t({ ar: 'لم يُحفظ اختياري بعد. أحاول مرة أخرى.', en: 'My choice is not saved yet. I will try again.' }) });
    } finally {
      setSavingTheme(false);
    }
  }

  async function saveReminder(value: string | undefined) {
    setReminderStatus(null);
    const settings = await repo.getSettings();
    await repo.saveSettings({ ...settings, reminderTime: value || undefined, lastReminderDay: undefined });
    if (!value) setReminder('');
    if (!isAndroid) return;
    try {
      const result = await setDailyReminder(value || undefined, true);
      if (result === 'scheduled') {
        setNativeAllowed(true);
        setReminderStatus({ kind: 'ok', text: t({ ar: 'تم حفظ التذكير. سيصلني كل يوم في الوقت الذي اخترته.', en: 'The reminder is saved. It will reach me every day at the time I chose.' }) });
      } else if (result === 'permission-needed') {
        setNativeAllowed(false);
        setReminderStatus({ kind: 'ok', text: t({ ar: 'حفظتُ الوقت، لكن الإشعارات غير مسموحة، فالتذكير غير فعّال بعد.', en: 'I saved the time, but notifications are not allowed, so the reminder is not active yet.' }) });
      } else {
        setReminderStatus({ kind: 'ok', text: t({ ar: 'أوقفتُ التذكير.', en: 'I turned the reminder off.' }) });
      }
    } catch {
      setReminderStatus({ kind: 'error', text: t({ ar: 'تعذّر ضبط التذكير، يمكنني المحاولة مرة أخرى.', en: 'Could not set the reminder. I can try again.' }) });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <BackLink fallback="/">{t({ ar: 'الرجوع', en: 'Back' })}</BackLink>
      <h1 className="text-[28px] font-bold leading-snug">{t({ ar: 'الإعدادات', en: 'Settings' })}</h1>

      <section className={card} aria-labelledby="language-title">
        <h2 id="language-title" className="text-base font-bold">
          {t({ ar: 'اللغة', en: 'Language' })}
        </h2>
        <p className="text-sm leading-7 text-muted">
          {t({
            ar: 'تتغيّر كل شاشات التطبيق إلى اللغة التي أختارها.',
            en: 'All the screens of the app change to the language I choose.',
          })}
        </p>
        <LanguageChoice
          name="settings-language"
          legend={t({ ar: 'لغة التطبيق', en: 'App language' })}
          value={lang}
          onChange={(next) => void chooseLanguage(next)}
        />
        {languageMessage && (
          <p role="alert" className="text-sm font-semibold text-teal-ink">
            {languageMessage}
          </p>
        )}
      </section>

      <section className={card} aria-labelledby="appearance-title">
        <h2 id="appearance-title" className="text-base font-bold">
          {t({ ar: 'المظهر', en: 'Appearance' })}
        </h2>
        <p className="text-sm leading-7 text-muted">{t({ ar: 'أختار اللون الذي يريحني، ويتغيّر التطبيق كله به.', en: 'I choose the colour that suits me, and the whole app changes with it.' })}</p>
        <fieldset disabled={savingTheme} className="m-0 flex flex-wrap gap-2 border-0 p-0">
          <legend className="mb-2 text-sm font-semibold">{t({ ar: 'أختار مظهر التطبيق', en: 'Choose the app appearance' })}</legend>
          {([['system', t({ ar: 'تلقائي', en: 'Automatic' })], ['light', t({ ar: 'فاتح', en: 'Light' })], ['dark', t({ ar: 'داكن', en: 'Dark' })]] as const).map(([value, label]) => (
            <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-3.5 text-sm font-semibold">
              <input
                type="radio"
                name="theme"
                value={value}
                checked={theme === value}
                onChange={() => void chooseTheme(value)}
                className="h-5 w-5 accent-teal"
              />
              {label}
            </label>
          ))}
        </fieldset>
        <p className="text-sm leading-7 text-muted">{t({ ar: 'في الوضع التلقائي، أتبع مظهر جهازي.', en: 'In automatic mode, I follow my device\'s appearance.' })}</p>
        <AccentPicker />
      </section>

      <LockSettings />

      <CurrentCountryPicker />

      <section className={card} aria-labelledby="backup-title">
        <h2 id="backup-title" className="text-base font-bold">
          {t({ ar: 'النسخ الاحتياطي', en: 'Backup' })}
        </h2>
        <p className="text-sm leading-7 text-muted">
          {isAndroid
            ? t({ ar: 'نسختي تحتوي على بيانات شخصية وقد تحتوي على صور، وليست مشفّرة. أختار مكانًا على جهازي لحفظها.', en: 'My backup holds personal data and may hold photos, and it is not encrypted. I choose a place on my device to save it.' })
            : t({ ar: 'بياناتي على جهازي فقط. إن مسحتُ بيانات المتصفح فلن أستعيدها إلا من نسخة احتياطية. وقد تحتوي النسخة على صور الواجب فيكبر حجمها.', en: 'My data is only on this device. If I clear the browser data, I can only get it back from a backup. The backup may contain homework photos, which makes it larger.' })}
        </p>
        <button type="button" onClick={exportNow} className={primary}>
          {t({ ar: 'تصدير نسخة احتياطية', en: 'Export a backup' })}
        </button>

        {canShare && (
          <>
            <button type="button" onClick={() => void shareNow()} className={secondary}>
              {t({ ar: 'مشاركة نسخة احتياطية', en: 'Share a backup' })}
            </button>
            <p className="m-0 text-[13px] leading-relaxed text-muted">
              {t({ ar: 'النسخة المشاركة تحتوي على كل بياناتي وصوري وليست مشفّرة. أشاركها مع تطبيق أثق به فقط.', en: 'The shared backup holds all my data and photos, and it is not encrypted. I only share it with an app I trust.' })}
            </p>
          </>
        )}

        {isAndroid ? (
          <button type="button" onClick={() => void chooseNativeFile()} className={secondary}>
            {t({ ar: 'اختيار ملف النسخة الاحتياطية', en: 'Choose a backup file' })}
          </button>
        ) : (
          <div className="flex flex-col gap-1.5 border-t border-line pt-3">
            <label htmlFor="backup-file" className="text-[13px] font-semibold text-muted">
              {t({ ar: 'اختيار ملف النسخة الاحتياطية', en: 'Choose a backup file' })}
            </label>
            <input
              id="backup-file"
              type="file"
              accept="application/json,.json"
              onChange={(e) => void chooseFile(e.target.files?.[0])}
              className="text-sm"
            />
          </div>
        )}

        {fileText !== null && (
          <>
            <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
              <legend className="mb-1 text-[13px] font-semibold text-muted">{t({ ar: 'طريقة الاستيراد', en: 'Import method' })}</legend>
              {(
                [
                  ['merge', t({ ar: 'دمج مع بياناتي', en: 'Merge with my data' })],
                  ['replace', t({ ar: 'استبدال بياناتي الحالية', en: 'Replace my current data' })],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px]">
                  <input
                    type="radio"
                    name="import-mode"
                    checked={mode === value}
                    onChange={() => {
                      setMode(value);
                      setConfirming(false);
                    }}
                    className="h-[22px] w-[22px] accent-teal"
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            {confirming ? (
              <div role="group" aria-label={t({ ar: 'تأكيد الاستيراد', en: 'Confirm the import' })} className="flex flex-col gap-3 rounded-xl bg-teal-soft p-3">
                <p className="text-[15px] font-semibold leading-7 text-teal-ink">{t(CONFIRM[mode])}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void runImport()} className={`${primary} flex-1`}>
                    {t({ ar: 'نعم، أستورد', en: 'Yes, import' })}
                  </button>
                  <button type="button" onClick={() => setConfirming(false)} className={`${secondary} flex-1`}>
                    {t({ ar: 'تراجع', en: 'Go back' })}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className={secondary}>
                {t({ ar: 'استيراد', en: 'Import' })}
              </button>
            )}
          </>
        )}

        {message && (
          <p
            role={message.kind === 'error' ? 'alert' : 'status'}
            className="text-sm font-semibold text-teal-ink"
          >
            {message.text}
          </p>
        )}
      </section>

      <section className={card} aria-labelledby="reminder-title">
        <h2 id="reminder-title" className="text-base font-bold">
          {t({ ar: 'تذكير يومي', en: 'Daily reminder' })}
        </h2>
        <ReminderTimePicker value={reminder} onChange={setReminder} />
        <div className="flex gap-2">
          <button type="button" onClick={() => void saveReminder(reminder)} className={`${primary} flex-1`}>
            {t({ ar: 'حفظ التذكير', en: 'Save the reminder' })}
          </button>
          <button type="button" onClick={() => void saveReminder(undefined)} className={`${secondary} flex-1`}>
            {t({ ar: 'إيقاف التذكير', en: 'Turn the reminder off' })}
          </button>
        </div>
        {isAndroid && (
          <p className="text-xs leading-6 text-muted">
            {t({ ar: 'قد يصلني التذكير بعد الوقت المحدّد قليلًا بحسب إعدادات جهازي.', en: 'The reminder may reach me a little after the time I set, depending on my device\'s settings.' })}
          </p>
        )}
        {reminderStatus && (
          <p
            role={reminderStatus.kind === 'error' ? 'alert' : 'status'}
            className="text-sm font-semibold text-ink"
          >
            {reminderStatus.text}
          </p>
        )}
        {isAndroid && nativeAllowed === false && reminder && (
          <button type="button" onClick={() => void saveReminder(reminder)} className={secondary}>
            {t({ ar: 'السماح بالإشعارات', en: 'Allow notifications' })}
          </button>
        )}
        {!isAndroid && canAskNotifications && (
          <button
            type="button"
            onClick={() => void Notification.requestPermission().then(() => setCanAskNotifications(false))}
            className={secondary}
          >
            {t({ ar: 'السماح بالإشعارات', en: 'Allow notifications' })}
          </button>
        )}
      </section>

      <ProfileCard />

      <section className={card} aria-labelledby="about-title">
        <h2 id="about-title" className="text-base font-bold">
          {t({ ar: 'عن رفيق', en: 'About Rafiq' })}
        </h2>
        <p className="text-sm leading-7">{t({ ar: 'رفيق أداة مساعدة وليس بديلًا عن العلاج النفسي.', en: 'Rafiq is a helpful tool, not a replacement for psychological treatment.' })}</p>
        {isAndroidPlatform() && (
          <p className="text-sm leading-7 text-muted">
            {t({ ar: 'بياناتي في التطبيق مستقلة عن بياناتي في المتصفّح. أنقلها بنسخة احتياطية إذا أردت.', en: 'My data in the app is separate from my data in the browser. I can move it with a backup if I want.' })}
          </p>
        )}
        <Link
          to="/calm"
          className="flex min-h-11 items-center self-start rounded-full bg-teal-soft px-5 text-sm font-semibold text-teal-ink"
        >
          {t({ ar: 'أحتاج تهدئة الآن', en: 'I need calm now' })}
        </Link>
      </section>

      <DeveloperInfo className={card} />
    </div>
  );
}
