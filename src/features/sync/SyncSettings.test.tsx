import { IDBFactory } from 'fake-indexeddb';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FAKE_CODE } from './syncServer.fake';
import { SyncAccountError, type VaultStatus } from './syncAccount';
import { SyncSettings } from './SyncSettings';
import type { SyncState } from './syncEngine';
import { clearSyncIdentity, loadSyncKey } from './syncKeyStore';
import {
  cardStatus,
  EMAIL,
  enterCode,
  fakeAccount,
  makeEngine,
  PASS,
  realSetup,
  renderWithSync,
  withVault,
} from './syncSettings.testUtils';

describe('SyncSettings: turning sync on', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  afterEach(async () => {
    vi.useRealTimers();
    await clearSyncIdentity();
  });

  it('renders nothing when sync is not configured', () => {
    const { container } = render(<SyncSettings />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the honest note in both languages while sync is off', () => {
    const view = renderWithSync();
    expect(
      screen.getByText(
        'My data is encrypted on this phone before it leaves it. ' +
          'If I forget the passphrase, I can reset the cloud copy from a device that still has my data.',
      ),
    ).toBeInTheDocument();
    view.unmount();
    renderWithSync({ lang: 'ar' });
    expect(
      screen.getByText(
        'بياناتي تُشفَّر على هذا الهاتف قبل أن تغادره. ' +
          'إذا نسيت عبارة المرور أستطيع إعادة ضبط النسخة السحابية من جهاز ما زال يحتوي بياناتي.',
      ),
    ).toBeInTheDocument();
  });

  it('runs the sign-in and create steps in Arabic', async () => {
    const user = userEvent.setup();
    renderWithSync({ lang: 'ar' });
    expect(screen.getByRole('heading', { name: 'المزامنة' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'تفعيل المزامنة' }));
    await user.type(screen.getByLabelText('البريد الإلكتروني'), EMAIL);
    await user.click(screen.getByRole('button', { name: 'إرسال رمز' }));
    expect(cardStatus()).toHaveTextContent('أرسلتُ رمزًا إلى بريدي الإلكتروني.');
    expect(screen.getByText('أدخل الرمز الذي وصل إلى بريدي الإلكتروني.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('رمز البريد الإلكتروني'), FAKE_CODE);
    await user.click(screen.getByRole('button', { name: 'التحقق من الرمز' }));
    expect(await screen.findByLabelText('عبارة المرور')).toBeInTheDocument();
    expect(screen.getByText(/أنشئ عبارة مرور من ١٠ أحرف على الأقل/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('عبارة المرور'), 'قصير');
    expect(screen.getByText('قصيرة: أحتاج إلى ١٠ أحرف على الأقل.')).toBeInTheDocument();
    expect(screen.getByLabelText('أكرر عبارة المرور')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إنشاء النسخة المشفّرة' })).toBeInTheDocument();
  });

  it('signs in with an email code and creates a passphrase-protected vault', async () => {
    const user = userEvent.setup();
    const setup = realSetup();
    renderWithSync(setup);

    await enterCode(user);
    await user.type(await screen.findByLabelText('Passphrase'), 'short');
    await user.type(screen.getByLabelText('Repeat passphrase'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create encrypted copy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('at least 10 characters');

    await user.clear(screen.getByLabelText('Passphrase'));
    await user.clear(screen.getByLabelText('Repeat passphrase'));
    await user.type(screen.getByLabelText('Passphrase'), PASS);
    await user.type(screen.getByLabelText('Repeat passphrase'), 'different phrase');
    await user.click(screen.getByRole('button', { name: 'Create encrypted copy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('do not match');

    await user.clear(screen.getByLabelText('Repeat passphrase'));
    await user.type(screen.getByLabelText('Repeat passphrase'), PASS);
    await user.click(screen.getByRole('button', { name: 'Create encrypted copy' }));
    expect(await screen.findByText(EMAIL)).toBeInTheDocument();
    expect(cardStatus()).toHaveTextContent('I created an encrypted copy');
    expect(setup.server.vault()).not.toBeNull();
    expect(screen.queryByLabelText('Passphrase')).not.toBeInTheDocument();
  });

  it('gives a live text strength hint while I choose a passphrase', async () => {
    const user = userEvent.setup();
    renderWithSync();
    await enterCode(user);
    const field = await screen.findByLabelText('Passphrase');
    await user.type(field, 'short');
    expect(screen.getByText('Too short: I need at least 10 characters.')).toHaveAttribute('role', 'status');
    await user.clear(field);
    await user.type(field, 'abcdefghijkl');
    expect(screen.getByText(/^Acceptable\./)).toHaveAttribute('role', 'status');
    await user.clear(field);
    await user.type(field, 'correct horse 42');
    expect(screen.getByText('Strong.')).toHaveAttribute('role', 'status');
  });

  it('keeps me on the code step after a wrong code', async () => {
    const user = userEvent.setup();
    renderWithSync(realSetup());
    await enterCode(user, EMAIL, '000000');
    expect(await screen.findByRole('alert')).toHaveTextContent('That code is not right or has expired.');
    expect(screen.getByLabelText('Email code')).toHaveValue('');
    expect(screen.queryByLabelText('Passphrase')).not.toBeInTheDocument();
  });

  it('keeps an accepted account on a failed vault lookup and retries without another code', async () => {
    const user = userEvent.setup();
    const account = fakeAccount();
    account.verifyCode.mockResolvedValue({ email: EMAIL, vault: 'unknown' });
    renderWithSync({ account });

    await enterCode(user);
    expect(screen.getByText('I signed in, but could not check the cloud copy.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Turn off sync on this device' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Check again' }));
    expect(await screen.findByLabelText('Passphrase')).toBeInTheDocument();
    expect(account.verifyCode).toHaveBeenCalledTimes(1);
    expect(account.vaultStatus).toHaveBeenCalledTimes(1);
  });

  it('signs out when I cancel the failed vault lookup', async () => {
    const user = userEvent.setup();
    const account = fakeAccount();
    account.verifyCode.mockResolvedValue({ email: EMAIL, vault: 'unknown' });
    renderWithSync({ account });
    await enterCode(user);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(account.signOut).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'Turn on sync' })).toBeInTheDocument();
  });

  it.each<['damaged' | 'newerVersion', string]>([
    ['damaged', 'The cloud copy is damaged or cannot be read. My data on this device has not changed.'],
    ['newerVersion', 'My other device runs a newer version of the app. I update the app on this device'],
  ])('explains a %s cloud copy when unlocking fails', async (kind, text) => {
    const user = userEvent.setup();
    const account = fakeAccount();
    account.verifyCode.mockResolvedValue({ email: EMAIL, vault: 'exists' });
    account.unlockVault.mockRejectedValue(new SyncAccountError(kind));
    renderWithSync({ account });
    await enterCode(user);
    await user.type(await screen.findByLabelText('Passphrase'), PASS);
    await user.click(screen.getByRole('button', { name: 'Unlock copy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
    expect(screen.getByLabelText('Passphrase')).toHaveValue('');
  });

  it('allows resending an email code after the cooldown', async () => {
    vi.useFakeTimers();
    const account = fakeAccount();
    renderWithSync({ account });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Turn on sync' }));
    });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: EMAIL } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Send a code' }));
    });

    const resend = screen.getByRole('button', { name: 'Resend in 60 seconds' });
    expect(resend).toBeDisabled();
    expect(account.requestCode).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Resend code' }));
    });
    expect(account.requestCode).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Resend in 60 seconds' })).toBeDisabled();
  });

  it('sets up another account over a leftover key even when a sync runs right after the sign-in', async () => {
    const user = userEvent.setup();
    const setup = realSetup();
    await withVault(setup);
    // The session of account A ended; its key stayed on the device, so the card is off.
    await setup.server.signOut();
    await setup.engine.refresh();
    const verify = setup.server.verifyCode.bind(setup.server);
    setup.server.verifyCode = async (email, code) => {
      const session = await verify(email, code);
      // A foreground or online trigger lands between the sign-in and the next step.
      await setup.engine.syncNow();
      return session;
    };
    renderWithSync(setup);

    await enterCode(user, 'other@example.com');
    await user.type(await screen.findByLabelText('Passphrase'), PASS);
    await user.type(screen.getByLabelText('Repeat passphrase'), PASS);
    await user.click(screen.getByRole('button', { name: 'Create encrypted copy' }));
    expect(await screen.findByText('other@example.com')).toBeInTheDocument();
    const session = await setup.server.session();
    expect(session).toMatchObject({ email: 'other@example.com' });
    expect((await loadSyncKey())!.userId).toBe(session!.userId);
    expect(setup.engine.getState()).toMatchObject({ status: 'idle', email: 'other@example.com' });
    expect(setup.server.vault()).not.toBeNull();
  });

  it('lets an existing account retry a wrong passphrase', async () => {
    const user = userEvent.setup();
    const setup = realSetup();
    await withVault(setup);
    await setup.account.signOut();
    renderWithSync(setup);

    await enterCode(user);
    expect(await screen.findByLabelText('Passphrase')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Passphrase'), 'wrong passphrase');
    await user.click(screen.getByRole('button', { name: 'Unlock copy' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('not right');
    await user.type(screen.getByLabelText('Passphrase'), PASS);
    await user.click(screen.getByRole('button', { name: 'Unlock copy' }));
    expect(await screen.findByText(EMAIL)).toBeInTheDocument();
  });

  it('routes to unlocking when a cloud copy appeared meanwhile and keeps the reason on screen', async () => {
    const user = userEvent.setup();
    const account = fakeAccount();
    account.createVault.mockRejectedValue(new SyncAccountError('vaultExists'));
    renderWithSync({ account });
    await enterCode(user);
    await user.type(await screen.findByLabelText('Passphrase'), PASS);
    await user.type(screen.getByLabelText('Repeat passphrase'), PASS);
    await user.click(screen.getByRole('button', { name: 'Create encrypted copy' }));
    expect(await screen.findByRole('button', { name: 'Unlock copy' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A cloud copy already exists. I unlock it with its passphrase.',
    );
    expect(screen.getByLabelText('Passphrase')).toHaveValue('');
  });

  it.each<[string, VaultStatus, string]>([
    ['create', 'none', 'Create encrypted copy'],
    ['unlock', 'exists', 'Unlock copy'],
  ])('signs out when I cancel the %s step during set-up', async (_name, vault, submit) => {
    const user = userEvent.setup();
    const account = fakeAccount();
    account.verifyCode.mockResolvedValue({ email: EMAIL, vault });
    renderWithSync({ account });
    await enterCode(user);
    await user.type(await screen.findByLabelText('Passphrase'), PASS);
    expect(screen.getByRole('button', { name: submit })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(account.signOut).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: 'Turn on sync' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Passphrase')).not.toBeInTheDocument();
  });

  it('keeps the set-up step open when sign-out cannot clear the local session', async () => {
    const user = userEvent.setup();
    const account = fakeAccount();
    account.verifyCode.mockResolvedValue({ email: EMAIL, vault: 'none' });
    account.signOut.mockRejectedValue(new SyncAccountError('unknown'));
    renderWithSync({ account });
    await enterCode(user);
    await screen.findByLabelText('Passphrase');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByLabelText('Passphrase')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Turn on sync' })).not.toBeInTheDocument();
  });

  it('disables Cancel while a request is in flight', async () => {
    const user = userEvent.setup();
    const account = fakeAccount();
    let finish!: () => void;
    account.createVault.mockReturnValue(new Promise<undefined>((resolve) => (finish = () => resolve(undefined))));
    renderWithSync({ account });
    await enterCode(user);
    await user.type(await screen.findByLabelText('Passphrase'), PASS);
    await user.type(screen.getByLabelText('Repeat passphrase'), PASS);
    await user.click(screen.getByRole('button', { name: 'Create encrypted copy' }));
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    await act(async () => finish());
    expect(account.signOut).not.toHaveBeenCalled();
  });

  it.each<[SyncState, string]>([
    [{ status: 'attention', issue: 'tooLarge', email: EMAIL }, 'exceeds the size limit'],
    [{ status: 'offline', email: EMAIL }, 'Offline. I will retry when I am online.'],
    [{ status: 'attention', issue: 'keyChanged', email: EMAIL }, 'The passphrase changed on another device.'],
  ])('shows the live state %j after unlocking, not the confirmation', async (final, text) => {
    const user = userEvent.setup();
    const { engine, publish } = makeEngine();
    const account = fakeAccount();
    account.verifyCode.mockResolvedValue({ email: EMAIL, vault: 'exists' });
    account.unlockVault.mockImplementation(async () => {
      act(() => publish(final));
      return true;
    });
    renderWithSync({ account, engine });
    await enterCode(user);
    await user.type(await screen.findByLabelText('Passphrase'), PASS);
    await user.click(screen.getByRole('button', { name: 'Unlock copy' }));
    await waitFor(() => expect(cardStatus()).toHaveTextContent(text));
    expect(screen.queryByText(/I unlocked the copy/)).not.toBeInTheDocument();
  });

  it('shows the confirmation only until the state changes', async () => {
    const user = userEvent.setup();
    const { engine, publish } = makeEngine();
    const account = fakeAccount();
    account.verifyCode.mockResolvedValue({ email: EMAIL, vault: 'exists' });
    account.unlockVault.mockImplementation(async () => {
      act(() => publish({ status: 'idle', email: EMAIL }));
      return true;
    });
    renderWithSync({ account, engine });
    await enterCode(user);
    await user.type(await screen.findByLabelText('Passphrase'), PASS);
    await user.click(screen.getByRole('button', { name: 'Unlock copy' }));
    expect(await screen.findByText('I unlocked the copy and started syncing.')).toBeInTheDocument();
    expect(cardStatus()).toHaveTextContent('Sync is on.');
    act(() => publish({ status: 'offline', email: EMAIL }));
    expect(cardStatus()).toHaveTextContent('Offline.');
    expect(screen.queryByText('I unlocked the copy and started syncing.')).not.toBeInTheDocument();
  });
});
