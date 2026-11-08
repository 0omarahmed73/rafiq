import { IDBFactory } from 'fake-indexeddb';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FAKE_CODE } from './syncServer.fake';
import type { SyncIssue, SyncState } from './syncEngine';
import { clearSyncIdentity, loadSyncKey, loadSyncMeta } from './syncKeyStore';
import {
  cardStatus,
  EMAIL,
  fakeAccount,
  makeEngine,
  PASS,
  realSetup,
  renderWithSync,
  withVault,
} from './syncSettings.testUtils';

function onCard(state: SyncState, account = fakeAccount()) {
  const scripted = makeEngine(state);
  const view = renderWithSync({ state, account, engine: scripted.engine });
  return { ...view, account, engine: scripted.engine, publish: scripted.publish };
}

describe('SyncSettings: the on panel', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  afterEach(async () => {
    await clearSyncIdentity();
  });

  it('shows the signed-in email and the live status for idle, syncing, offline and attention', () => {
    const { publish } = onCard({ status: 'idle', email: EMAIL, lastSyncedAt: '2026-11-08T09:30:00.000Z' });
    expect(screen.getByText(EMAIL)).toHaveClass('break-all');
    expect(screen.getByText(/Last synced:/)).toBeInTheDocument();
    expect(cardStatus()).toHaveTextContent('Sync is on.');
    expect(cardStatus()).toHaveAttribute('role', 'status');
    act(() => publish({ status: 'syncing', email: EMAIL }));
    expect(cardStatus()).toHaveTextContent('Syncing now…');
    act(() => publish({ status: 'offline', email: EMAIL }));
    expect(cardStatus()).toHaveTextContent('Offline. I will retry when I am online.');
    act(() => publish({ status: 'attention', issue: 'busy', email: EMAIL }));
    expect(cardStatus()).toHaveTextContent('Sync needs my attention:');
  });

  it('shows the on panel in Arabic', () => {
    renderWithSync({ lang: 'ar', state: { status: 'idle', email: EMAIL } });
    expect(cardStatus()).toHaveTextContent('المزامنة مفعّلة.');
    expect(screen.getByRole('button', { name: 'مزامنة الآن' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إعادة ضبط النسخة السحابية' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إيقاف المزامنة على هذا الجهاز' })).toBeInTheDocument();
  });

  it.each<[SyncIssue, string]>([
    ['tooLarge', 'This copy is larger than the service allows. My data stays on this device.'],
    ['auth', 'My sign-in expired. I sign in again to keep syncing.'],
    ['busy', 'The copy changed repeatedly during sync. I will try again.'],
    ['unknown', 'That did not work. I can try again.'],
    ['newerVersion', 'My other device runs a newer version of the app. I update the app on this device'],
    ['damaged', 'The cloud copy could not be opened or validated.'],
  ])('explains the %s issue', (issue, text) => {
    onCard({ status: 'attention', issue, email: EMAIL });
    expect(cardStatus()).toHaveTextContent(text);
  });

  it('says in Arabic that the other device runs a newer version', () => {
    renderWithSync({ lang: 'ar', state: { status: 'attention', issue: 'newerVersion', email: EMAIL } });
    expect(cardStatus()).toHaveTextContent('يعمل جهازي الآخر بنسخة أحدث من التطبيق.');
  });

  it('retries a damaged copy and offers the reset', async () => {
    const user = userEvent.setup();
    const { engine, publish } = onCard({ status: 'attention', issue: 'damaged', email: EMAIL });
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(engine.syncNow).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Reset cloud copy' }));
    expect(await screen.findByText('Records on this device: 1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    act(() => publish({ status: 'attention', issue: 'newerVersion', email: EMAIL }));
    expect(cardStatus()).toHaveTextContent('newer version of the app');
  });

  it('syncs now from the on card and never leaves the button stuck', async () => {
    const user = userEvent.setup();
    const { engine } = onCard({ status: 'idle', email: EMAIL });
    engine.syncNow.mockRejectedValueOnce(new Error('boom'));
    await user.click(screen.getByRole('button', { name: 'Sync now' }));
    expect(engine.syncNow).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sync now' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: 'Sync now' }));
    expect(engine.syncNow).toHaveBeenCalledTimes(2);
  });

  it.each<SyncIssue>(['wrongPassphrase', 'keyChanged'])(
    'asks for the passphrase on %s and Cancel returns to the on panel',
    async (issue) => {
      const user = userEvent.setup();
      const { account } = onCard({ status: 'attention', issue, email: EMAIL });
      await user.click(screen.getByRole('button', { name: 'Enter passphrase' }));
      await user.type(screen.getByLabelText('Passphrase'), PASS);
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.getByRole('button', { name: 'Sync now' })).toBeInTheDocument();
      expect(screen.queryByLabelText('Passphrase')).not.toBeInTheDocument();
      expect(account.signOut).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Enter passphrase' }));
      expect(screen.getByLabelText('Passphrase')).toHaveValue('');
      await user.type(screen.getByLabelText('Passphrase'), PASS);
      await user.click(screen.getByRole('button', { name: 'Unlock copy' }));
      expect(account.unlockVault).toHaveBeenCalledWith(PASS);
      expect(await screen.findByRole('button', { name: 'Sync now' })).toBeInTheDocument();
    },
  );

  it('signs in again after the session expired without asking for the passphrase', async () => {
    const user = userEvent.setup();
    const { account, engine } = onCard({ status: 'attention', issue: 'auth', email: EMAIL });
    expect(screen.queryByRole('button', { name: 'Reset cloud copy' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Turn off sync on this device' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Sign in again' }));
    expect(screen.getByLabelText('Email address')).toHaveValue(EMAIL);
    expect(screen.getByLabelText('Email address')).toHaveAttribute('readonly');
    await user.click(screen.getByRole('button', { name: 'Send a code' }));
    expect(account.requestCode).toHaveBeenCalledWith(EMAIL);
    await user.type(screen.getByLabelText('Email code'), FAKE_CODE);
    await user.click(screen.getByRole('button', { name: 'Verify code' }));
    expect(await screen.findByRole('button', { name: 'Sync now' })).toBeInTheDocument();
    expect(engine.syncNow).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Passphrase')).not.toBeInTheDocument();
    expect(account.unlockVault).not.toHaveBeenCalled();
    expect(account.signOut).not.toHaveBeenCalled();
  });

  it('signs out and keeps no key when signing in again reaches another account', async () => {
    const user = userEvent.setup();
    const { account, engine } = onCard({ status: 'attention', issue: 'auth', email: EMAIL });
    account.verifyCode.mockResolvedValue({ email: 'other@example.com', vault: 'none' });
    await user.click(screen.getByRole('button', { name: 'Sign in again' }));
    await user.click(screen.getByRole('button', { name: 'Send a code' }));
    await user.type(screen.getByLabelText('Email code'), FAKE_CODE);
    await user.click(screen.getByRole('button', { name: 'Verify code' }));
    expect(await screen.findByRole('button', { name: 'Turn on sync' })).toBeInTheDocument();
    expect(account.signOut).toHaveBeenCalledTimes(1);
    expect(engine.syncNow).not.toHaveBeenCalled();
    expect(account.createVault).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('That was a different account');
  });

  it('Cancel on the sign-in-again step returns to the on panel', async () => {
    const user = userEvent.setup();
    const { account } = onCard({ status: 'attention', issue: 'auth', email: EMAIL });
    await user.click(screen.getByRole('button', { name: 'Sign in again' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Sign in again' })).toBeInTheDocument();
    expect(account.signOut).not.toHaveBeenCalled();
  });

  it('resets a non-empty device after a confirmation that names the record count', async () => {
    const user = userEvent.setup();
    const account = fakeAccount();
    account.localRecordCount.mockResolvedValue(3);
    onCard({ status: 'idle', email: EMAIL }, account);
    await user.click(screen.getByRole('button', { name: 'Reset cloud copy' }));
    expect(await screen.findByText('I will upload the 3 records on this device.')).toBeInTheDocument();
    expect(
      screen.getByText(/delete the cloud copy and upload this device’s data under a new passphrase/),
    ).toBeVisible();
    expect(screen.queryByLabelText('Type “ERASE” to confirm')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue and enter a new passphrase' }));
    await user.type(screen.getByLabelText('New passphrase'), 'short');
    expect(screen.getByText('Too short: I need at least 10 characters.')).toHaveAttribute('role', 'status');
    await user.clear(screen.getByLabelText('New passphrase'));
    await user.type(screen.getByLabelText('New passphrase'), PASS);
    await user.type(screen.getByLabelText('Repeat new passphrase'), PASS);
    await user.click(screen.getByRole('button', { name: 'Replace cloud copy' }));
    await waitFor(() => expect(account.resetVault).toHaveBeenCalledWith(PASS, { allowEmpty: false }));
    expect(await screen.findByRole('button', { name: 'Sync now' })).toBeInTheDocument();
  });

  it('requires typed confirmation before an empty local copy can replace the cloud vault', async () => {
    const user = userEvent.setup();
    const setup = realSetup();
    await withVault(setup);
    const reset = vi.spyOn(setup.account, 'resetVault');
    renderWithSync(setup);

    await screen.findByText(EMAIL);
    await user.click(screen.getByRole('button', { name: 'Reset cloud copy' }));
    await screen.findByLabelText('Type “ERASE” to confirm');
    const continueButton = screen.getByRole('button', { name: 'Continue and enter a new passphrase' });
    expect(continueButton).toBeDisabled();
    await user.type(screen.getByLabelText('Type “ERASE” to confirm'), 'ERASE');
    await user.click(continueButton);
    await user.type(screen.getByLabelText('New passphrase'), PASS);
    await user.type(screen.getByLabelText('Repeat new passphrase'), PASS);
    await user.click(screen.getByRole('button', { name: 'Replace cloud copy' }));

    await waitFor(() => expect(reset).toHaveBeenCalledWith(PASS, { allowEmpty: true }));
    await waitFor(() => expect(setup.server.vault()?.version).toBeGreaterThan(1));
  });

  it('names a single record in the singular', async () => {
    const user = userEvent.setup();
    onCard({ status: 'idle', email: EMAIL });
    await user.click(screen.getByRole('button', { name: 'Reset cloud copy' }));
    expect(await screen.findByText('I will upload the one record on this device.')).toBeInTheDocument();
  });

  it('keeps the turned-off notice when the off state arrives in the same update', async () => {
    const user = userEvent.setup();
    const account = fakeAccount();
    const { publish } = onCard({ status: 'idle', email: EMAIL }, account);
    // The state change lands in the same React update as the notice (as the real refresh can).
    account.signOut.mockImplementation(() => {
      queueMicrotask(() => publish({ status: 'off' }));
      return Promise.resolve(undefined);
    });
    await user.click(screen.getByRole('button', { name: 'Turn off sync on this device' }));
    // fireEvent: the continuation after signOut runs outside act, so React batches it with the state change.
    fireEvent.click(screen.getByRole('button', { name: 'Confirm turning off' }));
    expect(await screen.findByRole('button', { name: 'Turn on sync' })).toBeInTheDocument();
    await act(async () => undefined);
    expect(cardStatus()).toHaveTextContent('I turned off sync on this device. My local data stays here.');
  });

  it.each([
    ['Turn off sync on this device', 'Confirm turning off'],
    ['Reset cloud copy', 'Continue and enter a new passphrase'],
  ])('returns to the off panel when sync goes off elsewhere after %s', async (open, marker) => {
    const user = userEvent.setup();
    const { publish } = onCard({ status: 'idle', email: EMAIL });
    await user.click(screen.getByRole('button', { name: open }));
    expect(await screen.findByRole('button', { name: marker })).toBeInTheDocument();
    act(() => publish({ status: 'off' }));
    expect(screen.getByRole('button', { name: 'Turn on sync' })).toBeInTheDocument();
  });

  it('returns to the off panel when sync goes off elsewhere on the new passphrase step', async () => {
    const user = userEvent.setup();
    const { publish } = onCard({ status: 'idle', email: EMAIL });
    await user.click(screen.getByRole('button', { name: 'Reset cloud copy' }));
    await user.click(await screen.findByRole('button', { name: 'Continue and enter a new passphrase' }));
    await user.type(screen.getByLabelText('New passphrase'), PASS);
    act(() => publish({ status: 'off' }));
    expect(screen.getByRole('button', { name: 'Turn on sync' })).toBeInTheDocument();
    expect(screen.queryByLabelText('New passphrase')).not.toBeInTheDocument();
  });

  it('turns sync off only after a confirmation, clearing the key, meta and session but not local data', async () => {
    const user = userEvent.setup();
    const setup = realSetup();
    await withVault(setup);
    const signOut = vi.spyOn(setup.account, 'signOut');
    const { repo } = renderWithSync(setup);
    await setup.repo.saveSettings({ id: 'settings', theme: 'dark', displayName: 'keep me' });
    await screen.findByText(EMAIL);

    await user.click(screen.getByRole('button', { name: 'Turn off sync on this device' }));
    expect(signOut).not.toHaveBeenCalled();
    expect(screen.getByText(/I will need the passphrase again to turn sync back on/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('button', { name: 'Sync now' })).toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Turn off sync on this device' }));
    await user.click(screen.getByRole('button', { name: 'Confirm turning off' }));
    expect(await screen.findByRole('button', { name: 'Turn on sync' })).toBeInTheDocument();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(cardStatus()).toHaveTextContent('local data stays here');
    expect(await loadSyncKey()).toBeNull();
    expect(await loadSyncMeta()).toEqual({ version: 0 });
    expect(await setup.server.session()).toBeNull();
    expect(await repo.getSettings()).toMatchObject({ displayName: 'keep me' });
    expect(setup.server.shared.vaults.size).toBe(1);
  });
});
