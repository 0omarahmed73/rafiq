import type { Bi } from '../../i18n';
import { useI18n } from '../../i18n/LanguageProvider';

// Shared look and copy for the lock screen views, following the Settings card conventions.
export const card = 'flex flex-col gap-3 rounded-2xl border border-line bg-card p-4';
export const primary =
  'min-h-12 rounded-full bg-teal px-6 text-[15px] font-bold text-card disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-progress';
export const secondary =
  'min-h-12 rounded-full border-[1.5px] border-teal bg-card px-6 text-[15px] font-bold text-teal-ink';
export const link = 'min-h-11 self-center px-3 text-[15px] font-bold text-teal-ink underline underline-offset-4';
export const field = 'min-h-12 w-full rounded-xl border border-line bg-card px-3.5 text-base text-ink';
export const errorText = 'text-sm font-semibold text-teal-ink';

export const CHECK_FAILED: Bi = {
  ar: 'تعذّر التحقق. يمكنني المحاولة مرة أخرى.',
  en: 'Could not check. I can try again.',
};

export const RANGE_ERROR: Bi = {
  ar: 'أدخل ٤ إلى ٦ أرقام',
  en: 'Enter 4 to 6 digits',
};

/** Polite live region with the seconds left in the shared wait; always rendered so changes are announced. */
export function WaitStatus({ waitMs }: { waitMs: number }) {
  const { t } = useI18n();
  return (
    <p role="status" aria-live="polite" className="min-h-6 text-sm font-semibold text-ink">
      {waitMs > 0
        ? t(
            {
              ar: 'يمكنني المحاولة مرة أخرى بعد {s} ثانية',
              en: 'Try again in {s} s',
            },
            { s: Math.ceil(waitMs / 1000) },
          )
        : null}
    </p>
  );
}

export function BackButton({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  return (
    <button type="button" onClick={onBack} className={link}>
      {t({ ar: 'رجوع', en: 'Back' })}
    </button>
  );
}
