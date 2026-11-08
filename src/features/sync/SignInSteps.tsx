// The sign-in steps of the Sync card: the email, the emailed code and the retry when the vault lookup failed.
import { useEffect, useState, type FormEvent } from 'react';
import { useI18n } from '../../i18n/LanguageProvider';
import { primary } from '../lock/lockUi';
import { COPY } from './syncCopy';
import { CancelButton, Field, intro, Secondary, Submit } from './syncFields';

const CODE_RESEND_DELAY_SECONDS = 60;

export function EmailStep(props: {
  email: string;
  onEmail: (value: string) => void;
  busy: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    props.onSubmit();
  };
  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <Field
        id="sync-email"
        label={COPY.email}
        type="email"
        autoComplete="email"
        required
        value={props.email}
        onValue={props.onEmail}
      />
      <Submit busy={props.busy}>{t(COPY.sendCode)}</Submit>
      <CancelButton busy={props.busy} onCancel={props.onCancel} />
    </form>
  );
}

export function CodeStep(props: {
  code: string;
  onCode: (value: string) => void;
  busy: boolean;
  /** Bumped on each resend: the countdown starts again. */
  resendAttempt: number;
  onSubmit: () => void;
  onResend: () => void;
  onChangeEmail: () => void;
}) {
  const { t } = useI18n();
  const [resendAfter, setResendAfter] = useState(CODE_RESEND_DELAY_SECONDS);
  useEffect(() => {
    setResendAfter(CODE_RESEND_DELAY_SECONDS);
    const timer = window.setInterval(() => setResendAfter((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [props.resendAttempt]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    props.onSubmit();
  };
  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <p className={intro}>{t(COPY.enterCode)}</p>
      <Field
        id="sync-code"
        label={COPY.code}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        required
        value={props.code}
        onValue={props.onCode}
      />
      <Submit busy={props.busy}>{t(COPY.verify)}</Submit>
      <Secondary busy={props.busy || resendAfter > 0} onClick={props.onResend}>
        {resendAfter > 0 ? t(COPY.resendIn, { seconds: resendAfter }) : t(COPY.resend)}
      </Secondary>
      <CancelButton busy={props.busy} onCancel={props.onChangeEmail} text={COPY.changeEmail} />
    </form>
  );
}

export function VaultUnknownStep(props: {
  busy: boolean;
  onRetry: () => void;
  onCancel: () => void;
  onTurnOff: () => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <p className={intro}>{t(COPY.vaultUnknown)}</p>
      <button type="button" className={primary} disabled={props.busy} onClick={props.onRetry}>
        {t(COPY.checkAgain)}
      </button>
      <CancelButton busy={props.busy} onCancel={props.onCancel} />
      <CancelButton busy={props.busy} onCancel={props.onTurnOff} text={COPY.turnOff} />
    </>
  );
}
