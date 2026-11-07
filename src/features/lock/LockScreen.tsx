import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useI18n } from '../../i18n/LanguageProvider';
import { isBiometricAvailable } from '../../platform/biometric';
import { EraseView } from './EraseView';
import { useLock } from './LockProvider';
import { RecoverView } from './RecoverView';
import { BackButton, RANGE_ERROR, WaitStatus, card, errorText, link, primary, secondary } from './lockUi';
import { isValidPin, normalizeDigits } from './pin';

type View = 'pin' | 'forgot' | 'recover' | 'erase';

const MAX_PIN = 6;
const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** The full-screen lock, drawn by LockProvider instead of the app. It shows no user data. */
export function LockScreen() {
  const { t } = useI18n();
  const { record, unlockWithBiometric } = useLock();
  const [view, setView] = useState<View>('pin');
  const [bioReady, setBioReady] = useState(false);
  const promptTried = useRef(false);
  const wantsBio = record?.biometric === true;

  // When biometrics are on and available, show the button and try the prompt once; failure leaves the pad.
  useEffect(() => {
    if (!wantsBio) return;
    let alive = true;
    void isBiometricAvailable().then((available) => {
      if (!alive || !available) return;
      setBioReady(true);
      if (promptTried.current) return;
      promptTried.current = true;
      void unlockWithBiometric();
    });
    return () => {
      alive = false;
    };
  }, [wantsBio, unlockWithBiometric]);

  return (
    <main className="flex min-h-screen w-full justify-center overflow-x-hidden bg-bg px-4 py-8 text-ink">
      <div className="flex w-full max-w-sm flex-col gap-5">
        <h1 className="text-center text-[28px] font-bold leading-snug">{t({ ar: 'رفيق', en: 'Rafiq' })}</h1>
        {view === 'pin' && <PinView bioReady={bioReady && wantsBio} onForgot={() => setView('forgot')} />}
        {view === 'forgot' && (
          <section aria-labelledby="forgot-title" className={card}>
            <h2 id="forgot-title" className="text-base font-bold">
              {t({ ar: 'نسيت الرمز', en: 'I forgot my PIN' })}
            </h2>
            <p className="text-sm leading-7 text-muted">
              {t({
                ar: 'لا يستطيع رفيق معرفة رمزي ولا استعادته. يمكنني اختيار رمز جديد برمز الاسترداد الذي حفظته عند تفعيل القفل.',
                en: 'Rafiq cannot see or bring back my PIN. I can choose a new PIN with the recovery code I saved when I turned on the lock.',
              })}
            </p>
            <button type="button" onClick={() => setView('recover')} className={primary}>
              {t({ ar: 'لدي رمز الاسترداد', en: 'I have my recovery code' })}
            </button>
            <button type="button" onClick={() => setView('erase')} className={secondary}>
              {t({ ar: 'ليس لدي الرمز', en: "I don't have it" })}
            </button>
            <BackButton onBack={() => setView('pin')} />
          </section>
        )}
        {view === 'recover' && <RecoverView onBack={() => setView('pin')} />}
        {view === 'erase' && <EraseView onBack={() => setView('forgot')} />}
      </div>
    </main>
  );
}

function PinView({ bioReady, onForgot }: { bioReady: boolean; onForgot: () => void }) {
  const { t, digits } = useI18n();
  const { waitMs, unlock, unlockWithBiometric } = useLock();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const blocked = waitMs > 0;

  function change(next: string) {
    setError(null);
    setValue(normalizeDigits(next).slice(0, MAX_PIN));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (blocked || busy) return;
    if (!isValidPin(value)) {
      setError(t(RANGE_ERROR));
      return;
    }
    setBusy(true);
    const result = await unlock(value);
    if (result === 'ok') return;
    setBusy(false);
    setValue('');
    if (result === 'wrong') setError(t({ ar: 'الرمز غير صحيح', en: 'That PIN is not right' }));
  }

  const padButton =
    'flex min-h-14 items-center justify-center rounded-2xl border border-line bg-card text-2xl font-bold text-ink';

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <label
        htmlFor="lock-pin"
        className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-card p-4 focus-within:ring-2 focus-within:ring-teal"
      >
        <span className="text-[15px] font-semibold">{t({ ar: 'الرمز', en: 'PIN' })}</span>
        <span aria-hidden="true" dir="ltr" className="flex min-h-6 items-center gap-3">
          {value.length === 0 ? (
            <span className="h-0.5 w-16 rounded-full bg-line" />
          ) : (
            [...value].map((_, i) => <span key={i} className="h-3.5 w-3.5 rounded-full bg-ink" />)
          )}
        </span>
      </label>
      <input
        id="lock-pin"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={MAX_PIN}
        value={value}
        onChange={(e) => change(e.target.value)}
        className="sr-only"
      />
      {error && (
        <p role="alert" className={errorText}>
          {error}
        </p>
      )}
      <WaitStatus waitMs={waitMs} />
      <div dir="ltr" className="grid grid-cols-3 gap-3">
        {PAD.map((d) => (
          <PadKey
            key={d}
            d={d}
            label={digits(d)}
            disabled={value.length >= MAX_PIN}
            onPress={() => change(value + d)}
            className={padButton}
          />
        ))}
        <button
          type="button"
          aria-label={t({ ar: 'احذف آخر رقم', en: 'Delete the last digit' })}
          onClick={() => change(value.slice(0, -1))}
          className={`${padButton} text-base`}
        >
          <span aria-hidden="true">⌫</span>
        </button>
        <PadKey
          d="0"
          label={digits(0)}
          disabled={value.length >= MAX_PIN}
          onPress={() => change(value + '0')}
          className={padButton}
        />
        <span />
      </div>
      <button type="submit" disabled={blocked || busy} className={primary}>
        {t({ ar: 'فتح', en: 'Unlock' })}
      </button>
      {bioReady && (
        <button type="button" onClick={() => void unlockWithBiometric()} className={secondary}>
          {t({ ar: 'استخدم البصمة', en: 'Use biometrics' })}
        </button>
      )}
      <button type="button" onClick={onForgot} className={link}>
        {t({ ar: 'نسيت الرمز؟', en: 'Forgot PIN?' })}
      </button>
    </form>
  );
}

function PadKey({
  d,
  label,
  disabled,
  onPress,
  className,
}: {
  d: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
  className: string;
}) {
  return (
    <button type="button" aria-label={d} disabled={disabled} onClick={onPress} className={className}>
      {label}
    </button>
  );
}
