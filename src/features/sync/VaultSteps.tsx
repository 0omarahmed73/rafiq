// The vault steps of the Sync card: create a passphrase-protected copy, or unlock an existing one.
import type { FormEvent } from 'react';
import { useI18n } from '../../i18n/LanguageProvider';
import { MIN_PASSPHRASE_LENGTH } from './syncAccount';
import { COPY } from './syncCopy';
import { CancelButton, Field, intro, StrengthHint, Submit } from './syncFields';

interface PassphraseProps {
  passphrase: string;
  onPassphrase: (value: string) => void;
  busy: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}

function useSubmit(onSubmit: () => void) {
  return (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
}

export function CreateStep(props: PassphraseProps & { again: string; onAgain: (value: string) => void }) {
  const { t } = useI18n();
  const submit = useSubmit(props.onSubmit);
  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <p className={intro}>{t(COPY.createIntro, { n: MIN_PASSPHRASE_LENGTH })}</p>
      <Field
        id="sync-new-passphrase"
        label={COPY.passphrase}
        type="password"
        autoComplete="new-password"
        required
        value={props.passphrase}
        onValue={props.onPassphrase}
      />
      <StrengthHint passphrase={props.passphrase} />
      <Field
        id="sync-new-passphrase-again"
        label={COPY.repeat}
        type="password"
        autoComplete="new-password"
        required
        value={props.again}
        onValue={props.onAgain}
      />
      <Submit busy={props.busy}>{t(COPY.create)}</Submit>
      <CancelButton busy={props.busy} onCancel={props.onCancel} />
    </form>
  );
}

export function UnlockStep(props: PassphraseProps) {
  const { t } = useI18n();
  const submit = useSubmit(props.onSubmit);
  return (
    <form className="flex flex-col gap-3" onSubmit={submit}>
      <p className={intro}>{t(COPY.unlockIntro)}</p>
      <Field
        id="sync-unlock-passphrase"
        label={COPY.passphrase}
        type="password"
        autoComplete="current-password"
        required
        value={props.passphrase}
        onValue={props.onPassphrase}
      />
      <Submit busy={props.busy}>{t(COPY.unlock)}</Submit>
      <CancelButton busy={props.busy} onCancel={props.onCancel} />
    </form>
  );
}
