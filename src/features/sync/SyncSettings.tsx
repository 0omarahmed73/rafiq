import { useEffect, useState, type FormEvent } from 'react';
import { useI18n } from '../../i18n/LanguageProvider';
import { dayKey, formatFullDate, formatTime } from '../../lib/dates';
import { card, errorText, field, primary, secondary } from '../lock/lockUi';
import { SyncAccountError, type SyncAccountErrorKind, type VaultStatus } from './syncAccount';
import { useSync } from './SyncProvider';
import type { SyncIssue, SyncState } from './syncEngine';

type Step = 'off' | 'email' | 'code' | 'vaultUnknown' | 'create' | 'unlock' | 'on' | 'resetConfirm' | 'reset';
const CODE_RESEND_DELAY_SECONDS = 60;

const PRIVACY = {
  ar: 'بياناتي تُشفَّر على هذا الهاتف قبل أن تغادره. إذا نسيت عبارة المرور أستطيع إعادة ضبط النسخة السحابية من جهاز ما زال يحتوي بياناتي.',
  en: 'My data is encrypted on this phone before it leaves it. If I forget the passphrase, I can reset the cloud copy from a device that still has my data.',
};

const ERRORS: Record<SyncAccountErrorKind, { ar: string; en: string }> = {
  newerVersion: { ar: 'تحتاج هذه النسخة إلى تحديث لفتح بيانات المزامنة.', en: 'Update this app to open the synced data.' },
  tooShort: { ar: 'أختار عبارة مرور من ١٠ أحرف على الأقل.', en: 'Choose a passphrase with at least 10 characters.' },
  notSignedIn: { ar: 'انتهى تسجيل الدخول. أبدأ من جديد.', en: 'The sign-in session ended. I can start again.' },
  network: { ar: 'تعذّر الاتصال. أتحقق من الإنترنت وأحاول ثانية.', en: 'Could not connect. I check my connection and try again.' },
  auth: { ar: 'تعذّر التحقق من الحساب أو الرمز.', en: 'Could not verify the account or code.' },
  tooLarge: { ar: 'النسخة أكبر من الحد الذي تسمح به الخدمة.', en: 'This copy is larger than the service allows.' },
  vaultExists: { ar: 'توجد نسخة سحابية بالفعل. أفتحها بعبارة مرورها.', en: 'A cloud copy already exists. I will unlock it with its passphrase.' },
  noVault: { ar: 'لم أجد نسخة سحابية. أتحقق من الحالة وأحاول ثانية.', en: 'No cloud copy was found. I can check again and retry.' },
  emptyLocal: { ar: 'لا توجد سجلات على هذا الجهاز. أؤكد صراحة قبل استبدال النسخة.', en: 'This device has no records. I must explicitly confirm before replacing the copy.' },
  unknown: { ar: 'تعذّرت العملية. أستطيع المحاولة مرة أخرى.', en: 'That did not work. I can try again.' },
};

const ISSUES: Record<SyncIssue, { ar: string; en: string }> = {
  wrongPassphrase: { ar: 'أحتاج إلى عبارة المرور لفتح النسخة المشفّرة.', en: 'I need the passphrase to open the encrypted copy.' },
  keyChanged: { ar: 'تغيّرت عبارة المرور على جهاز آخر. أدخل العبارة الجديدة.', en: 'The passphrase changed on another device. Enter the new one.' },
  damaged: { ar: 'تعذّر فتح النسخة السحابية أو التحقق منها.', en: 'The cloud copy could not be opened or validated.' },
  newerVersion: { ar: 'يحتاج هذا الجهاز إلى نسخة أحدث من التطبيق.', en: 'This device needs a newer version of the app.' },
  tooLarge: ERRORS.tooLarge,
  auth: ERRORS.auth,
  busy: { ar: 'تغيّرت النسخة أكثر من مرة أثناء المزامنة. أحاول ثانية.', en: 'The copy changed repeatedly during sync. I will try again.' },
  unknown: ERRORS.unknown,
};

function stateText(state: SyncState): { ar: string; en: string } {
  if (state.status === 'syncing') return { ar: 'أزامن الآن…', en: 'Syncing now…' };
  if (state.status === 'offline') return { ar: 'لا يوجد اتصال. سأحاول عند عودة الإنترنت.', en: 'Offline. I will retry when I am online.' };
  if (state.status === 'attention') return state.issue ? ISSUES[state.issue] : ERRORS.unknown;
  return { ar: 'المزامنة مفعّلة.', en: 'Sync is on.' };
}

export function SyncSettings() {
  const sync = useSync();
  if (!sync) return null;
  return <ConfiguredSyncSettings sync={sync} />;
}

function ConfiguredSyncSettings({ sync }: { sync: NonNullable<ReturnType<typeof useSync>> }) {
  const { t, lang, digits } = useI18n();
  const [step, setStep] = useState<Step>('off');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [again, setAgain] = useState('');
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [recordCount, setRecordCount] = useState(0);
  const [resendAfter, setResendAfter] = useState(0);
  const [resendAttempt, setResendAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (sync.state.status !== 'off' && sync.state.email) setStep((current) => (current === 'off' ? 'on' : current));
    else if (sync.state.status === 'off') setStep((current) => (current === 'on' ? 'off' : current));
  }, [sync.state.status, sync.state.email]);

  useEffect(() => {
    if (step !== 'code') return;
    setResendAfter(CODE_RESEND_DELAY_SECONDS);
    const timer = window.setInterval(() => setResendAfter((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [step, resendAttempt]);

  function go(next: Step) {
    setStep(next);
    setCode('');
    setPassphrase('');
    setAgain('');
    setTypedConfirmation('');
    setError(null);
    setStatus(null);
  }

  function errorMessage(cause: unknown): string {
    return t(cause instanceof SyncAccountError ? ERRORS[cause.kind] : ERRORS.unknown);
  }

  async function chooseVault(vault: VaultStatus) {
    if (vault === 'none') go('create');
    else if (vault === 'exists') go('unlock');
    else go('vaultUnknown');
  }

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const clean = email.trim();
      await sync.account.requestCode(clean);
      setEmail(clean);
      go('code');
      setStatus(t({ ar: 'أرسلتُ رمزًا إلى بريدي الإلكتروني.', en: 'I sent a code to my email.' }));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await sync.account.verifyCode(email, code.trim());
      setEmail(result.email || email);
      await chooseVault(result.vault);
      if (result.vault === 'unknown') setStatus(t({ ar: 'تم تسجيل الدخول، لكن تعذّر فحص النسخة. أتحقق ثانية.', en: 'I signed in, but could not check the cloud copy. I can retry.' }));
    } catch (cause) {
      setCode('');
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    if (busy || resendAfter > 0) return;
    setBusy(true);
    setError(null);
    try {
      await sync.account.requestCode(email);
      setCode('');
      setResendAttempt((attempt) => attempt + 1);
      setStatus(t({ ar: 'أرسلتُ رمزًا جديدًا إلى بريدي الإلكتروني.', en: 'I sent a new code to my email.' }));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function retryVaultStatus() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await chooseVault(await sync.account.vaultStatus());
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function createVault(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (passphrase.length < 10) return setError(t(ERRORS.tooShort));
    if (passphrase !== again) {
      setAgain('');
      return setError(t({ ar: 'عبارتا المرور غير متطابقتين.', en: 'The passphrases do not match.' }));
    }
    setBusy(true);
    setError(null);
    try {
      await sync.account.createVault(passphrase);
      setEmail((current) => current || sync.state.email || '');
      go('on');
      setStatus(t({ ar: 'أنشأتُ نسخة مشفّرة وبدأت المزامنة.', en: 'I created an encrypted copy and started syncing.' }));
    } catch (cause) {
      if (cause instanceof SyncAccountError && cause.kind === 'vaultExists') go('unlock');
      else setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function unlockVault(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!(await sync.account.unlockVault(passphrase))) {
        setPassphrase('');
        setError(t({ ar: 'عبارة المرور غير صحيحة. أتحقق منها وأحاول ثانية.', en: 'That passphrase is not right. I can check it and try again.' }));
        return;
      }
      go('on');
      setStatus(t({ ar: 'فتحتُ النسخة وبدأت المزامنة.', en: 'I unlocked the copy and started syncing.' }));
    } catch (cause) {
      setPassphrase('');
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function beginReset() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      setRecordCount(await sync.account.localRecordCount());
      go('resetConfirm');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  function continueReset() {
    const confirmation = lang === 'ar' ? 'امسح' : 'ERASE';
    if (recordCount === 0 && typedConfirmation !== confirmation) {
      setError(t({ ar: 'أكتب كلمة «امسح» للتأكيد.', en: 'Type “ERASE” to confirm.' }));
      return;
    }
    go('reset');
  }

  async function resetVault(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (passphrase.length < 10) return setError(t(ERRORS.tooShort));
    if (passphrase !== again) {
      setAgain('');
      return setError(t({ ar: 'عبارتا المرور غير متطابقتين.', en: 'The passphrases do not match.' }));
    }
    setBusy(true);
    setError(null);
    try {
      await sync.account.resetVault(passphrase, { allowEmpty: recordCount === 0 });
      go('on');
      setStatus(t({ ar: 'استبدلتُ النسخة السحابية وبدأت المزامنة.', en: 'I replaced the cloud copy and started syncing.' }));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await sync.account.signOut();
      setEmail('');
      go('off');
      setStatus(t({ ar: 'أوقفتُ المزامنة على هذا الجهاز. بياناتي المحلية باقية.', en: 'I turned off sync on this device. My local data stays here.' }));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    if (busy) return;
    setBusy(true);
    setError(null);
    await sync.syncNow();
    setBusy(false);
  }

  const alert = error && <p role="alert" className={errorText}>{error}</p>;
  const statusLine = (status || (step === 'on' ? t(stateText(sync.state)) : null)) && (
    <p role="status" aria-live="polite" className="text-sm font-semibold text-ink">
      {status || t(stateText(sync.state))}
    </p>
  );
  const label = (id: string, text: string) => <label htmlFor={id} className="text-sm font-semibold">{text}</label>;
  const lastSynced = sync.state.lastSyncedAt;

  return (
    <section className={card} aria-labelledby="sync-title">
      <h2 id="sync-title" className="text-base font-bold">{t({ ar: 'المزامنة', en: 'Sync' })}</h2>
      {step === 'off' && (
        <>
          <p className="text-sm leading-7 text-muted">{t(PRIVACY)}</p>
          <button type="button" className={primary} onClick={() => { setEmail(''); go('email'); }}>
            {t({ ar: 'تفعيل المزامنة', en: 'Turn on sync' })}
          </button>
        </>
      )}

      {step === 'email' && (
        <form className="flex flex-col gap-3" onSubmit={(event) => void requestCode(event)}>
          {label('sync-email', t({ ar: 'البريد الإلكتروني', en: 'Email address' }))}
          <input id="sync-email" className={field} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          <button className={primary} disabled={busy}>{t({ ar: 'إرسال رمز', en: 'Send a code' })}</button>
          <button type="button" className={secondary} onClick={() => go('off')}>{t({ ar: 'إلغاء', en: 'Cancel' })}</button>
        </form>
      )}

      {step === 'code' && (
        <form className="flex flex-col gap-3" onSubmit={(event) => void verifyCode(event)}>
          <p className="text-sm leading-7 text-muted">{t({ ar: 'أدخل الرمز الذي وصل إلى بريدي الإلكتروني.', en: 'Enter the code sent to my email.' })}</p>
          {label('sync-code', t({ ar: 'رمز البريد الإلكتروني', en: 'Email code' }))}
          <input id="sync-code" className={field} type="text" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(event) => setCode(event.target.value)} />
          <button className={primary} disabled={busy}>{t({ ar: 'التحقق من الرمز', en: 'Verify code' })}</button>
          <button type="button" className={secondary} disabled={busy || resendAfter > 0} onClick={() => void resendCode()}>
            {resendAfter > 0
              ? t({ ar: 'إعادة الإرسال بعد {seconds} ثانية', en: 'Resend in {seconds} seconds' }, { seconds: digits(resendAfter) })
              : t({ ar: 'إعادة إرسال الرمز', en: 'Resend code' })}
          </button>
          <button type="button" className={secondary} onClick={() => go('email')}>{t({ ar: 'تغيير البريد الإلكتروني', en: 'Change email' })}</button>
        </form>
      )}

      {step === 'vaultUnknown' && (
        <>
          <p className="text-sm leading-7 text-muted">{t({ ar: 'تم تسجيل الدخول، لكن تعذّر فحص النسخة السحابية.', en: 'I signed in, but could not check the cloud copy.' })}</p>
          <button type="button" className={primary} disabled={busy} onClick={() => void retryVaultStatus()}>{t({ ar: 'التحقق مرة أخرى', en: 'Check again' })}</button>
        </>
      )}

      {step === 'create' && (
        <form className="flex flex-col gap-3" onSubmit={(event) => void createVault(event)}>
          <p className="text-sm leading-7 text-muted">{t({ ar: 'أنشئ عبارة مرور من ١٠ أحرف على الأقل واحفظها. لا أستطيع استعادتها إذا نسيتها.', en: 'Create and save a passphrase with at least 10 characters. I cannot recover it if I forget it.' })}</p>
          {label('sync-new-passphrase', t({ ar: 'عبارة المرور', en: 'Passphrase' }))}
          <input id="sync-new-passphrase" className={field} type="password" autoComplete="new-password" required value={passphrase} onChange={(event) => setPassphrase(event.target.value)} />
          {label('sync-new-passphrase-again', t({ ar: 'أكرر عبارة المرور', en: 'Repeat passphrase' }))}
          <input id="sync-new-passphrase-again" className={field} type="password" autoComplete="new-password" required value={again} onChange={(event) => setAgain(event.target.value)} />
          <button className={primary} disabled={busy}>{t({ ar: 'إنشاء النسخة المشفّرة', en: 'Create encrypted copy' })}</button>
          <button type="button" className={secondary} onClick={() => go('off')}>{t({ ar: 'إلغاء', en: 'Cancel' })}</button>
        </form>
      )}

      {step === 'unlock' && (
        <form className="flex flex-col gap-3" onSubmit={(event) => void unlockVault(event)}>
          <p className="text-sm leading-7 text-muted">{t({ ar: 'أدخل عبارة المرور التي أنشأتُ بها النسخة السحابية.', en: 'Enter the passphrase I used to create the cloud copy.' })}</p>
          {label('sync-unlock-passphrase', t({ ar: 'عبارة المرور', en: 'Passphrase' }))}
          <input id="sync-unlock-passphrase" className={field} type="password" autoComplete="current-password" required value={passphrase} onChange={(event) => setPassphrase(event.target.value)} />
          <button className={primary} disabled={busy}>{t({ ar: 'فتح النسخة', en: 'Unlock copy' })}</button>
          <button type="button" className={secondary} onClick={() => go('off')}>{t({ ar: 'إلغاء', en: 'Cancel' })}</button>
        </form>
      )}

      {step === 'on' && (
        <>
          <p className="text-sm text-muted" dir="ltr">{sync.state.email || email}</p>
          {lastSynced && <p className="text-sm text-muted">{t({ ar: 'آخر مزامنة:', en: 'Last synced:' })} {formatFullDate(dayKey(new Date(lastSynced)))} · {formatTime(lastSynced)}</p>}
          {sync.state.status === 'attention' && (sync.state.issue === 'wrongPassphrase' || sync.state.issue === 'keyChanged') && (
            <button type="button" className={secondary} onClick={() => go('unlock')}>{t({ ar: 'إدخال عبارة المرور', en: 'Enter passphrase' })}</button>
          )}
          {sync.state.status === 'attention' && sync.state.issue === 'damaged' && (
            <button type="button" className={secondary} disabled={busy} onClick={() => void syncNow()}>{t({ ar: 'المحاولة مرة أخرى', en: 'Try again' })}</button>
          )}
          <button type="button" className={primary} disabled={busy} onClick={() => void syncNow()}>{t({ ar: 'مزامنة الآن', en: 'Sync now' })}</button>
          <button type="button" className={secondary} disabled={busy} onClick={() => void beginReset()}>{t({ ar: 'إعادة ضبط النسخة السحابية', en: 'Reset cloud copy' })}</button>
          <button type="button" className={secondary} disabled={busy} onClick={() => void signOut()}>{t({ ar: 'إيقاف المزامنة على هذا الجهاز', en: 'Turn off sync on this device' })}</button>
        </>
      )}

      {step === 'resetConfirm' && (
        <div className="flex flex-col gap-3">
          <p className="text-sm leading-7 text-muted">{t({ ar: 'سأستبدل النسخة السحابية ببيانات هذا الجهاز. ستحتاج أجهزتي الأخرى إلى عبارة المرور الجديدة.', en: 'I will replace the cloud copy with this device’s data. My other devices will need the new passphrase.' })}</p>
          <p className="text-sm font-semibold">{t({ ar: 'السجلات التي سأرفع:', en: 'Records on this device:' })} {digits(recordCount)}</p>
          {recordCount === 0 && (
            <>
              <p className="text-sm leading-7 font-semibold text-teal-ink">{t({ ar: 'لا توجد سجلات. سيؤدي التأكيد إلى استبدال النسخة السحابية ببيانات فارغة.', en: 'There are no records. Confirming will replace the cloud copy with empty data.' })}</p>
              {label('sync-empty-confirm', t({ ar: 'أكتب «امسح» للتأكيد', en: 'Type “ERASE” to confirm' }))}
              <input id="sync-empty-confirm" className={field} type="text" autoComplete="off" value={typedConfirmation} onChange={(event) => setTypedConfirmation(event.target.value)} />
            </>
          )}
          <button type="button" className={primary} disabled={busy || (recordCount === 0 && typedConfirmation !== (lang === 'ar' ? 'امسح' : 'ERASE'))} onClick={continueReset}>
            {t({ ar: 'متابعة وإدخال عبارة جديدة', en: 'Continue and enter a new passphrase' })}
          </button>
          <button type="button" className={secondary} onClick={() => go('on')}>{t({ ar: 'إلغاء', en: 'Cancel' })}</button>
        </div>
      )}

      {step === 'reset' && (
        <form className="flex flex-col gap-3" onSubmit={(event) => void resetVault(event)}>
          <p className="text-sm leading-7 text-muted">{t({ ar: 'أختار عبارة مرور جديدة من ١٠ أحرف على الأقل. ستفتح هذه العبارة النسخة على أجهزتي الأخرى.', en: 'Choose a new passphrase with at least 10 characters. It will unlock the copy on my other devices.' })}</p>
          {label('sync-reset-passphrase', t({ ar: 'عبارة المرور الجديدة', en: 'New passphrase' }))}
          <input id="sync-reset-passphrase" className={field} type="password" autoComplete="new-password" required value={passphrase} onChange={(event) => setPassphrase(event.target.value)} />
          {label('sync-reset-passphrase-again', t({ ar: 'أكرر عبارة المرور الجديدة', en: 'Repeat new passphrase' }))}
          <input id="sync-reset-passphrase-again" className={field} type="password" autoComplete="new-password" required value={again} onChange={(event) => setAgain(event.target.value)} />
          <button className={primary} disabled={busy}>{t({ ar: 'استبدال النسخة السحابية', en: 'Replace cloud copy' })}</button>
          <button type="button" className={secondary} onClick={() => go('on')}>{t({ ar: 'إلغاء', en: 'Cancel' })}</button>
        </form>
      )}

      {alert}
      {statusLine}
    </section>
  );
}
