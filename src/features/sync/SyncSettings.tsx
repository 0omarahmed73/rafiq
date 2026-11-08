// The Settings card «المزامنة» / "Sync": owns the step and the form state; the steps themselves only render.
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/LanguageProvider';
import { card, errorText } from '../lock/lockUi';
import { OffPanel, OnPanel, TurnOffConfirm } from './OnPanel';
import { ResetConfirmStep, ResetPassphraseStep } from './ResetSteps';
import { CodeStep, EmailStep, VaultUnknownStep } from './SignInSteps';
import { checkPassphrase, MIN_PASSPHRASE_LENGTH, SyncAccountError, type VaultStatus } from './syncAccount';
import { COPY, ERRORS, stateText } from './syncCopy';
import { CardStatus, useNotice } from './syncFields';
import { useSync, type SyncApi } from './SyncProvider';
import { CreateStep, UnlockStep } from './VaultSteps';

type Step =
  'off' | 'email' | 'code' | 'vaultUnknown' | 'create' | 'unlock' | 'on' | 'turnOff' | 'resetConfirm' | 'reset';
/** setup: first sign-in from off; reauth: sign in again with the key kept; attention: unlock from the on panel. */
type Flow = 'setup' | 'reauth' | 'attention';

export function SyncSettings() {
  const sync = useSync();
  if (!sync) return null;
  return <ConfiguredSyncSettings sync={sync} />;
}

function ConfiguredSyncSettings({ sync }: { sync: SyncApi }) {
  const { t } = useI18n();
  const { account, state } = sync;
  const [step, setStep] = useState<Step>(() => (state.status !== 'off' && state.email ? 'on' : 'off'));
  const [flow, setFlow] = useState<Flow>('setup');
  /** The account being signed in again; another account must not keep this key. */
  const [reauthEmail, setReauthEmail] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [again, setAgain] = useState('');
  const [typed, setTyped] = useState('');
  const [recordCount, setRecordCount] = useState(0);
  const [resendAttempt, setResendAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useNotice(state);
  const lastStatus = useRef(state.status);

  useEffect(() => {
    const was = lastStatus.current;
    lastStatus.current = state.status;
    if (state.status !== 'off' && state.email) setStep((current) => (current === 'off' ? 'on' : current));
    else if (state.status === 'off' && was !== 'off') {
      // Sync went off (here or elsewhere): no signed-in step can continue, and no typed secret stays in memory.
      setStep('off');
      setCode('');
      setPassphrase('');
      setAgain('');
      setTyped('');
    }
  }, [state.status, state.email]);

  function go(next: Step) {
    setStep(next);
    setCode('');
    setPassphrase('');
    setAgain('');
    setTyped('');
    setError(null);
    setNotice(null);
  }

  function errorMessage(cause: unknown): string {
    return t(cause instanceof SyncAccountError ? ERRORS[cause.kind] : ERRORS.unknown, { n: MIN_PASSPHRASE_LENGTH });
  }

  /** One request at a time; busy is always released, and a failure shows its copy unless `onError` handles it. */
  async function run(work: () => Promise<void>, onError = (cause: unknown) => setError(errorMessage(cause))) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (cause) {
      onError(cause);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function chooseVault(vault: VaultStatus) {
    go(vault === 'none' ? 'create' : vault === 'exists' ? 'unlock' : 'vaultUnknown');
  }

  function begin(next: Flow) {
    setFlow(next);
    const expected = next === 'reauth' ? state.email || '' : '';
    setReauthEmail(expected);
    setEmail(expected);
    go('email');
  }

  const requestCode = () =>
    run(async () => {
      const clean = email.trim();
      await account.requestCode(clean);
      setEmail(clean);
      go('code');
      setNotice(t(COPY.codeSent));
    });

  const verifyCode = () =>
    run(
      async () => {
        const result = await account.verifyCode(email, code.trim());
        setEmail(result.email || email);
        if (flow !== 'reauth') return chooseVault(result.vault);
        if (reauthEmail && result.email.toLowerCase() !== reauthEmail.toLowerCase()) {
          // The key belongs to the other account: forget it here (local data stays) rather than sync across accounts.
          await account.signOut();
          setEmail('');
          go('off');
          setError(t(COPY.otherAccount));
          return;
        }
        // The key is still on this device: the new session is all sync needed.
        go('on');
        setNotice(t(COPY.signedInAgain));
        void sync.syncNow().catch(() => undefined);
      },
      (cause) => {
        setCode('');
        const wrongCode = cause instanceof SyncAccountError && cause.kind === 'auth';
        setError(wrongCode ? t(COPY.wrongCode) : errorMessage(cause));
      },
    );

  const resendCode = () =>
    run(async () => {
      await account.requestCode(email);
      setCode('');
      setResendAttempt((attempt) => attempt + 1);
      setNotice(t(COPY.newCodeSent));
    });

  const retryVaultStatus = () => run(async () => chooseVault(await account.vaultStatus()));

  /** Leaving set-up after the code was accepted: sign out so no session is left without a key. */
  const cancelSetup = () =>
    run(async () => {
      try {
        await account.signOut();
      } finally {
        setEmail('');
        go('off');
      }
    });

  const cancelVaultStep = () => (flow === 'setup' ? void cancelSetup() : go('on'));

  function newPassphraseError(): string | null {
    if (checkPassphrase(passphrase) !== 'ok') return t(ERRORS.tooShort, { n: MIN_PASSPHRASE_LENGTH });
    if (passphrase === again) return null;
    setAgain('');
    return t(COPY.mismatch);
  }

  const createVault = () => {
    const invalid = newPassphraseError();
    if (invalid) return setError(invalid);
    void run(
      async () => {
        await account.createVault(passphrase);
        go('on');
        setNotice(t(COPY.created));
      },
      (cause) => {
        if (!(cause instanceof SyncAccountError && cause.kind === 'vaultExists')) return setError(errorMessage(cause));
        go('unlock');
        setError(errorMessage(cause));
      },
    );
  };

  const unlockVault = () =>
    run(
      async () => {
        if (!(await account.unlockVault(passphrase))) {
          setPassphrase('');
          setError(t(COPY.wrongPassphrase));
          return;
        }
        go('on');
        setNotice(t(COPY.unlocked));
      },
      (cause) => {
        setPassphrase('');
        setError(errorMessage(cause));
      },
    );

  const beginReset = () =>
    run(async () => {
      setRecordCount(await account.localRecordCount());
      go('resetConfirm');
    });

  function continueReset() {
    if (recordCount === 0 && typed !== t(COPY.eraseWord)) return setError(t(COPY.typeWordError));
    go('reset');
  }

  const resetVault = () => {
    const invalid = newPassphraseError();
    if (invalid) return setError(invalid);
    void run(async () => {
      await account.resetVault(passphrase, { allowEmpty: recordCount === 0 });
      go('on');
      setNotice(t(COPY.replaced));
    });
  };

  const turnOff = () =>
    run(async () => {
      await account.signOut();
      setEmail('');
      go('off');
      setNotice(t(COPY.turnedOff));
    });

  const syncNow = () =>
    run(async () => {
      setNotice(null);
      await sync.syncNow();
    });

  const healthy = state.status === 'idle' || state.status === 'syncing';
  const live = step === 'on' ? stateText(state, t) : null;
  const shownNotice = step === 'on' && !healthy ? null : notice;
  const field = { busy, passphrase, onPassphrase: setPassphrase, again, onAgain: setAgain };

  return (
    <section className={card} aria-labelledby="sync-title">
      <h2 id="sync-title" className="text-base font-bold">
        {t(COPY.title)}
      </h2>
      {step === 'off' && <OffPanel onTurnOn={() => begin('setup')} />}
      {step === 'email' && (
        <EmailStep
          email={email}
          onEmail={setEmail}
          readOnly={flow === 'reauth' && reauthEmail !== ''}
          busy={busy}
          onSubmit={() => void requestCode()}
          onCancel={() => go(flow === 'reauth' ? 'on' : 'off')}
        />
      )}
      {step === 'code' && (
        <CodeStep
          code={code}
          onCode={setCode}
          busy={busy}
          resendAttempt={resendAttempt}
          onSubmit={() => void verifyCode()}
          onResend={() => void resendCode()}
          onChangeEmail={() => go('email')}
        />
      )}
      {step === 'vaultUnknown' && (
        <VaultUnknownStep busy={busy} onRetry={() => void retryVaultStatus()} onCancel={() => void cancelSetup()} />
      )}
      {step === 'create' && <CreateStep {...field} onSubmit={createVault} onCancel={cancelVaultStep} />}
      {step === 'unlock' && <UnlockStep {...field} onSubmit={() => void unlockVault()} onCancel={cancelVaultStep} />}
      {step === 'on' && (
        <OnPanel
          state={state}
          email={state.email || email}
          busy={busy}
          onSyncNow={() => void syncNow()}
          onEnterPassphrase={() => {
            setFlow('attention');
            go('unlock');
          }}
          onSignInAgain={() => begin('reauth')}
          onReset={() => void beginReset()}
          onTurnOff={() => go('turnOff')}
        />
      )}
      {step === 'turnOff' && <TurnOffConfirm busy={busy} onConfirm={() => void turnOff()} onBack={() => go('on')} />}
      {step === 'resetConfirm' && (
        <ResetConfirmStep
          recordCount={recordCount}
          typed={typed}
          onTyped={setTyped}
          busy={busy}
          onContinue={continueReset}
          onCancel={() => go('on')}
        />
      )}
      {step === 'reset' && <ResetPassphraseStep {...field} onSubmit={resetVault} onCancel={() => go('on')} />}
      {error && (
        <p role="alert" className={errorText}>
          {error}
        </p>
      )}
      <CardStatus live={live} notice={shownNotice} />
    </section>
  );
}
