// The Sync card while sync is on: the account, the last sync and the actions that fit the current state.
import { useI18n } from '../../i18n/LanguageProvider';
import { dayKey, formatFullDate, formatTime } from '../../lib/dates';
import { primary } from '../lock/lockUi';
import type { SyncState } from './syncEngine';
import { COPY } from './syncCopy';
import { intro, Secondary } from './syncFields';

export function OnPanel(props: {
  state: SyncState;
  email: string;
  busy: boolean;
  onSyncNow: () => void;
  onEnterPassphrase: () => void;
  onSignInAgain: () => void;
  onReset: () => void;
  onTurnOff: () => void;
}) {
  const { t } = useI18n();
  const { state, busy } = props;
  const issue = state.status === 'attention' ? state.issue : undefined;
  return (
    <>
      <p className="text-sm break-all text-muted" dir="ltr">
        {props.email}
      </p>
      {state.lastSyncedAt && (
        <p className="text-sm text-muted">
          {t(COPY.lastSynced)} {formatFullDate(dayKey(new Date(state.lastSyncedAt)))} · {formatTime(state.lastSyncedAt)}
        </p>
      )}
      {(issue === 'wrongPassphrase' || issue === 'keyChanged') && (
        <Secondary busy={busy} onClick={props.onEnterPassphrase}>
          {t(COPY.enterPassphrase)}
        </Secondary>
      )}
      {issue === 'auth' && (
        <Secondary busy={busy} onClick={props.onSignInAgain}>
          {t(COPY.signInAgain)}
        </Secondary>
      )}
      {issue === 'damaged' && (
        <Secondary busy={busy} onClick={props.onSyncNow}>
          {t(COPY.tryAgain)}
        </Secondary>
      )}
      <button type="button" className={primary} disabled={busy} onClick={props.onSyncNow}>
        {t(COPY.syncNow)}
      </button>
      {/* Without a session the reset cannot reach the server: signing in again is the remedy. */}
      {issue !== 'auth' && (
        <Secondary busy={busy} onClick={props.onReset}>
          {t(COPY.reset)}
        </Secondary>
      )}
      <Secondary busy={busy} onClick={props.onTurnOff}>
        {t(COPY.turnOff)}
      </Secondary>
    </>
  );
}

export function TurnOffConfirm(props: { busy: boolean; onConfirm: () => void; onBack: () => void }) {
  const { t } = useI18n();
  return (
    <>
      <p className={intro}>{t(COPY.turnOffConfirm)}</p>
      <button type="button" className={primary} disabled={props.busy} onClick={props.onConfirm}>
        {t(COPY.confirmTurnOff)}
      </button>
      <Secondary busy={props.busy} onClick={props.onBack}>
        {t(COPY.back)}
      </Secondary>
    </>
  );
}
