import { useState } from 'react';
import type { Bi } from '../../i18n';
import { useI18n } from '../../i18n/LanguageProvider';
import { useLock } from './LockProvider';
import { BackButton, card, errorText, field, primary } from './lockUi';

const ERASED: Bi[] = [
  { ar: 'كل التسجيلات اليومية', en: 'All check-ins' },
  { ar: 'اليوميات', en: 'The journal' },
  { ar: 'الجلسات', en: 'Sessions' },
  { ar: 'الواجبات', en: 'Homework' },
  { ar: 'الصور', en: 'Photos' },
  { ar: 'الإعدادات', en: 'Settings' },
];

const WORD: Bi = { ar: 'حذف', en: 'ERASE' };

/** Last resort without the recovery code: erase everything on this device after typing the exact word. */
export function EraseView({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const { eraseEverything } = useLock();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = typed === t(WORD);

  async function erase() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      await eraseEverything();
    } catch {
      setError(
        t({
          ar: 'تعذّر الحذف. يمكنني المحاولة مرة أخرى.',
          en: 'Could not erase. I can try again.',
        }),
      );
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="erase-title" className={card}>
      <h2 id="erase-title" className="text-base font-bold">
        {t({
          ar: 'حذف كل شيء على هذا الجهاز',
          en: 'Erase everything on this device',
        })}
      </h2>
      <p className="text-sm leading-7">
        {t({
          ar: 'بدون رمز الاسترداد، الطريقة الوحيدة لفتح رفيق هي حذف كل ما فيه على هذا الجهاز. سيُحذف:',
          en: 'Without the recovery code, the only way to open Rafiq is to erase everything in it on this device. This erases:',
        })}
      </p>
      <ul className="list-disc ps-6 text-sm leading-7">
        {ERASED.map((item) => (
          <li key={item.en}>{t(item)}</li>
        ))}
      </ul>
      <p className="text-sm leading-7">
        {t({
          ar: 'إذا أنشأت ملف نسخة احتياطية من قبل، يمكنني استعادة بياناتي منه بعد الحذف. القفل نفسه لا يكون في أي نسخة احتياطية، فأفعّله من جديد إن أردت.',
          en: 'If I made a backup file earlier, I can restore my data from it afterwards. The lock itself is never in a backup, so I set it up again if I want it.',
        })}
      </p>
      <label htmlFor="erase-word" className="text-[15px] font-semibold">
        {t({ ar: 'أكتب كلمة «حذف» للتأكيد', en: 'Type ERASE to confirm' })}
      </label>
      <input
        id="erase-word"
        type="text"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        className={field}
      />
      {error && (
        <p role="alert" className={errorText}>
          {error}
        </p>
      )}
      <button type="button" disabled={!ready || busy} onClick={() => void erase()} className={primary}>
        {t({ ar: 'احذف كل شيء', en: 'Erase everything' })}
      </button>
      <BackButton onBack={onBack} />
    </section>
  );
}
