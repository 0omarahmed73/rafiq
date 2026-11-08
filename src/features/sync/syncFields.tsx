// Small building blocks shared by the Sync card steps: a labelled field, the strength hint and the step buttons.
import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import type { Bi } from '../../i18n';
import { useI18n } from '../../i18n/LanguageProvider';
import { field, primary, secondary } from '../lock/lockUi';
import { MIN_PASSPHRASE_LENGTH } from './syncAccount';
import type { SyncState } from './syncEngine';
import { COPY, passphraseStrength, STRENGTH } from './syncCopy';

export const intro = 'text-sm leading-7 text-muted';

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'className'> & {
  id: string;
  label: Bi;
  value: string;
  onValue: (value: string) => void;
};

export function Field({ id, label, value, onValue, ...input }: FieldProps) {
  const { t } = useI18n();
  return (
    <>
      <label htmlFor={id} className="text-sm font-semibold">
        {t(label)}
      </label>
      <input id={id} className={field} value={value} onChange={(event) => onValue(event.target.value)} {...input} />
    </>
  );
}

/** A live, text-only hint about the new passphrase; always rendered so each change is announced. */
export function StrengthHint({ passphrase }: { passphrase: string }) {
  const { t } = useI18n();
  const strength = passphraseStrength(passphrase);
  return (
    <p role="status" aria-live="polite" className="min-h-6 text-sm font-semibold text-ink">
      {strength === 'empty' ? null : t(STRENGTH[strength], { n: MIN_PASSPHRASE_LENGTH })}
    </p>
  );
}

export function Submit({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <button type="submit" className={primary} disabled={busy}>
      {children}
    </button>
  );
}

/** A secondary action; disabled while a request is in flight so a late result cannot move the card elsewhere. */
export function Secondary({ busy, onClick, children }: { busy: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={secondary} disabled={busy} onClick={onClick}>
      {children}
    </button>
  );
}

export function CancelButton({
  busy,
  onCancel,
  text = COPY.cancel,
}: {
  busy: boolean;
  onCancel: () => void;
  text?: Bi;
}) {
  const { t } = useI18n();
  return (
    <Secondary busy={busy} onClick={onCancel}>
      {t(text)}
    </Secondary>
  );
}

/** The card's live region: always rendered so every change is announced; the live sync state comes first. */
export function CardStatus({ live, notice }: { live: string | null; notice: string | null }) {
  return (
    <div id="sync-status" role="status" aria-live="polite" className="min-h-6 text-sm font-semibold text-ink">
      {live && <p>{live}</p>}
      {notice && <p>{notice}</p>}
    </div>
  );
}

/**
 * A confirmation that lasts only until the live state changes after it was shown, so it can never hide what sync is
 * doing now. It is stamped with the state of its first render, so a state change batched into that same render (the
 * engine publishing just before the request resolved) does not wipe it.
 */
export function useNotice(state: SyncState): [string | null, (text: string | null) => void] {
  const [notice, setNotice] = useState<{ text: string; seen?: SyncState } | null>(null);
  useEffect(() => {
    if (notice && !notice.seen) setNotice({ text: notice.text, seen: state });
    else if (notice?.seen && notice.seen !== state) setNotice(null);
  }, [notice, state]);
  const shown = notice && (!notice.seen || notice.seen === state) ? notice.text : null;
  return [shown, (text) => setNotice(text === null ? null : { text })];
}
