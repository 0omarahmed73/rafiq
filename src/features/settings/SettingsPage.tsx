import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BackupError, exportBackup, importBackup } from '../../db/backup';
import { useRepo } from '../../db/RepoContext';
import { dayKey } from '../../lib/dates';
import { downloadText } from '../../lib/download';

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
  const [reminder, setReminder] = useState('');
  const [fileText, setFileText] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('merge');
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [canAskNotifications, setCanAskNotifications] = useState(false);

  useEffect(() => {
    let alive = true;
    void repo.getSettings().then((s) => alive && setReminder(s.reminderTime ?? ''));
    setCanAskNotifications(typeof Notification !== 'undefined' && Notification.permission === 'default');
    return () => {
      alive = false;
    };
  }, [repo]);

  async function exportNow() {
    const file = await exportBackup(repo);
    download(`rafiq-backup-${dayKey(new Date())}.json`, JSON.stringify(file));
    const settings = await repo.getSettings();
    await repo.saveSettings({ ...settings, lastBackupAt: new Date().toISOString() });
  }

  async function chooseFile(file: File | undefined) {
    setMessage(null);
    setConfirming(false);
    setFileText(file ? await readFileText(file) : null);
  }

  async function runImport() {
    if (fileText === null) return;
    setConfirming(false);
    try {
      await importBackup(repo, fileText, mode);
      setMessage({ kind: 'ok', text: 'تم استيراد النسخة الاحتياطية.' });
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof BackupError ? e.message : 'تعذّر الاستيراد' });
    }
  }

  async function saveReminder(value: string | undefined) {
    const settings = await repo.getSettings();
    await repo.saveSettings({ ...settings, reminderTime: value || undefined, lastReminderDay: undefined });
    if (!value) setReminder('');
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-[28px] font-bold leading-snug">الإعدادات</h1>

      <section className={card} aria-labelledby="backup-title">
        <h2 id="backup-title" className="text-base font-bold">
          النسخ الاحتياطي
        </h2>
        <p className="text-sm leading-7 text-muted">
          بياناتي على جهازي فقط. إن مسحتُ بيانات المتصفح فلن أستعيدها إلا من نسخة احتياطية.
        </p>
        <button type="button" onClick={exportNow} className={primary}>
          تصدير نسخة احتياطية
        </button>

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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reminder-time" className="text-[13px] font-semibold text-muted">
            وقت التذكير اليومي
          </label>
          <input
            id="reminder-time"
            type="time"
            value={reminder}
            onChange={(e) => setReminder(e.target.value)}
            className="min-h-12 rounded-2xl border border-line bg-card px-3.5 text-base text-ink"
          />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void saveReminder(reminder)} className={`${primary} flex-1`}>
            حفظ التذكير
          </button>
          <button type="button" onClick={() => void saveReminder(undefined)} className={`${secondary} flex-1`}>
            إيقاف التذكير
          </button>
        </div>
        {canAskNotifications && (
          <button
            type="button"
            onClick={() => void Notification.requestPermission().then(() => setCanAskNotifications(false))}
            className={secondary}
          >
            السماح بالإشعارات
          </button>
        )}
      </section>

      <section className={card} aria-labelledby="about-title">
        <h2 id="about-title" className="text-base font-bold">
          عن رفيق
        </h2>
        <p className="text-sm leading-7">رفيق أداة مساعدة وليس بديلًا عن العلاج النفسي.</p>
        <Link
          to="/calm"
          className="flex min-h-11 items-center self-start rounded-full bg-teal-soft px-5 text-sm font-semibold text-teal-ink"
        >
          أحتاج تهدئة الآن
        </Link>
      </section>
    </div>
  );
}
