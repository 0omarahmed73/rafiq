import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RepoProvider } from '../../db/RepoContext';
import { createMemoryRepo } from '../../db/memoryRepo';
import { setActiveLanguage } from '../../i18n';
import { isBiometricAvailable, verifyBiometric } from '../../platform/biometric';
import { LockProvider, useLock, type LockApi } from './LockProvider';
import { LockSettings } from './LockSettings';
import { IDBFactory } from 'fake-indexeddb';
import { clearLockDb, readLockDb, writeLockDb } from './lockDb';
import { LOCK_STORAGE_KEY, loadLock, readLockFresh, resetLockStoreForTests, type LockRecord } from './lockStore';
import { hashSecret, normalizeRecoveryCode, verifySecret } from './pin';

const fg = vi.hoisted(() => ({
  cb: undefined as ((active: boolean) => void) | undefined,
}));
vi.mock('../../platform/appState', () => ({
  onForegroundChange: vi.fn((cb: (active: boolean) => void) => {
    fg.cb = cb;
    return () => {
      if (fg.cb === cb) fg.cb = undefined;
    };
  }),
}));
// Lets one test change what the card gets from useLock; the provider itself is the real one.
const lockPatch = vi.hoisted(() => ({
  fn: null as null | ((api: LockApi) => LockApi),
}));
vi.mock('./LockProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./LockProvider')>();
  return {
    ...actual,
    useLock: () => {
      const api = actual.useLock();
      return lockPatch.fn ? lockPatch.fn(api) : api;
    },
  };
});
// The real lock database, wrapped so tests can make its writes fail.
vi.mock('./lockDb', async (importOriginal) => {
  const real = await importOriginal<typeof import('./lockDb')>();
  return {
    ...real,
    readLockDb: vi.fn(real.readLockDb),
    writeLockDb: vi.fn(real.writeLockDb),
    clearLockDb: vi.fn(real.clearLockDb),
  };
});
const realDb = await vi.importActual<typeof import('./lockDb')>('./lockDb');
vi.mock('../../platform/biometric', () => ({
  isBiometricAvailable: vi.fn(async () => false),
  verifyBiometric: vi.fn(async () => false),
}));

const PIN = '1357';
const CODE = 'ABCD-EFGH-JKMN';
const SLOW = { timeout: 10000 };

const HONEST_AR = 'القفل يخفي التطبيق لكنه لا يشفّر بياناتي على هذا الجهاز';
const SAVE_FAILED_AR = 'تعذّر حفظ القفل على هذا الجهاز';

/** The record in the lock database, read straight from IndexedDB. */
async function onDisk(): Promise<LockRecord | undefined> {
  return (await readLockDb()).record as LockRecord | undefined;
}

const MAY_HAVE_SAVED_AR = 'ربما حُفظ القفل. أفتح الإعدادات من جديد وأتحقق';

/** The next write commits but is reported as failed, and the read-back fails too: an unknown outcome. */
function nextWriteUnknown() {
  vi.mocked(writeLockDb).mockImplementationOnce(async (record) => {
    await realDb.writeLockDb(record);
    vi.mocked(readLockDb).mockRejectedValueOnce(new Error('IndexedDB timed out'));
    throw new Error('IndexedDB timed out');
  });
}

/** Makes every lock database write fail from now on in this test. */
function failWrites() {
  vi.mocked(writeLockDb).mockRejectedValue(new Error('quota'));
  vi.mocked(clearLockDb).mockRejectedValue(new Error('quota'));
}

/** A cold start with this record on disk. */
async function storeRecord(over: Partial<LockRecord> = {}): Promise<void> {
  await writeLockDb({
    v: 1,
    pin: await hashSecret(PIN, 1000),
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

/** Stands in for the lock screen: opens the app with the stored test PIN. */
function TestUnlock() {
  const { unlock } = useLock();
  return (
    <button type="button" onClick={() => void unlock(PIN)}>
      test-unlock
    </button>
  );
}

function renderCard() {
  render(
    <RepoProvider repo={createMemoryRepo()}>
      <LockProvider screen={TestUnlock}>
        <LockSettings />
      </LockProvider>
    </RepoProvider>,
  );
  return userEvent.setup();
}

/** Renders the card with a stored lock and opens the app first. */
async function renderOn(over: Partial<LockRecord> = {}) {
  await storeRecord(over);
  const user = renderCard();
  await user.click(screen.getByRole('button', { name: 'test-unlock' }));
  await screen.findByRole('heading', { name: 'القفل' });
  return user;
}

async function choosePin(user: ReturnType<typeof userEvent.setup>, pin: string, again = pin) {
  await user.type(screen.getByLabelText('الرمز الجديد'), pin);
  await user.click(screen.getByRole('button', { name: 'التالي' }));
  await user.type(await screen.findByLabelText('أعيد كتابة الرمز'), again);
  await user.click(screen.getByRole('button', { name: 'احفظ الرمز' }));
}

async function enterCurrent(user: ReturnType<typeof userEvent.setup>, pin: string) {
  await user.type(await screen.findByLabelText('الرمز الحالي'), pin);
  await user.click(screen.getByRole('button', { name: 'متابعة' }));
}

const autoLockSelect = () => screen.getByRole('combobox', { name: 'أقفل التطبيق بعد مغادرته' });

/** Leaves the app for the given time and comes back. */
function backgroundFor(ms: number) {
  act(() => fg.cb!(false));
  vi.setSystemTime(new Date(Date.now() + ms));
  act(() => fg.cb!(true));
}

beforeEach(async () => {
  lockPatch.fn = null;
  localStorage.clear();
  globalThis.indexedDB = new IDBFactory();
  resetLockStoreForTests();
  vi.mocked(isBiometricAvailable).mockReset().mockResolvedValue(false);
  vi.mocked(verifyBiometric).mockReset().mockResolvedValue(false);
  // As at boot: the (empty) lock store is loaded before anything renders.
  await loadLock();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  for (const fn of [readLockDb, writeLockDb, clearLockDb]) vi.mocked(fn).mockRestore();
});

describe('LockSettings off', () => {
  it('shows the title, the turn-on button and the honest note', async () => {
    renderCard();
    const card = await screen.findByRole('region', { name: 'القفل' });
    expect(within(card).getByRole('button', { name: 'تفعيل القفل' })).toBeInTheDocument();
    expect(within(card).getByText(HONEST_AR)).toBeInTheDocument();
  });

  it('shows the honest note in English', async () => {
    setActiveLanguage('en');
    renderCard();
    expect(await screen.findByRole('region', { name: 'Lock' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Turn on the lock' })).toBeInTheDocument();
    expect(screen.getByText('The lock hides the app but does not encrypt my data on this device')).toBeInTheDocument();
  });

  it('shows the one-time reset notice when the stored lock was damaged', async () => {
    await writeLockDb('{broken');
    resetLockStoreForTests();
    await loadLock();
    renderCard();
    expect(await screen.findByText('أُعيد ضبط القفل لأن بياناته تالفة')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تفعيل القفل' })).toBeInTheDocument();
  });

  it('does not show the reset notice normally', async () => {
    renderCard();
    await screen.findByRole('button', { name: 'تفعيل القفل' });
    expect(screen.queryByText('أُعيد ضبط القفل لأن بياناته تالفة')).not.toBeInTheDocument();
  });
});

describe('LockSettings set up', () => {
  it('refuses a weak PIN gently and does not advance', async () => {
    const user = renderCard();
    await user.click(await screen.findByRole('button', { name: 'تفعيل القفل' }));
    await user.type(screen.getByLabelText('الرمز الجديد'), '1111');
    await user.click(screen.getByRole('button', { name: 'التالي' }));
    expect(screen.getByRole('alert')).toHaveTextContent('هذا الرمز سهل التخمين');
    expect(screen.queryByLabelText('أعيد كتابة الرمز')).not.toBeInTheDocument();
  });

  it('refuses a PIN that is too short', async () => {
    const user = renderCard();
    await user.click(await screen.findByRole('button', { name: 'تفعيل القفل' }));
    await user.type(screen.getByLabelText('الرمز الجديد'), '135');
    await user.click(screen.getByRole('button', { name: 'التالي' }));
    expect(screen.getByRole('alert')).toHaveTextContent('أدخل ٤ إلى ٦ أرقام');
    expect(screen.queryByLabelText('أعيد كتابة الرمز')).not.toBeInTheDocument();
  });

  it('shows an error when the confirmation does not match', async () => {
    const user = renderCard();
    await user.click(await screen.findByRole('button', { name: 'تفعيل القفل' }));
    await choosePin(user, '2468', '2469');
    expect(screen.getByRole('alert')).toHaveTextContent('الرمزان غير متطابقين');
    expect(await onDisk()).toBeUndefined();
  });

  it(
    'accepts Arabic-Indic digits, shows the recovery code once, needs the tick, then shows the on state',
    async () => {
      const user = renderCard();
      await user.click(await screen.findByRole('button', { name: 'تفعيل القفل' }));
      await choosePin(user, '٢٤٦٨');

      const code = await screen.findByTestId('recovery-code', {}, SLOW);
      expect(code.textContent).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      const stored = await onDisk();
      expect(stored).toBeDefined();
      expect(await verifySecret('2468', stored!.pin)).toBe(true);
      expect(await verifySecret(normalizeRecoveryCode(code.textContent!), stored!.recovery)).toBe(true);
      expect(JSON.stringify(stored)).not.toContain(code.textContent!);
      expect(screen.getByRole('button', { name: 'نسخ' })).toBeInTheDocument();

      const done = screen.getByRole('button', { name: 'تم' });
      expect(done).toBeDisabled();
      await user.click(screen.getByRole('checkbox', { name: 'حفظت رمز الاسترداد' }));
      expect(done).toBeEnabled();
      await user.click(done);

      expect(screen.queryByTestId('recovery-code')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'غيّر الرمز' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'أوقف القفل' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'تفعيل القفل' })).not.toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'shows the save-failed message and stays off when storage cannot be written',
    async () => {
      const user = renderCard();
      await user.click(await screen.findByRole('button', { name: 'تفعيل القفل' }));
      failWrites();
      await choosePin(user, '2468');

      expect(await screen.findByText(SAVE_FAILED_AR, {}, SLOW)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'تفعيل القفل' })).toBeInTheDocument();
      expect(screen.queryByTestId('recovery-code')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'أوقف القفل' })).not.toBeInTheDocument();
      expect(await onDisk()).toBeUndefined();
    },
    SLOW,
  );

  it(
    'says the lock may have been saved when the save outcome is unknown',
    async () => {
      const user = renderCard();
      await user.click(await screen.findByRole('button', { name: 'تفعيل القفل' }));
      nextWriteUnknown();
      await choosePin(user, '2468');
      // Once storage answers, the provider re-reads it and the card shows the lock that was stored, with the note.
      expect(await screen.findByRole('button', { name: 'أوقف القفل' }, SLOW)).toBeInTheDocument();
      await act(async () => {
        await readLockFresh();
      });
      expect(screen.getByText(MAY_HAVE_SAVED_AR)).toBeInTheDocument();
      expect(screen.queryByText(SAVE_FAILED_AR)).not.toBeInTheDocument();
      expect(screen.queryByTestId('recovery-code')).not.toBeInTheDocument();
    },
    SLOW,
  );

  it('does not offer biometrics when they are not available', async () => {
    const user = renderCard();
    await user.click(await screen.findByRole('button', { name: 'تفعيل القفل' }));
    expect(screen.queryByRole('checkbox', { name: 'استخدم البصمة أيضًا' })).not.toBeInTheDocument();
  });

  it(
    'saves biometrics when the one prompt succeeds',
    async () => {
      vi.mocked(isBiometricAvailable).mockResolvedValue(true);
      vi.mocked(verifyBiometric).mockResolvedValue(true);
      const user = renderCard();
      await user.click(await screen.findByRole('button', { name: 'تفعيل القفل' }));
      const bio = await screen.findByRole('checkbox', {
        name: 'استخدم البصمة أيضًا',
      });
      await user.click(bio);
      expect(verifyBiometric).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(bio).toBeChecked());
      await choosePin(user, '2468');
      await screen.findByTestId('recovery-code', {}, SLOW);
      expect((await onDisk())?.biometric).toBe(true);
      expect(verifyBiometric).toHaveBeenCalledTimes(1);
    },
    SLOW,
  );

  it(
    'leaves biometrics off with a message when the prompt fails',
    async () => {
      vi.mocked(isBiometricAvailable).mockResolvedValue(true);
      vi.mocked(verifyBiometric).mockResolvedValue(false);
      const user = renderCard();
      await user.click(await screen.findByRole('button', { name: 'تفعيل القفل' }));
      const bio = await screen.findByRole('checkbox', {
        name: 'استخدم البصمة أيضًا',
      });
      await user.click(bio);
      expect(verifyBiometric).toHaveBeenCalledTimes(1);
      expect(await screen.findByText('لم أتحقق بالبصمة، فبقيت متوقفة')).toBeInTheDocument();
      expect(bio).not.toBeChecked();
      await choosePin(user, '2468');
      await screen.findByTestId('recovery-code', {}, SLOW);
      expect((await onDisk())?.biometric).toBe(false);
    },
    SLOW,
  );
});

describe('LockSettings recovery code and auto-lock', () => {
  it(
    'keeps the new code on screen through a long background, and auto-locks again after Done',
    async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      const user = renderCard();
      await user.click(await screen.findByRole('button', { name: 'تفعيل القفل' }));
      await choosePin(user, '2468');
      const code = (await screen.findByTestId('recovery-code', {}, SLOW)).textContent;

      backgroundFor(5 * 60000);
      expect(screen.getByTestId('recovery-code')).toHaveTextContent(code!);
      expect(screen.queryByRole('button', { name: 'test-unlock' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('checkbox', { name: 'حفظت رمز الاسترداد' }));
      await user.click(screen.getByRole('button', { name: 'تم' }));
      backgroundFor(61000);
      expect(screen.getByRole('button', { name: 'test-unlock' })).toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'says how to get a new code if I lose this one',
    async () => {
      const user = renderCard();
      await user.click(await screen.findByRole('button', { name: 'تفعيل القفل' }));
      await choosePin(user, '2468');
      await screen.findByTestId('recovery-code', {}, SLOW);
      expect(
        screen.getByText('إن فقدت هذا الرمز، يمكنني الحصول على رمز جديد من «غيّر الرمز».', { exact: false }),
      ).toBeInTheDocument();
    },
    SLOW,
  );
});

describe('LockSettings on', () => {
  it('shows the auto-lock select with four options, defaulting to one minute, and the actions', async () => {
    await renderOn();
    const select = screen.getByRole('combobox', {
      name: 'أقفل التطبيق بعد مغادرته',
    });
    const options = within(select).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['فورًا', 'دقيقة واحدة', '٥ دقائق', '١٥ دقيقة']);
    expect(options.map((o) => (o as HTMLOptionElement).value)).toEqual(['0', '60000', '300000', '900000']);
    expect(select).toHaveValue('60000');
    expect(screen.getByRole('button', { name: 'غيّر الرمز' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'أوقف القفل' })).toBeInTheDocument();
    expect(screen.getByText(HONEST_AR)).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('asks for the current PIN before saving a new auto-lock time', async () => {
    const user = await renderOn();
    await user.selectOptions(autoLockSelect(), '300000');
    expect((await onDisk())?.autoLockMs).toBe(60000);
    expect(screen.getByRole('heading', { name: 'أكتب رمزي الحالي لتغيير وقت القفل' })).toBeInTheDocument();
    await enterCurrent(user, PIN);
    await waitFor(() => expect(autoLockSelect()).toHaveValue('300000'));
    expect((await onDisk())?.autoLockMs).toBe(300000);
    expect(screen.queryByText(SAVE_FAILED_AR)).not.toBeInTheDocument();
  });

  it('keeps the auto-lock time when the current PIN is wrong', async () => {
    const user = await renderOn();
    await user.selectOptions(autoLockSelect(), '0');
    await enterCurrent(user, '2468');
    expect(await screen.findByRole('alert')).toHaveTextContent('الرمز غير صحيح');
    expect((await onDisk())?.autoLockMs).toBe(60000);
    await user.click(screen.getByRole('button', { name: 'رجوع' }));
    expect(autoLockSelect()).toHaveValue('60000');
    expect((await onDisk())?.autoLockMs).toBe(60000);
  });

  it('keeps the auto-lock time when I go back without the PIN', async () => {
    const user = await renderOn();
    await user.selectOptions(autoLockSelect(), '900000');
    await user.click(screen.getByRole('button', { name: 'رجوع' }));
    expect(autoLockSelect()).toHaveValue('60000');
    expect((await onDisk())?.autoLockMs).toBe(60000);
  });

  it('says so when the auto-lock time cannot be saved', async () => {
    const user = await renderOn();
    failWrites();
    await user.selectOptions(autoLockSelect(), '0');
    await enterCurrent(user, PIN);
    expect(await screen.findByText(SAVE_FAILED_AR)).toBeInTheDocument();
    expect((await onDisk())?.autoLockMs).toBe(60000);
  });

  it('shows a generic error and stays usable when the PIN check fails unexpectedly', async () => {
    const user = await renderOn();
    lockPatch.fn = (api) => ({
      ...api,
      verifyPin: () => Promise.reject(new Error('boom')),
    });
    await user.click(screen.getByRole('button', { name: 'أوقف القفل' }));
    await enterCurrent(user, PIN);
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر التحقق من الرمز');
    expect(screen.getByRole('button', { name: 'متابعة' })).toBeEnabled();
    expect(await onDisk()).toBeDefined();
  });

  it('shows a biometric switch only when biometrics are available, and turning it on needs one prompt', async () => {
    vi.mocked(isBiometricAvailable).mockResolvedValue(true);
    vi.mocked(verifyBiometric).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const user = await renderOn();
    const toggle = await screen.findByRole('switch', {
      name: 'استخدم البصمة أيضًا',
    });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await user.click(toggle);
    expect(await screen.findByText('لم أتحقق بالبصمة، فبقيت متوقفة')).toBeInTheDocument();
    expect((await onDisk())?.biometric).toBe(false);
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await user.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
    expect((await onDisk())?.biometric).toBe(true);
    expect(verifyBiometric).toHaveBeenCalledTimes(2);

    await user.click(toggle);
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));
    expect((await onDisk())?.biometric).toBe(false);
    expect(verifyBiometric).toHaveBeenCalledTimes(2);
  });

  it('turning off asks for the current PIN; a wrong PIN changes nothing', async () => {
    vi.mocked(isBiometricAvailable).mockResolvedValue(true);
    const user = await renderOn({ biometric: true });
    const before = await onDisk();
    await user.click(screen.getByRole('button', { name: 'أوقف القفل' }));
    expect(screen.queryByRole('button', { name: /البصمة/ })).not.toBeInTheDocument();
    await enterCurrent(user, '2468');
    expect(await screen.findByRole('alert')).toHaveTextContent('الرمز غير صحيح');
    expect((await onDisk())?.pin).toEqual(before?.pin);
    expect(screen.getByLabelText('الرمز الحالي')).toBeInTheDocument();
    expect(verifyBiometric).not.toHaveBeenCalled();
  });

  it('turns the lock off with the current PIN and deletes the record', async () => {
    const user = await renderOn();
    await user.click(screen.getByRole('button', { name: 'أوقف القفل' }));
    await enterCurrent(user, PIN);
    expect(await screen.findByRole('button', { name: 'تفعيل القفل' })).toBeInTheDocument();
    expect(screen.getByText('أوقفت القفل.')).toBeInTheDocument();
    expect(await readLockDb()).toEqual({ initialized: true, record: undefined });
    expect(localStorage.getItem(LOCK_STORAGE_KEY)).toBeNull();
  });

  it('says so when turning the lock off cannot be saved', async () => {
    const user = await renderOn();
    failWrites();
    await user.click(screen.getByRole('button', { name: 'أوقف القفل' }));
    await enterCurrent(user, PIN);
    expect(await screen.findByText(SAVE_FAILED_AR)).toBeInTheDocument();
    expect(screen.queryByText('أوقفت القفل.')).not.toBeInTheDocument();
    expect(await onDisk()).toBeDefined();
  });

  it('says so when the biometric choice cannot be saved', async () => {
    vi.mocked(isBiometricAvailable).mockResolvedValue(true);
    vi.mocked(verifyBiometric).mockResolvedValue(true);
    const user = await renderOn();
    failWrites();
    await user.click(await screen.findByRole('switch', { name: 'استخدم البصمة أيضًا' }));
    expect(await screen.findByText(SAVE_FAILED_AR)).toBeInTheDocument();
    expect((await onDisk())?.biometric).toBe(false);
  });

  it('can go back from the PIN check without changing anything', async () => {
    const user = await renderOn();
    await user.click(screen.getByRole('button', { name: 'أوقف القفل' }));
    await user.click(screen.getByRole('button', { name: 'رجوع' }));
    expect(screen.getByRole('button', { name: 'أوقف القفل' })).toBeInTheDocument();
    expect(await onDisk()).toBeDefined();
  });

  it('changing the PIN asks for the current PIN; a wrong PIN changes nothing', async () => {
    vi.mocked(isBiometricAvailable).mockResolvedValue(true);
    const user = await renderOn({ biometric: true });
    const before = await onDisk();
    await user.click(screen.getByRole('button', { name: 'غيّر الرمز' }));
    expect(screen.queryByRole('button', { name: /البصمة/ })).not.toBeInTheDocument();
    await enterCurrent(user, '9753');
    expect(await screen.findByRole('alert')).toHaveTextContent('الرمز غير صحيح');
    expect(screen.queryByLabelText('الرمز الجديد')).not.toBeInTheDocument();
    expect((await onDisk())?.pin).toEqual(before?.pin);
    expect((await onDisk())?.recovery).toEqual(before?.recovery);
    expect(verifyBiometric).not.toHaveBeenCalled();
  });

  it(
    'changes the PIN after the current PIN and shows a new recovery code; the old one stops working',
    async () => {
      const user = await renderOn();
      await user.click(screen.getByRole('button', { name: 'غيّر الرمز' }));
      await enterCurrent(user, PIN);
      await screen.findByLabelText('الرمز الجديد');
      await user.type(screen.getByLabelText('الرمز الجديد'), '4321');
      await user.click(screen.getByRole('button', { name: 'التالي' }));
      expect(screen.getByRole('alert')).toHaveTextContent('هذا الرمز سهل التخمين');
      await user.clear(screen.getByLabelText('الرمز الجديد'));
      await choosePin(user, '2468');

      const code = await screen.findByTestId('recovery-code', {}, SLOW);
      const stored = (await onDisk())!;
      expect(await verifySecret('2468', stored.pin)).toBe(true);
      expect(await verifySecret(PIN, stored.pin)).toBe(false);
      expect(await verifySecret(normalizeRecoveryCode(code.textContent!), stored.recovery)).toBe(true);
      expect(await verifySecret(normalizeRecoveryCode(CODE), stored.recovery)).toBe(false);

      const done = screen.getByRole('button', { name: 'تم' });
      expect(done).toBeDisabled();
      await user.click(screen.getByRole('checkbox', { name: 'حفظت رمز الاسترداد' }));
      await user.click(done);
      expect(screen.queryByTestId('recovery-code')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'غيّر الرمز' })).toBeInTheDocument();
    },
    SLOW,
  );

  it(
    'says the PIN may have been saved when a PIN change outcome is unknown, and the new PIN then works',
    async () => {
      const user = await renderOn();
      await user.click(screen.getByRole('button', { name: 'غيّر الرمز' }));
      await enterCurrent(user, PIN);
      await screen.findByLabelText('الرمز الجديد');
      nextWriteUnknown();
      await choosePin(user, '2468');
      expect(await screen.findByText(MAY_HAVE_SAVED_AR, {}, SLOW)).toBeInTheDocument();
      expect(screen.queryByText(SAVE_FAILED_AR)).not.toBeInTheDocument();
      expect(await verifySecret('2468', (await onDisk())!.pin)).toBe(true);
      await act(async () => {
        await readLockFresh();
      });
    },
    SLOW,
  );

  it('shows the wait message after too many wrong PINs and refuses to check', async () => {
    const user = await renderOn();
    await user.click(screen.getByRole('button', { name: 'أوقف القفل' }));
    for (let i = 0; i < 5; i += 1) {
      await user.clear(screen.getByLabelText('الرمز الحالي'));
      await enterCurrent(user, '2468');
      await screen.findByRole('alert');
    }
    expect(await screen.findByText(/يمكنني المحاولة مرة أخرى بعد/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'متابعة' })).toBeDisabled();
    expect(await onDisk()).toBeDefined();
  });
});
