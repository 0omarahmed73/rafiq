import { useState, type FormEvent } from 'react';
import { useI18n } from '../../i18n/LanguageProvider';
import { useLock } from './LockProvider';
import { BackButton, RANGE_ERROR, WaitStatus, card, errorText, field, primary, secondary } from './lockUi';
import { isValidPin, isWeakPin, normalizeDigits, normalizeRecoveryCode } from './pin';

type Step = 'code' | 'newPin' | 'saved';

const CODE_LENGTH = 12;

/** Forgot-PIN path with a recovery code: check the code, choose a new PIN, show the new code, then open. */
export function RecoverView({ onBack }: { onBack: () => void }) {
  const { t } = useI18n();
  const { waitMs, recover, changePin, finishRecovery } = useLock();
  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [again, setAgain] = useState('');
  const [newCode, setNewCode] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const blocked = waitMs > 0;

  async function checkCode(event: FormEvent) {
    event.preventDefault();
    if (blocked || busy) return;
    setError(null);
    if (normalizeRecoveryCode(code).length !== CODE_LENGTH) {
      setError(
        t({
          ar: 'أكتب الرمز كاملًا: ١٢ حرفًا ورقمًا',
          en: 'Enter the whole code: 12 letters and numbers',
        }),
      );
      return;
    }
    setBusy(true);
    const result = await recover(code);
    setBusy(false);
    if (result === 'ok') {
      setCode('');
      setStep('newPin');
    } else if (result === 'wrong') {
      setError(
        t({
          ar: 'رمز الاسترداد غير صحيح',
          en: 'That recovery code is not right',
        }),
      );
    }
  }

  async function savePin(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (!isValidPin(pin)) return setError(t(RANGE_ERROR));
    if (isWeakPin(pin)) {
      return setError(
        t({
          ar: 'هذا الرمز سهل التخمين. أختار رمزًا آخر.',
          en: 'This PIN is easy to guess. I will choose another one.',
        }),
      );
    }
    if (pin !== again) return setError(t({ ar: 'الرمزان غير متطابقين', en: 'The two PINs do not match' }));
    setBusy(true);
    try {
      setNewCode(await changePin(pin));
      setPin('');
      setAgain('');
      setStep('saved');
    } catch {
      setError(
        t({
          ar: 'تعذّر حفظ الرمز. يمكنني المحاولة مرة أخرى.',
          en: 'Could not save the PIN. I can try again.',
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(newCode);
      setCopied(true);
    } catch {
      // clipboard unavailable: the code stays on screen to write down
    }
  }

  const alert = error && (
    <p role="alert" className={errorText}>
      {error}
    </p>
  );

  if (step === 'saved') {
    return (
      <section aria-labelledby="new-code-title" className={card}>
        <h2 id="new-code-title" className="text-base font-bold">
          {t({ ar: 'رمز الاسترداد الجديد', en: 'My new recovery code' })}
        </h2>
        <p className="text-sm leading-7 text-muted">
          {t({
            ar: 'حفظت رمزي الجديد. أكتب رمز الاسترداد هذا وأحفظه في مكان آمن خارج الهاتف. الرمز القديم لم يعد يعمل، ولن يظهر هذا الرمز مرة أخرى.',
            en: 'My new PIN is saved. I write this recovery code down and keep it somewhere safe off this phone. The old code no longer works, and this one will not be shown again.',
          })}
        </p>
        <p
          data-testid="new-recovery-code"
          dir="ltr"
          className="break-all text-center font-mono text-2xl font-bold tracking-widest"
        >
          {newCode}
        </p>
        <button type="button" onClick={() => void copy()} className={secondary}>
          {t({ ar: 'نسخ', en: 'Copy' })}
        </button>
        <p role="status" className="min-h-6 text-sm font-semibold text-ink">
          {copied ? t({ ar: 'نسخت الرمز.', en: 'I copied the code.' }) : null}
        </p>
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] font-semibold">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="h-5 w-5" />
          {t({ ar: 'حفظت رمز الاسترداد', en: 'I saved it' })}
        </label>
        <button type="button" disabled={!saved} onClick={finishRecovery} className={primary}>
          {t({ ar: 'تم', en: 'Done' })}
        </button>
      </section>
    );
  }

  if (step === 'newPin') {
    return (
      <form onSubmit={savePin} noValidate aria-labelledby="new-pin-title" className={card}>
        <h2 id="new-pin-title" className="text-base font-bold">
          {t({ ar: 'أختار رمزًا جديدًا', en: 'I choose a new PIN' })}
        </h2>
        <PinField id="recover-pin" label={t({ ar: 'الرمز الجديد', en: 'New PIN' })} value={pin} onChange={setPin} />
        <PinField
          id="recover-pin-again"
          label={t({ ar: 'أعيد كتابة الرمز الجديد', en: 'New PIN again' })}
          value={again}
          onChange={setAgain}
        />
        {alert}
        <button type="submit" disabled={busy} className={primary}>
          {t({ ar: 'احفظ الرمز الجديد', en: 'Save the new PIN' })}
        </button>
        <BackButton onBack={onBack} />
      </form>
    );
  }

  return (
    <form onSubmit={checkCode} noValidate aria-labelledby="recover-title" className={card}>
      <h2 id="recover-title" className="text-base font-bold">
        {t({ ar: 'أفتح برمز الاسترداد', en: 'I open with my recovery code' })}
      </h2>
      <p className="text-sm leading-7 text-muted">
        {t({
          ar: 'أكتب الرمز المكوّن من ١٢ حرفًا ورقمًا الذي حفظته عند تفعيل القفل. لا تهم الأحرف الكبيرة والصغيرة ولا الشرطات.',
          en: 'I enter the 12-character code I saved when I turned on the lock. Capitals and dashes do not matter.',
        })}
      </p>
      <label htmlFor="recover-code" className="text-[15px] font-semibold">
        {t({ ar: 'رمز الاسترداد', en: 'Recovery code' })}
      </label>
      <input
        id="recover-code"
        type="text"
        dir="ltr"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        value={code}
        onChange={(e) => {
          setError(null);
          setCode(e.target.value);
        }}
        className={`${field} font-mono tracking-wider`}
      />
      {alert}
      <WaitStatus waitMs={waitMs} />
      <button type="submit" disabled={blocked || busy} className={primary}>
        {t({ ar: 'تحقّق', en: 'Check' })}
      </button>
      <BackButton onBack={onBack} />
    </form>
  );
}

function PinField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-semibold">
        {label}
      </label>
      <input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="new-password"
        maxLength={6}
        dir="ltr"
        value={value}
        onChange={(e) => onChange(normalizeDigits(e.target.value))}
        className={field}
      />
    </div>
  );
}
