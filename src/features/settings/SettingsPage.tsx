import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BackLink } from '../../components/BackLink';
import { BackupError, exportBackup, importBackup } from '../../db/backup';
import { useRepo } from '../../db/RepoContext';
import type { Settings } from '../../db/schema';
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

type Mode = 'replace' | 'merge';

const card = 'flex flex-col gap-3 rounded-2xl border border-line bg-card p-4';
const primary = 'min-h-12 rounded-full bg-teal px-6 text-[15px] font-bold text-card';
const secondary = 'min-h-12 rounded-full border-[1.5px] border-teal bg-card px-6 text-[15px] font-bold text-teal-ink';

const CONFIRM: Record<Mode, string> = {
  replace: 'سأستبدل كل بياناتي الحالية بما في هذا الملف. هل أنا متأكد؟',
  merge: 'سأدمج ما في الملف مع بياناتي الحالية، وأحتفظ بالأحدث عند التعارض. هل أنا متأكد؟',
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
          setMessage({ kind: 'ok', text: 'لم أحفظ النسخة الاحتياطية.' });
          return;
        }
      } else {
        download(filename, text);
      }
      const settings = await repo.getSettings();
      await repo.saveSettings({ ...settings, lastBackupAt: new Date().toISOString() });
      setMessage({ kind: 'ok', text: 'تم حفظ النسخة الاحتياطية.' });
    } catch {
      setMessage({ kind: 'error', text: isAndroid ? 'تعذّر حفظ النسخة الاحتياطية.' : 'تعذّر تصدير النسخة الاحتياطية.' });
    }
  }

  async function shareNow() {
    setMessage(null);
    try {
      const file = await exportBackup(repo);
      const result = await shareBackupDocument(`rafiq-backup-${dayKey(new Date())}.json`, JSON.stringify(file));
      // Opening the sheet does not prove delivery, so it never counts as a saved backup.
      if (result === 'opened') setMessage({ kind: 'ok', text: 'فتحتُ قائمة المشاركة.' });
    } catch {
      setMessage({ kind: 'error', text: 'تعذّرت المشاركة، يمكنني المحاولة مرة أخرى.' });
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
      setMessage({ kind: 'error', text: 'تعذّرت قراءة الملف.' });
    }
  }

  async function chooseNativeFile() {
    setMessage(null);
    setConfirming(false);
    setFileText(null);
    try {
      const text = await readBackupDocument();
      if (text === null) {
        setMessage({ kind: 'ok', text: 'ألغيت اختيار الملف.' });
        return;
      }
      setFileText(text);
    } catch {
      setMessage({ kind: 'error', text: 'تعذّر اختيار ملف النسخة الاحتياطية.' });
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
      if (isAndroid) void reconcileDailyReminder(repo);
      setMessage({ kind: 'ok', text: 'تم استيراد النسخة الاحتياطية.' });
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof BackupError ? e.message : 'تعذّر الاستيراد' });
    } finally {
      setFileText(null);
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
      setMessage({ kind: 'error', text: 'لم يُحفظ اختياري بعد. أحاول مرة أخرى.' });
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
        setReminderStatus({ kind: 'ok', text: 'تم حفظ التذكير. سيصلني كل يوم في الوقت الذي اخترته.' });
      } else if (result === 'permission-needed') {
        setNativeAllowed(false);
        setReminderStatus({ kind: 'ok', text: 'حفظتُ الوقت، لكن الإشعارات غير مسموحة، فالتذكير غير فعّال بعد.' });
      } else {
        setReminderStatus({ kind: 'ok', text: 'أوقفتُ التذكير.' });
      }
    } catch {
      setReminderStatus({ kind: 'error', text: 'تعذّر ضبط التذكير، يمكنني المحاولة مرة أخرى.' });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <BackLink fallback="/">الرجوع</BackLink>
      <h1 className="text-[28px] font-bold leading-snug">الإعدادات</h1>

      <section className={card} aria-labelledby="appearance-title">
        <h2 id="appearance-title" className="text-base font-bold">
          المظهر
        </h2>
        <p className="text-sm leading-7 text-muted">أختار اللون الذي يريحني، ويتغيّر التطبيق كله به.</p>
        <fieldset disabled={savingTheme} className="m-0 flex flex-wrap gap-2 border-0 p-0">
          <legend className="mb-2 text-sm font-semibold">أختار مظهر التطبيق</legend>
          {([['system', 'تلقائي'], ['light', 'فاتح'], ['dark', 'داكن']] as const).map(([value, label]) => (
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
        <p className="text-sm leading-7 text-muted">في الوضع التلقائي، أتبع مظهر جهازي.</p>
        <AccentPicker />
      </section>

      <CurrentCountryPicker />

      <section className={card} aria-labelledby="backup-title">
        <h2 id="backup-title" className="text-base font-bold">
          النسخ الاحتياطي
        </h2>
        <p className="text-sm leading-7 text-muted">
          {isAndroid
            ? 'نسختي تحتوي على بيانات شخصية وقد تحتوي على صور، وليست مشفّرة. أختار مكانًا على جهازي لحفظها.'
            : 'بياناتي على جهازي فقط. إن مسحتُ بيانات المتصفح فلن أستعيدها إلا من نسخة احتياطية. وقد تحتوي النسخة على صور الواجب فيكبر حجمها.'}
        </p>
        <button type="button" onClick={exportNow} className={primary}>
          تصدير نسخة احتياطية
        </button>

        {canShare && (
          <>
            <button type="button" onClick={() => void shareNow()} className={secondary}>
              مشاركة نسخة احتياطية
            </button>
            <p className="m-0 text-[13px] leading-relaxed text-muted">
              النسخة المشاركة تحتوي على كل بياناتي وصوري وليست مشفّرة. أشاركها مع تطبيق أثق به فقط.
            </p>
          </>
        )}

        {isAndroid ? (
          <button type="button" onClick={() => void chooseNativeFile()} className={secondary}>
            اختيار ملف النسخة الاحتياطية
          </button>
        ) : (
          <div className="flex flex-col gap-1.5 border-t border-line pt-3">
            <label htmlFor="backup-file" className="text-[13px] font-semibold text-muted">
              اختيار ملف النسخة الاحتياطية
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
              <legend className="mb-1 text-[13px] font-semibold text-muted">طريقة الاستيراد</legend>
              {(
                [
                  ['merge', 'دمج مع بياناتي'],
                  ['replace', 'استبدال بياناتي الحالية'],
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
              <div role="group" aria-label="تأكيد الاستيراد" className="flex flex-col gap-3 rounded-xl bg-teal-soft p-3">
                <p className="text-[15px] font-semibold leading-7 text-teal-ink">{CONFIRM[mode]}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void runImport()} className={`${primary} flex-1`}>
                    نعم، أستورد
                  </button>
                  <button type="button" onClick={() => setConfirming(false)} className={`${secondary} flex-1`}>
                    تراجع
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className={secondary}>
                استيراد
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
          تذكير يومي
        </h2>
        <ReminderTimePicker value={reminder} onChange={setReminder} />
        <div className="flex gap-2">
          <button type="button" onClick={() => void saveReminder(reminder)} className={`${primary} flex-1`}>
            حفظ التذكير
          </button>
          <button type="button" onClick={() => void saveReminder(undefined)} className={`${secondary} flex-1`}>
            إيقاف التذكير
          </button>
        </div>
        {isAndroid && (
          <p className="text-xs leading-6 text-muted">
            قد يصلني التذكير بعد الوقت المحدّد قليلًا بحسب إعدادات جهازي.
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
            السماح بالإشعارات
          </button>
        )}
        {!isAndroid && canAskNotifications && (
          <button
            type="button"
            onClick={() => void Notification.requestPermission().then(() => setCanAskNotifications(false))}
            className={secondary}
          >
            السماح بالإشعارات
          </button>
        )}
      </section>

      <ProfileCard />

      <section className={card} aria-labelledby="about-title">
        <h2 id="about-title" className="text-base font-bold">
          عن رفيق
        </h2>
        <p className="text-sm leading-7">رفيق أداة مساعدة وليس بديلًا عن العلاج النفسي.</p>
        {isAndroidPlatform() && (
          <p className="text-sm leading-7 text-muted">
            بياناتي في التطبيق مستقلة عن بياناتي في المتصفّح. أنقلها بنسخة احتياطية إذا أردت.
          </p>
        )}
        <Link
          to="/calm"
          className="flex min-h-11 items-center self-start rounded-full bg-teal-soft px-5 text-sm font-semibold text-teal-ink"
        >
          أحتاج تهدئة الآن
        </Link>
      </section>

      <DeveloperInfo className={card} />
    </div>
  );
}
