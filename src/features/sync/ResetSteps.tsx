// The reset steps of the Sync card: confirm what will be replaced, then choose the new passphrase.
import type { FormEvent } from 'react';
import { useI18n } from '../../i18n/LanguageProvider';
import { primary } from '../lock/lockUi';
import { MIN_PASSPHRASE_LENGTH } from './syncAccount';
import { COPY } from './syncCopy';
import { CancelButton, Field, intro, StrengthHint, Submit } from './syncFields';

export function ResetConfirmStep(props: {
  recordCount: number;
  typed: string;
  onTyped: (value: string) => void;
  busy: boolean;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const { t, digits } = useI18n();
  const empty = props.recordCount === 0;
  return (
    <div className="flex flex-col gap-3">
      <p className={intro}>{t(COPY.resetIntro)}</p>
      <p className="text-sm font-semibold">
        {t(COPY.recordCount)} {digits(props.recordCount)}
      </p>
      {empty ? (
        <>
          <p className="text-sm leading-7 font-semibold text-teal-ink">{t(COPY.resetEmpty)}</p>
          <Field
            id="sync-empty-confirm"
            label={COPY.typeWord}
            type="text"
            autoComplete="off"
            value={props.typed}
            onValue={props.onTyped}
          />
        </>
      ) : (
        <p className="text-sm leading-7 font-semibold">{t(COPY.resetCount, { count: props.recordCount })}</p>
      )}
      <button
        type="button"
        className={primary}
        disabled={props.busy || (empty && props.typed !== t(COPY.eraseWord))}
        onClick={props.onContinue}
      >
        {t(COPY.continueReset)}
      </button>
      <CancelButton busy={props.busy} onCancel={props.onCancel} />
    </div>
  );
}

export function ResetPassphraseStep(props: {
  passphrase: string;
  onPassphrase: (value: string) => void;
  again: string;
  onAgain: (value: string) => void;
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
      <p className={intro}>{t(COPY.resetPassIntro, { n: MIN_PASSPHRASE_LENGTH })}</p>
      <Field
        id="sync-reset-passphrase"
        label={COPY.newPassphrase}
        type="password"
        autoComplete="new-password"
        required
        value={props.passphrase}
        onValue={props.onPassphrase}
      />
      <StrengthHint passphrase={props.passphrase} />
      <Field
        id="sync-reset-passphrase-again"
        label={COPY.repeatNew}
        type="password"
        autoComplete="new-password"
        required
        value={props.again}
        onValue={props.onAgain}
      />
      <Submit busy={props.busy}>{t(COPY.replace)}</Submit>
      <CancelButton busy={props.busy} onCancel={props.onCancel} />
    </form>
  );
}
