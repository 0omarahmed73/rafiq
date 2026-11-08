import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RepoProvider } from '../../db/RepoContext';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { setActiveLanguage } from '../../i18n';
import { isBiometricAvailable, verifyBiometric } from '../../platform/biometric';
import { LockProvider, type LockApi } from './LockProvider';
import { LockScreen } from './LockScreen';
import { IDBFactory } from 'fake-indexeddb';
import { readLockDb, writeLockDb } from './lockDb';
import { loadLock, readLock, resetLockStoreForTests, type LockRecord } from './lockStore';
import { hashSecret, normalizeRecoveryCode } from './pin';

vi.mock('../../platform/appState', () => ({
  onForegroundChange: vi.fn(() => () => undefined),
}));
vi.mock('../../platform/biometric', () => ({
  isBiometricAvailable: vi.fn(async () => false),
  verifyBiometric: vi.fn(async () => false),
}));

// Lets a test replace one provider call (for example with a rejecting one) while the rest stay real.
const overrides = vi.hoisted(() => ({ api: {} as Record<string, unknown> }));
vi.mock('./LockProvider', async (importOriginal) => {
  const real = await importOriginal<typeof import('./LockProvider')>();
  return { ...real, useLock: (): LockApi => ({ ...real.useLock(), ...overrides.api }) };
});

// The real lock database, wrapped so a test can make a write's outcome unknown.
vi.mock('./lockDb', async (importOriginal) => {
  const real = await importOriginal<typeof import('./lockDb')>();
  return { ...real, readLockDb: vi.fn(real.readLockDb), writeLockDb: vi.fn(real.writeLockDb) };
});
const realDb = await vi.importActual<typeof import('./lockDb')>('./lockDb');

const CODE = 'ABCD-EFGH-JKMN';
const SLOW = { timeout: 5000 };

/** The record in the lock database, read straight from IndexedDB. */
async function stored(): Promise<LockRecord | undefined> {
  return (await readLockDb()).record as LockRecord | undefined;
}

/** A cold start with this record on disk. */
async function storeRecord(over: Partial<LockRecord> = {}): Promise<void> {
  await writeLockDb({
    v: 1,
    pin: await hashSecret('1357', 1000),
    recovery: await hashSecret(normalizeRecoveryCode(CODE), 1000),
    biometric: false,
    autoLockMs: 60000,
    failures: 0,
    blockedUntil: 0,
    ...over,
  });
  resetLockStoreForTests();
  await loadLock();
}

function renderScreen(repo: Repo = createMemoryRepo()) {
  return render(
    <RepoProvider repo={repo}>
      <LockProvider screen={LockScreen}>
        <p>app content</p>
      </LockProvider>
    </RepoProvider>,
  );
}

async function pressDigits(user: ReturnType<typeof userEvent.setup>, pin: string) {
  for (const d of pin) await user.click(screen.getByRole('button', { name: d }));
}

const unlockButton = (name = 'فتح') => screen.getByRole('button', { name });

beforeEach(() => {
  localStorage.clear();
  globalThis.indexedDB = new IDBFactory();
  resetLockStoreForTests();
  overrides.api = {};
  vi.mocked(isBiometricAvailable).mockReset().mockResolvedValue(false);
  vi.mocked(verifyBiometric).mockReset().mockResolvedValue(false);
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-11-07T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  for (const fn of [readLockDb, writeLockDb]) vi.mocked(fn).mockRestore();
});

describe('LockScreen', () => {
  it('shows the app name and a number pad with Arabic-Indic digits, and no user data', async () => {
    const repo = createMemoryRepo();
    await repo.saveSettings({
      ...(await repo.getSettings()),
      displayName: 'Mona',
      therapistName: 'Dr Salma',
    });
    await storeRecord();
    const { container } = renderScreen(repo);

    expect(screen.getByRole('heading', { name: 'رفيق' })).toBeInTheDocument();
    for (let d = 0; d <= 9; d += 1) {
      expect(screen.getByRole('button', { name: String(d) })).toHaveTextContent('٠١٢٣٤٥٦٧٨٩'[d]);
    }
    expect(screen.getByLabelText('الرمز')).toHaveAttribute('inputmode', 'none');
    expect(screen.getByRole('button', { name: 'نسيت الرمز؟' })).toBeInTheDocument();
    expect(container).not.toHaveTextContent('Mona');
    expect(container).not.toHaveTextContent('Dr Salma');
    expect(screen.queryByText('app content')).toBeNull();
  });

  it('shows plain digits and English text in English', async () => {
    setActiveLanguage('en');
    await storeRecord();
    renderScreen();
    expect(screen.getByRole('heading', { name: 'Rafiq' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7' })).toHaveTextContent('7');
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeInTheDocument();
  });

  it('opens the app with the right PIN entered on the pad and Unlock pressed', async () => {
    const user = userEvent.setup();
    await storeRecord();
    renderScreen();
    await pressDigits(user, '1357');
    expect(screen.queryByText('app content')).toBeNull();
    await user.click(unlockButton());
    expect(await screen.findByText('app content', undefined, SLOW)).toBeInTheDocument();
  });

  it('deletes the last digit from the pad', async () => {
    const user = userEvent.setup();
    await storeRecord();
    renderScreen();
    await pressDigits(user, '13579');
    await user.click(screen.getByRole('button', { name: 'أحذف آخر رقم' }));
    expect(screen.getByLabelText('الرمز')).toHaveValue('1357');
    await user.click(unlockButton());
    expect(await screen.findByText('app content', undefined, SLOW)).toBeInTheDocument();
  });

  it('opens with Arabic-Indic digits typed on a keyboard', async () => {
    const user = userEvent.setup();
    await storeRecord();
    renderScreen();
    await user.type(screen.getByLabelText('الرمز'), '١٣٥٧');
    expect(screen.getByLabelText('الرمز')).toHaveValue('1357');
    await user.click(unlockButton());
    expect(await screen.findByText('app content', undefined, SLOW)).toBeInTheDocument();
  });

  it('refuses fewer than 4 digits without checking the PIN', async () => {
    const user = userEvent.setup();
    await storeRecord();
    renderScreen();
    const derive = vi.spyOn(crypto.subtle, 'deriveBits');
    await pressDigits(user, '135');
    await user.click(unlockButton());
    expect(screen.getByRole('alert')).toHaveTextContent('أدخل ٤ إلى ٦ أرقام');
    expect(derive).not.toHaveBeenCalled();
    expect((await stored())?.failures).toBe(0);
    expect(screen.queryByText('app content')).toBeNull();
  });

  it('refuses non-digits typed on a keyboard, in English', async () => {
    setActiveLanguage('en');
    const user = userEvent.setup();
    await storeRecord();
    renderScreen();
    const derive = vi.spyOn(crypto.subtle, 'deriveBits');
    await user.type(screen.getByLabelText('PIN'), '13a7');
    await user.click(unlockButton('Unlock'));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter 4 to 6 digits');
    expect(derive).not.toHaveBeenCalled();
    expect((await stored())?.failures).toBe(0);
  });

  it('says a wrong PIN is not right and clears the entry', async () => {
    const user = userEvent.setup();
    await storeRecord();
    renderScreen();
    await pressDigits(user, '0000');
    await user.click(unlockButton());
    expect(await screen.findByText('الرمز غير صحيح', undefined, SLOW)).toBeInTheDocument();
    expect(screen.getByLabelText('الرمز')).toHaveValue('');
    expect((await stored())?.failures).toBe(1);
  });

  it('after the 5th wrong PIN disables Unlock, shows the seconds left and ignores submits', async () => {
    const user = userEvent.setup();
    await storeRecord({ failures: 4 });
    renderScreen();
    await pressDigits(user, '0000');
    await user.click(unlockButton());
    expect(await screen.findByText('الرمز غير صحيح', undefined, SLOW)).toBeInTheDocument();
    expect(unlockButton()).toBeDisabled();
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('يمكنني المحاولة مرة أخرى بعد ٣٠ ثانية');

    act(() => vi.advanceTimersByTime(1000));
    expect(status).toHaveTextContent('٢٩');

    const derive = vi.spyOn(crypto.subtle, 'deriveBits');
    await user.type(screen.getByLabelText('الرمز'), '1357{Enter}');
    expect(derive).not.toHaveBeenCalled();
    expect(screen.queryByText('app content')).toBeNull();
    expect((await stored())?.failures).toBe(5);

    derive.mockRestore();
    act(() => vi.advanceTimersByTime(29000));
    expect(unlockButton()).toBeEnabled();
    expect(status).toBeEmptyDOMElement();
    await user.click(unlockButton());
    expect(await screen.findByText('app content', undefined, SLOW)).toBeInTheDocument();
  });

  it('shows the wait in English', async () => {
    setActiveLanguage('en');
    await storeRecord({ failures: 5, blockedUntil: Date.now() + 30000 });
    renderScreen();
    expect(screen.getByRole('status')).toHaveTextContent('Try again in 30 s');
    expect(screen.getByRole('button', { name: 'Unlock' })).toBeDisabled();
  });

  it('shows where keyboard focus is on the PIN field', async () => {
    const user = userEvent.setup();
    await storeRecord();
    renderScreen();
    const display = screen.getByTestId('pin-display');
    expect(display).toHaveAttribute('data-focused', 'false');
    await user.tab();
    expect(screen.getByLabelText('الرمز')).toHaveFocus();
    expect(display).toHaveAttribute('data-focused', 'true');
    expect(display.className).toContain('data-[focused=true]:ring-2');
    await user.tab();
    expect(display).toHaveAttribute('data-focused', 'false');
  });

  it('returns focus to the PIN field after a wrong PIN and after a blocking one', async () => {
    const user = userEvent.setup();
    await storeRecord({ failures: 3 });
    renderScreen();
    await pressDigits(user, '0000');
    await user.click(unlockButton());
    expect(await screen.findByText('الرمز غير صحيح', undefined, SLOW)).toBeInTheDocument();
    expect(screen.getByLabelText('الرمز')).toHaveFocus();
    // Focus comes back without raising the soft keyboard over the pad.
    expect(screen.getByLabelText('الرمز')).toHaveAttribute('inputmode', 'none');

    await pressDigits(user, '0000');
    await user.click(unlockButton());
    expect(await screen.findByText('الرمز غير صحيح', undefined, SLOW)).toBeInTheDocument();
    expect(unlockButton()).toBeDisabled();
    expect(screen.getByLabelText('الرمز')).toHaveFocus();
  });

  it('shows a calm error and stays usable when the unlock check fails', async () => {
    const user = userEvent.setup();
    overrides.api = { unlock: vi.fn(async () => Promise.reject(new Error('boom'))) };
    await storeRecord();
    renderScreen();
    await pressDigits(user, '1357');
    await user.click(unlockButton());
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر التحقق. يمكنني المحاولة مرة أخرى.');
    expect(unlockButton()).toBeEnabled();
    expect(unlockButton()).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByLabelText('الرمز')).toHaveFocus();
  });

  it('shows a calm error and stays usable when the recovery check fails', async () => {
    const user = userEvent.setup();
    overrides.api = { recover: vi.fn(async () => Promise.reject(new Error('boom'))) };
    await storeRecord();
    renderScreen();
    await user.click(screen.getByRole('button', { name: 'نسيت الرمز؟' }));
    await user.click(screen.getByRole('button', { name: 'لدي رمز الاسترداد' }));
    await user.type(screen.getByLabelText('رمز الاسترداد'), CODE);
    await user.click(screen.getByRole('button', { name: 'أتحقق' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر التحقق. يمكنني المحاولة مرة أخرى.');
    expect(screen.getByRole('button', { name: 'أتحقق' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'أتحقق' })).not.toHaveAttribute('aria-disabled', 'true');
  });

  describe('biometrics', () => {
    it('has no biometric button and never asks when biometrics are off', async () => {
      vi.mocked(isBiometricAvailable).mockResolvedValue(true);
      await storeRecord({ biometric: false });
      renderScreen();
      expect(screen.queryByRole('button', { name: 'استخدم البصمة' })).toBeNull();
      expect(isBiometricAvailable).not.toHaveBeenCalled();
      expect(verifyBiometric).not.toHaveBeenCalled();
    });

    it('has no biometric button when biometrics are not available (web)', async () => {
      await storeRecord({ biometric: true });
      renderScreen();
      await act(async () => {
        await Promise.resolve();
      });
      expect(isBiometricAvailable).toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'استخدم البصمة' })).toBeNull();
      expect(verifyBiometric).not.toHaveBeenCalled();
    });

    it('tries once on open; a cancelled prompt leaves the pad usable and the button works', async () => {
      const user = userEvent.setup();
      vi.mocked(isBiometricAvailable).mockResolvedValue(true);
      await storeRecord({ biometric: true });
      renderScreen();
      const button = await screen.findByRole('button', {
        name: 'استخدم البصمة',
      });
      expect(verifyBiometric).toHaveBeenCalledTimes(1);
      expect(screen.queryByText('app content')).toBeNull();

      await pressDigits(user, '13');
      expect(screen.getByLabelText('الرمز')).toHaveValue('13');

      vi.mocked(verifyBiometric).mockResolvedValueOnce(true);
      await user.click(button);
      expect(verifyBiometric).toHaveBeenCalledTimes(2);
      expect(await screen.findByText('app content')).toBeInTheDocument();
    });

    it('opens the app when the prompt on open succeeds', async () => {
      vi.mocked(isBiometricAvailable).mockResolvedValue(true);
      vi.mocked(verifyBiometric).mockResolvedValue(true);
      await storeRecord({ biometric: true });
      renderScreen();
      expect(await screen.findByText('app content')).toBeInTheDocument();
    });
  });

  describe('forgot the PIN', () => {
    it('offers the recovery code and the no-code way out', async () => {
      const user = userEvent.setup();
      await storeRecord();
      renderScreen();
      await user.click(screen.getByRole('button', { name: 'نسيت الرمز؟' }));
      expect(screen.getByRole('button', { name: 'لدي رمز الاسترداد' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ليس لدي الرمز' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'رجوع' }));
      expect(screen.getByRole('button', { name: 'فتح' })).toBeInTheDocument();
    });

    it('a right code (any case, no dashes) sets a new PIN, shows the new code and opens with data untouched', async () => {
      const user = userEvent.setup();
      const repo = createMemoryRepo();
      await repo.saveSettings({
        ...(await repo.getSettings()),
        displayName: 'Mona',
      });
      const erase = vi.spyOn(repo, 'eraseAll');
      await storeRecord();
      renderScreen(repo);

      await user.click(screen.getByRole('button', { name: 'نسيت الرمز؟' }));
      await user.click(screen.getByRole('button', { name: 'لدي رمز الاسترداد' }));
      // The recovery code is typed, so its field keeps the normal text keyboard.
      expect(screen.getByLabelText('رمز الاسترداد')).not.toHaveAttribute('inputmode');
      await user.type(screen.getByLabelText('رمز الاسترداد'), 'abcdefghjkmn');
      await user.click(screen.getByRole('button', { name: 'أتحقق' }));

      const first = await screen.findByLabelText('الرمز الجديد', undefined, SLOW);
      const again = screen.getByLabelText('أعيد كتابة الرمز الجديد');
      expect(first).toHaveAttribute('inputmode', 'numeric');
      expect(again).toHaveAttribute('inputmode', 'numeric');
      await user.type(first, '٢٤٦٨');
      expect(first).toHaveValue('2468');
      await user.type(again, '2468');
      await user.click(screen.getByRole('button', { name: 'أحفظ الرمز الجديد' }));

      const shown = await screen.findByTestId('new-recovery-code', undefined, SLOW);
      expect(shown.textContent).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(shown.textContent).not.toBe(CODE);
      expect(screen.getByText(/^تم حفظ رمز الدخول الجديد\./)).toBeInTheDocument();
      expect(screen.queryByText('app content')).toBeNull();

      const done = screen.getByRole('button', { name: 'تم' });
      expect(done).toBeDisabled();
      await user.click(screen.getByRole('checkbox', { name: 'حفظت رمز الاسترداد' }));
      expect(done).toBeEnabled();
      await user.click(done);

      expect(await screen.findByText('app content')).toBeInTheDocument();
      expect(erase).not.toHaveBeenCalled();
      expect((await repo.getSettings()).displayName).toBe('Mona');
      expect(await stored()).toMatchObject({ failures: 0, blockedUntil: 0 });
    });

    it('refuses an easy-to-guess or mismatched new PIN', async () => {
      const user = userEvent.setup();
      await storeRecord();
      renderScreen();
      await user.click(screen.getByRole('button', { name: 'نسيت الرمز؟' }));
      await user.click(screen.getByRole('button', { name: 'لدي رمز الاسترداد' }));
      await user.type(screen.getByLabelText('رمز الاسترداد'), CODE);
      await user.click(screen.getByRole('button', { name: 'أتحقق' }));

      const first = await screen.findByLabelText('الرمز الجديد', undefined, SLOW);
      const again = screen.getByLabelText('أعيد كتابة الرمز الجديد');
      const save = screen.getByRole('button', { name: 'أحفظ الرمز الجديد' });

      await user.type(first, '12');
      await user.type(again, '12');
      await user.click(save);
      expect(screen.getByRole('alert')).toHaveTextContent('أدخل ٤ إلى ٦ أرقام');

      await user.clear(first);
      await user.clear(again);
      await user.type(first, '1234');
      await user.type(again, '1234');
      await user.click(save);
      expect(screen.getByRole('alert')).toHaveTextContent('سهل التخمين');

      await user.clear(first);
      await user.clear(again);
      await user.type(first, '2468');
      await user.type(again, '2486');
      await user.click(save);
      expect(screen.getByRole('alert')).toHaveTextContent('الرمزان غير متطابقين');
      expect(screen.queryByTestId('new-recovery-code')).toBeNull();
    });

    it('says the new PIN may have been saved when the save outcome is unknown', async () => {
      const user = userEvent.setup();
      await storeRecord();
      renderScreen();
      await user.click(screen.getByRole('button', { name: 'نسيت الرمز؟' }));
      await user.click(screen.getByRole('button', { name: 'لدي رمز الاسترداد' }));
      await user.type(screen.getByLabelText('رمز الاسترداد'), CODE);
      await user.click(screen.getByRole('button', { name: 'أتحقق' }));
      const first = await screen.findByLabelText('الرمز الجديد', undefined, SLOW);
      vi.mocked(writeLockDb).mockImplementationOnce(async (record) => {
        await realDb.writeLockDb(record);
        vi.mocked(readLockDb).mockRejectedValueOnce(new Error('IndexedDB timed out'));
        throw new Error('IndexedDB timed out');
      });
      await user.type(first, '2468');
      await user.type(screen.getByLabelText('أعيد كتابة الرمز الجديد'), '2468');
      await user.click(screen.getByRole('button', { name: 'أحفظ الرمز الجديد' }));
      expect(await screen.findByRole('alert', undefined, SLOW)).toHaveTextContent(
        'ربما حُفظ رمز الدخول الجديد. يمكنني المحاولة مرة أخرى.',
      );
      expect(screen.queryByTestId('new-recovery-code')).toBeNull();
    });

    it('a wrong recovery code shows an error and counts toward the shared wait', async () => {
      const user = userEvent.setup();
      await storeRecord({ failures: 4 });
      renderScreen();
      await user.click(screen.getByRole('button', { name: 'نسيت الرمز؟' }));
      await user.click(screen.getByRole('button', { name: 'لدي رمز الاسترداد' }));
      await user.type(screen.getByLabelText('رمز الاسترداد'), 'ZZZZ-ZZZZ-ZZZZ');
      await user.click(screen.getByRole('button', { name: 'أتحقق' }));
      expect(await screen.findByText('رمز الاسترداد غير صحيح', undefined, SLOW)).toBeInTheDocument();
      expect((await stored())?.failures).toBe(5);
      expect(screen.getByRole('button', { name: 'أتحقق' })).toBeDisabled();
      expect(screen.getByRole('status')).toHaveTextContent('٣٠');

      await user.click(screen.getByRole('button', { name: 'رجوع' }));
      expect(screen.getByRole('button', { name: 'فتح' })).toBeDisabled();
    });
  });

  describe('erase everything', () => {
    function mockReload() {
      const reload = vi.fn();
      const original = window.location;
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { ...original, reload },
      });
      const restore = () =>
        Object.defineProperty(window, 'location', {
          configurable: true,
          value: original,
        });
      return Object.assign(restore, { reload });
    }

    async function openErase(user: ReturnType<typeof userEvent.setup>, forgot = 'نسيت الرمز؟', none = 'ليس لدي الرمز') {
      await user.click(screen.getByRole('button', { name: forgot }));
      await user.click(screen.getByRole('button', { name: none }));
    }

    it('warns what is erased and confirms only with the exact word «حذف»', async () => {
      const user = userEvent.setup();
      const repo = createMemoryRepo();
      const erase = vi.spyOn(repo, 'eraseAll');
      const restore = mockReload();
      try {
        await storeRecord();
        renderScreen(repo);
        await openErase(user);

        const warning = screen.getByRole('region', {
          name: 'حذف كل شيء على هذا الجهاز',
        });
        const items = within(warning)
          .getAllByRole('listitem')
          .map((li) => li.textContent);
        expect(items).toEqual(['كل التسجيلات اليومية', 'اليوميات', 'الجلسات', 'الواجبات', 'الصور', 'الإعدادات']);
        expect(warning).toHaveTextContent('نسخة احتياطية');
        expect(warning).toHaveTextContent('القفل نفسه لا يكون في أي نسخة احتياطية');

        const confirm = screen.getByRole('button', { name: 'احذف كل شيء' });
        const field = screen.getByLabelText('أكتب كلمة «حذف» للتأكيد');
        expect(field).not.toHaveAttribute('inputmode');
        expect(confirm).toBeDisabled();
        await user.type(field, 'حذ');
        expect(confirm).toBeDisabled();
        await user.type(field, 'ف ');
        expect(confirm).toBeDisabled();
        await user.type(field, '{Backspace}');
        expect(confirm).toBeEnabled();
        await user.click(confirm);
        await vi.waitFor(() => expect(erase).toHaveBeenCalledTimes(1));
        // Sync credentials clear before local data; lock removal and reload follow the data erase.
        await vi.waitFor(() => expect(restore.reload).toHaveBeenCalledTimes(1));
        expect(readLock()).toBeNull();
        expect(await stored()).toBeUndefined();
      } finally {
        restore();
      }
    });

    it('needs "ERASE" in English', async () => {
      setActiveLanguage('en');
      const user = userEvent.setup();
      const repo = createMemoryRepo();
      const erase = vi.spyOn(repo, 'eraseAll');
      const restore = mockReload();
      try {
        await storeRecord();
        renderScreen(repo);
        await openErase(user, 'Forgot PIN?', "I don't have it");
        expect(
          screen.getByRole('region', {
            name: 'Erase everything on this device',
          }),
        ).toHaveTextContent('The lock itself is never in a backup');
        const confirm = screen.getByRole('button', {
          name: 'Erase everything',
        });
        await user.type(screen.getByLabelText('Type ERASE to confirm'), 'erase');
        expect(confirm).toBeDisabled();
        await user.clear(screen.getByLabelText('Type ERASE to confirm'));
        await user.type(screen.getByLabelText('Type ERASE to confirm'), 'ERASE');
        expect(confirm).toBeEnabled();
        await user.click(confirm);
        await vi.waitFor(() => expect(erase).toHaveBeenCalledTimes(1));
        // The reload comes after the lock removal; it must reach the stand-in, not jsdom.
        await vi.waitFor(() => expect(restore.reload).toHaveBeenCalledTimes(1));
      } finally {
        restore();
      }
    });
  });
});
