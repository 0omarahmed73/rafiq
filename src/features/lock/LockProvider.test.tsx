import { StrictMode, useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RepoProvider } from '../../db/RepoContext';
import { createMemoryRepo } from '../../db/memoryRepo';
import { LockProvider, useLock, type LockApi } from './LockProvider';
import { clearLockDb, readLockDb, writeLockDb } from './lockDb';
import {
  LOCK_STORAGE_KEY,
  LockWriteUnknownError,
  loadLock,
  readLock,
  readLockFresh,
  resetLockStoreForTests,
  type LockRecord,
} from './lockStore';
import { hashSecret, normalizeRecoveryCode } from './pin';
import { verifyBiometric } from '../../platform/biometric';
import { IDBFactory } from 'fake-indexeddb';
import {
  clearSyncIdentity,
  createSessionStorage,
  loadSyncKey,
  loadSyncMeta,
  saveSyncKey,
  saveSyncMeta,
} from '../sync/syncKeyStore';
import { createFakeSyncServer } from '../sync/syncServer.fake';
import { createSyncEngine } from '../sync/syncEngine';

const fg = vi.hoisted(() => ({ cb: undefined as ((active: boolean) => void) | undefined }));
vi.mock('../../platform/appState', () => ({
  onForegroundChange: vi.fn((cb: (active: boolean) => void) => {
    fg.cb = cb;
    return () => {
      if (fg.cb === cb) fg.cb = undefined;
    };
  }),
}));
vi.mock('../../platform/biometric', () => ({
  isBiometricAvailable: vi.fn(async () => true),
  verifyBiometric: vi.fn(async () => true),
}));

// The real lock database, wrapped so tests can make it fail or hang.
vi.mock('./lockDb', async (importOriginal) => {
  const real = await importOriginal<typeof import('./lockDb')>();
  return {
    ...real,
    readLockDb: vi.fn(real.readLockDb),
    writeLockDb: vi.fn(real.writeLockDb),
    clearLockDb: vi.fn(real.clearLockDb),
  };
});

// The real sync key store, wrapped so an erase test can make clearing the sync identity hang.
vi.mock('../sync/syncKeyStore', async (importOriginal) => {
  const real = await importOriginal<typeof import('../sync/syncKeyStore')>();
  return { ...real, clearSyncIdentity: vi.fn(real.clearSyncIdentity) };
});

/** The record in the lock database, read straight from IndexedDB. */
async function stored(): Promise<LockRecord | undefined> {
  return (await readLockDb()).record as LockRecord | undefined;
}

/** Makes every lock database write fail from now on in this test. */
function failWrites() {
  vi.mocked(writeLockDb).mockRejectedValue(new Error('QuotaExceededError'));
  vi.mocked(clearLockDb).mockRejectedValue(new Error('QuotaExceededError'));
}

const realDb = await vi.importActual<typeof import('./lockDb')>('./lockDb');

/** The next write commits but is reported as failed, and the read-back fails too: an unknown outcome. */
function nextWriteUnknown() {
  vi.mocked(writeLockDb).mockImplementationOnce(async (record) => {
    await realDb.writeLockDb(record);
    vi.mocked(readLockDb).mockRejectedValueOnce(new Error('IndexedDB timed out'));
    throw new Error('IndexedDB timed out');
  });
}

const CODE = 'ABCD-EFGH-JKMN';

async function storeRecord(over: Partial<LockRecord> = {}): Promise<LockRecord> {
  const record: LockRecord = {
    v: 1,
    pin: await hashSecret('1357', 1000),
    recovery: await hashSecret(normalizeRecoveryCode(CODE), 1000),
    biometric: false,
    autoLockMs: 60000,
    failures: 0,
    blockedUntil: 0,
    ...over,
  };
  // A cold start with this record on disk.
  await writeLockDb(record);
  resetLockStoreForTests();
  await loadLock();
  return record;
}

let api: LockApi;
const mounts = vi.fn();
const effects = vi.fn();

function Capture() {
  api = useLock();
  return null;
}
function Child() {
  mounts();
  useEffect(() => {
    effects();
  }, []);
  return <p>app content</p>;
}
function Stub() {
  api = useLock();
  return <p>lock screen</p>;
}

function renderLock(repo = createMemoryRepo()) {
  return render(
    <RepoProvider repo={repo}>
      <LockProvider screen={Stub}>
        <Capture />
        <Child />
      </LockProvider>
    </RepoProvider>,
  );
}

const isLocked = () => screen.queryByText('lock screen') !== null && screen.queryByText('app content') === null;
const isOpen = () => screen.queryByText('app content') !== null && screen.queryByText('lock screen') === null;

async function call<T>(fn: () => Promise<T>): Promise<T> {
  let out!: T;
  await act(async () => {
    out = await fn();
  });
  return out;
}

beforeEach(() => {
  localStorage.clear();
  globalThis.indexedDB = new IDBFactory();
  resetLockStoreForTests();
  mounts.mockClear();
  effects.mockClear();
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-11-07T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  for (const fn of [readLockDb, writeLockDb, clearLockDb]) vi.mocked(fn).mockRestore();
  vi.mocked(clearSyncIdentity).mockRestore();
});

describe('LockProvider', () => {
  it('renders children and no lock screen when no record is stored', () => {
    renderLock();
    expect(isOpen()).toBe(true);
    expect(api.enabled).toBe(false);
    expect(api.locked).toBe(false);
  });

  it('starts locked with a stored record and never mounts the children', async () => {
    await storeRecord();
    renderLock();
    expect(isLocked()).toBe(true);
    expect(api.enabled).toBe(true);
    expect(api.locked).toBe(true);
    expect(mounts).not.toHaveBeenCalled();
    expect(effects).not.toHaveBeenCalled();
  });

  it('starts locked from the localStorage mirror when IndexedDB fails at start', async () => {
    const record = await storeRecord();
    expect(JSON.parse(localStorage.getItem(LOCK_STORAGE_KEY)!)).toEqual(record);
    resetLockStoreForTests();
    vi.mocked(readLockDb).mockRejectedValueOnce(new Error('blocked'));
    await loadLock();
    renderLock();
    expect(isLocked()).toBe(true);
    expect(mounts).not.toHaveBeenCalled();
    expect(await call(() => api.unlock('1357'))).toBe('ok');
  });

  it('starts open when IndexedDB fails at start and there is no mirror', async () => {
    await storeRecord();
    localStorage.clear();
    resetLockStoreForTests();
    vi.mocked(readLockDb).mockRejectedValueOnce(new Error('blocked'));
    await loadLock();
    renderLock();
    expect(isOpen()).toBe(true);
    expect(api.enabled).toBe(false);
  });

  it('throws when useLock is used outside a provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Capture />)).toThrow(/LockProvider/);
  });

  it('unlocks with the right PIN', async () => {
    await storeRecord();
    renderLock();
    expect(await call(() => api.unlock('1357'))).toBe('ok');
    expect(isOpen()).toBe(true);
    expect(effects).toHaveBeenCalledTimes(1);
  });

  it('unlocks with the right PIN typed in Arabic-Indic digits', async () => {
    await storeRecord();
    renderLock();
    expect(await call(() => api.unlock('١٣٥٧'))).toBe('ok');
    expect(isOpen()).toBe(true);
  });

  it('counts a wrong PIN, persists it and stays locked', async () => {
    await storeRecord();
    renderLock();
    expect(await call(() => api.unlock('0000'))).toBe('wrong');
    expect(isLocked()).toBe(true);
    expect((await stored())?.failures).toBe(1);
    expect(api.record?.failures).toBe(1);
  });

  it('verifyPin does not unlock', async () => {
    await storeRecord();
    renderLock();
    expect(await call(() => api.verifyPin('1357'))).toBe('ok');
    expect(isLocked()).toBe(true);
  });

  it('blocks after five failures without hashing or moving blockedUntil, then opens after 30 s', async () => {
    await storeRecord();
    renderLock();
    for (let i = 0; i < 5; i += 1) expect(await call(() => api.unlock('0000'))).toBe('wrong');
    const blockedUntil = (await stored())!.blockedUntil;
    expect(blockedUntil).toBe(Date.now() + 30000);
    expect(api.waitMs).toBe(30000);

    const derive = vi.spyOn(crypto.subtle, 'deriveBits');
    expect(await call(() => api.unlock('1357'))).toBe('blocked');
    expect(derive).not.toHaveBeenCalled();
    expect((await stored())!.blockedUntil).toBe(blockedUntil);

    act(() => vi.advanceTimersByTime(1000));
    expect(api.waitMs).toBe(29000);
    act(() => vi.advanceTimersByTime(29000));
    expect(api.waitMs).toBe(0);
    expect(vi.getTimerCount()).toBe(0);

    derive.mockRestore();
    expect(await call(() => api.unlock('1357'))).toBe('ok');
    expect(isOpen()).toBe(true);
    expect(await stored()).toMatchObject({ failures: 0, blockedUntil: 0 });
  });

  it('shows a stored wait at cold start', async () => {
    await storeRecord({ failures: 5, blockedUntil: Date.now() + 10000 });
    renderLock();
    expect(api.waitMs).toBe(10000);
    expect(await call(() => api.unlock('1357'))).toBe('blocked');
  });

  it('serializes quick submits so both cannot pass the block check', async () => {
    await storeRecord({ failures: 4 });
    renderLock();
    const results = await call(() => Promise.all([api.verifyPin('0000'), api.verifyPin('1357')]));
    expect(results).toEqual(['wrong', 'blocked']);
    expect((await stored())?.failures).toBe(5);
  });

  it('treats a verification that throws as a wrong PIN', async () => {
    await storeRecord();
    renderLock();
    vi.spyOn(crypto.subtle, 'deriveBits').mockRejectedValueOnce(new Error('OperationError'));
    expect(await call(() => api.unlock('1357'))).toBe('wrong');
    expect(isLocked()).toBe(true);
  });

  it('treats a record with damaged hash strings as off, with the reset notice', async () => {
    await storeRecord({ pin: { salt: '!', hash: '%%%', iter: 1000 } });
    renderLock();
    expect(api.enabled).toBe(false);
    expect(api.resetNotice).toBe(true);
    expect(isOpen()).toBe(true);
  });

  it('still unlocks, and still reports wrong, when storage cannot be written', async () => {
    await storeRecord();
    renderLock();
    failWrites();
    expect(await call(() => api.unlock('0000'))).toBe('wrong');
    expect(api.record?.failures).toBe(1);
    expect(await call(() => api.unlock('1357'))).toBe('ok');
    expect(isOpen()).toBe(true);
    expect(api.record?.failures).toBe(0);
  });

  it('a biometric success waits for a PIN check already running, so its reset is not overwritten', async () => {
    await storeRecord({ biometric: true });
    renderLock();
    let check!: Promise<string>;
    let bio!: Promise<boolean>;
    act(() => {
      check = api.verifyPin('0000');
      bio = api.unlockWithBiometric();
    });
    expect(await call(() => check)).toBe('wrong');
    expect(await call(() => bio)).toBe(true);
    expect(await stored()).toMatchObject({ failures: 0, blockedUntil: 0 });
    expect(api.record).toMatchObject({ failures: 0 });
    expect(isOpen()).toBe(true);
  });

  it('after a PIN change whose save is unknown, the next check uses the new PIN when it was stored', async () => {
    await storeRecord();
    renderLock();
    await call(() => api.unlock('1357'));
    nextWriteUnknown();
    await expect(call(() => api.changePin('2468'))).rejects.toBeInstanceOf(LockWriteUnknownError);
    expect(await call(() => api.verifyPin('2468'))).toBe('ok');
    expect(await call(() => api.verifyPin('1357'))).toBe('wrong');
  });

  it('after a set-up whose save is unknown, the lock shows as on once storage answers', async () => {
    await loadLock();
    renderLock();
    nextWriteUnknown();
    await expect(call(() => api.setUp('2468', false))).rejects.toBeInstanceOf(LockWriteUnknownError);
    // The provider's queued re-read runs before this one and adopts the stored record.
    await call(() => readLockFresh());
    expect(api.enabled).toBe(true);
    expect(api.locked).toBe(false);
    expect(await call(() => api.verifyPin('2468'))).toBe('ok');
  });

  it('unlocks with biometrics only when they are enabled', async () => {
    await storeRecord({ biometric: false });
    const first = renderLock();
    expect(await call(() => api.unlockWithBiometric())).toBe(false);
    expect(isLocked()).toBe(true);
    first.unmount();

    await storeRecord({ biometric: true });
    renderLock();
    expect(await call(() => api.unlockWithBiometric())).toBe(true);
    expect(isOpen()).toBe(true);
  });

  describe('auto-lock', () => {
    async function openWith(autoLockMs: number) {
      await storeRecord({ autoLockMs });
      renderLock();
      await call(() => api.unlock('1357'));
      expect(isOpen()).toBe(true);
    }

    it('stays open after a background shorter than the timeout and locks after a longer one', async () => {
      await openWith(60000);
      act(() => fg.cb!(false));
      act(() => vi.advanceTimersByTime(59000));
      act(() => fg.cb!(true));
      expect(isOpen()).toBe(true);

      act(() => fg.cb!(false));
      act(() => vi.advanceTimersByTime(61000));
      act(() => fg.cb!(true));
      expect(isLocked()).toBe(true);
    });

    it('keeps the first background time when several hide events arrive', async () => {
      await openWith(60000);
      act(() => fg.cb!(false));
      act(() => vi.advanceTimersByTime(40000));
      act(() => fg.cb!(false));
      act(() => vi.advanceTimersByTime(30000));
      act(() => fg.cb!(true));
      expect(isLocked()).toBe(true);
    });

    it('does not lock while auto-lock is paused, and locks normally again after unpausing', async () => {
      await openWith(60000);
      act(() => api.setAutoLockPaused(true));
      act(() => fg.cb!(false));
      act(() => vi.advanceTimersByTime(5 * 60000));
      act(() => fg.cb!(true));
      expect(isOpen()).toBe(true);

      // A hide that started while paused leaves no stale time behind once the pause ends.
      act(() => fg.cb!(false));
      act(() => vi.advanceTimersByTime(2 * 60000));
      act(() => api.setAutoLockPaused(false));
      act(() => fg.cb!(true));
      expect(isOpen()).toBe(true);

      act(() => fg.cb!(false));
      act(() => vi.advanceTimersByTime(61000));
      act(() => fg.cb!(true));
      expect(isLocked()).toBe(true);
    });

    it('locks on every return when set to immediately', async () => {
      await openWith(0);
      act(() => fg.cb!(false));
      act(() => fg.cb!(true));
      expect(isLocked()).toBe(true);
    });

    it('locks when the clock is moved back while the app is hidden', async () => {
      await openWith(60000);
      act(() => fg.cb!(false));
      vi.setSystemTime(Date.now() - 3600000);
      act(() => fg.cb!(true));
      expect(isLocked()).toBe(true);
    });

    it('uses the monotonic time when the clock was set back by less than the time away', async () => {
      const mono = vi.spyOn(performance, 'now').mockReturnValue(1000);
      await openWith(60000);
      act(() => fg.cb!(false));
      act(() => vi.advanceTimersByTime(120000));
      mono.mockReturnValue(121000);
      vi.setSystemTime(Date.now() - 100000);
      act(() => fg.cb!(true));
      expect(isLocked()).toBe(true);
    });

    it('a short background with both clocks agreeing still does not lock', async () => {
      const mono = vi.spyOn(performance, 'now').mockReturnValue(1000);
      await openWith(60000);
      act(() => fg.cb!(false));
      act(() => vi.advanceTimersByTime(30000));
      mono.mockReturnValue(31000);
      act(() => fg.cb!(true));
      expect(isOpen()).toBe(true);
    });

    it('a pause released while hidden starts the timeout from the release', async () => {
      await openWith(60000);
      act(() => api.setAutoLockPaused(true));
      act(() => fg.cb!(false));
      act(() => vi.advanceTimersByTime(5 * 60000));
      act(() => api.setAutoLockPaused(false));
      act(() => vi.advanceTimersByTime(61000));
      act(() => fg.cb!(true));
      expect(isLocked()).toBe(true);
    });

    it('a pause released while hidden locks on return when set to immediately', async () => {
      await openWith(0);
      act(() => api.setAutoLockPaused(true));
      act(() => fg.cb!(false));
      act(() => api.setAutoLockPaused(false));
      act(() => fg.cb!(true));
      expect(isLocked()).toBe(true);
    });

    it('a pause released while visible leaves no background time behind', async () => {
      await openWith(0);
      act(() => api.setAutoLockPaused(true));
      act(() => fg.cb!(false));
      act(() => fg.cb!(true));
      act(() => api.setAutoLockPaused(false));
      act(() => fg.cb!(true));
      expect(isOpen()).toBe(true);
    });

    it('never locks when the page is never backgrounded', async () => {
      await openWith(0);
      act(() => vi.advanceTimersByTime(30 * 60000));
      act(() => fg.cb!(true));
      expect(isOpen()).toBe(true);
    });
  });

  it('recovers with the right code, then a new PIN replaces the code and finishRecovery opens the app', async () => {
    await storeRecord();
    renderLock();
    expect(await call(() => api.recover('abcd efgh jkmn'))).toBe('ok');
    expect(api.recovered).toBe(true);
    expect(isLocked()).toBe(true);

    const code = await call(() => api.changePin('2468'));
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(code).not.toBe(CODE);
    // Stays locked so the lock screen can show the new code before the app opens.
    expect(isLocked()).toBe(true);
    expect(api.recovered).toBe(true);

    act(() => api.finishRecovery());
    expect(isOpen()).toBe(true);
    expect(api.recovered).toBe(false);

    expect(await call(() => api.recover(CODE))).toBe('wrong');
    expect(await call(() => api.verifyPin('2468'))).toBe('ok');
    expect(await call(() => api.verifyPin('1357'))).toBe('wrong');
  });

  it('finishRecovery does nothing before a new PIN is saved on the recovery path', async () => {
    await storeRecord();
    renderLock();
    act(() => api.finishRecovery());
    expect(isLocked()).toBe(true);

    await call(() => api.recover(CODE));
    act(() => api.finishRecovery());
    expect(isLocked()).toBe(true);
    expect(api.recovered).toBe(true);
  });

  it('counts a wrong recovery code on the shared counter', async () => {
    await storeRecord({ failures: 4 });
    renderLock();
    expect(await call(() => api.recover('ZZZZ-ZZZZ-ZZZZ'))).toBe('wrong');
    expect((await stored())?.failures).toBe(5);
    expect(await call(() => api.recover(CODE))).toBe('blocked');
    expect(api.recovered).toBe(false);
  });

  it('refuses to change the PIN while locked without recovery', async () => {
    await storeRecord();
    renderLock();
    await expect(call(() => api.changePin('2468'))).rejects.toThrow();
    expect(await call(() => api.verifyPin('1357'))).toBe('ok');
  });

  it('sets up a lock without locking and returns a recovery code', async () => {
    renderLock();
    const code = await call(() => api.setUp('2468', true));
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(api.enabled).toBe(true);
    expect(api.locked).toBe(false);
    expect(isOpen()).toBe(true);
    expect(await stored()).toMatchObject({ biometric: true, autoLockMs: 60000, failures: 0, blockedUntil: 0 });
    expect(await call(() => api.verifyPin('٢٤٦٨'))).toBe('ok');
  });

  it('setUp throws and stays off when storage fails', async () => {
    await loadLock();
    renderLock();
    failWrites();
    await expect(call(() => api.setUp('2468', false))).rejects.toThrow();
    expect(api.enabled).toBe(false);
    expect(readLock()).toBeNull();
    expect(await stored()).toBeUndefined();
  });

  it('changePin throws and keeps the old PIN when storage fails', async () => {
    const before = await storeRecord();
    renderLock();
    await call(() => api.unlock('1357'));
    failWrites();
    await expect(call(() => api.changePin('2468'))).rejects.toThrow();
    expect(api.record?.pin).toEqual(before.pin);
    expect(await call(() => api.verifyPin('1357'))).toBe('ok');
    expect((await stored())?.pin).toEqual(before.pin);
  });

  it('changes the auto-lock time and the biometric choice', async () => {
    await storeRecord();
    renderLock();
    await call(() => api.unlock('1357'));
    expect(await call(() => api.setAutoLockMs(300000))).toBe(true);
    expect(await call(() => api.setBiometric(true))).toBe(true);
    expect(await stored()).toMatchObject({ autoLockMs: 300000, biometric: true });
    expect(readLock()).toMatchObject({ autoLockMs: 300000, biometric: true });
    expect(api.record).toMatchObject({ autoLockMs: 300000, biometric: true });
  });

  it('settings changes and turnOff resolve false when storage fails, and still apply for this session', async () => {
    const before = await storeRecord();
    renderLock();
    await call(() => api.unlock('1357'));
    failWrites();
    expect(await call(() => api.setAutoLockMs(300000))).toBe(false);
    expect(api.record).toMatchObject({ autoLockMs: 300000 });
    expect(await call(() => api.setBiometric(true))).toBe(false);
    expect(api.record).toMatchObject({ biometric: true });
    expect(await call(() => api.turnOff())).toBe(false);
    expect(api.enabled).toBe(false);
    expect(await stored()).toEqual({ ...before, failures: 0, blockedUntil: 0 });
  });

  it('turnOff while open removes the record', async () => {
    await storeRecord();
    renderLock();
    await call(() => api.unlock('1357'));
    expect(await call(() => api.turnOff())).toBe(true);
    expect(readLock()).toBeNull();
    expect(await readLockDb()).toEqual({ initialized: true, record: undefined });
    expect(api.enabled).toBe(false);
    expect(isOpen()).toBe(true);
  });

  describe('erase', () => {
    async function withReload(run: (reload: ReturnType<typeof vi.fn>) => Promise<void>) {
      const reload = vi.fn();
      const original = window.location;
      Object.defineProperty(window, 'location', { configurable: true, value: { ...original, reload } });
      try {
        await run(reload);
      } finally {
        Object.defineProperty(window, 'location', { configurable: true, value: original });
      }
    }

    it('clears sync credentials before erasing the repo, clears the lock, then reloads', async () => {
      await storeRecord();
      const repo = createMemoryRepo();
      const erase = vi.spyOn(repo, 'eraseAll');
      await withReload(async (reload) => {
        renderLock(repo);
        await call(() => api.eraseEverything());
        expect(erase).toHaveBeenCalledTimes(1);
        expect(vi.mocked(clearLockDb)).toHaveBeenCalledTimes(1);
        expect(vi.mocked(clearSyncIdentity).mock.invocationCallOrder[0]).toBeLessThan(erase.mock.invocationCallOrder[0]);
        expect(erase.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(clearLockDb).mock.invocationCallOrder[0]);
        expect(readLock()).toBeNull();
        expect(await readLockDb()).toEqual({ initialized: true, record: undefined });
        expect(reload).toHaveBeenCalledTimes(1);
      });
    });

    it('stops sync before erasing, clears the IndexedDB sync identity, and stays off afterward', async () => {
      await storeRecord();
      const repo = createMemoryRepo();
      const server = createFakeSyncServer();
      const engine = createSyncEngine({ repo, server });
      const stop = vi.spyOn(engine, 'stop');
      const erase = vi.spyOn(repo, 'eraseAll');
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      const sessionStorage = createSessionStorage();
      await saveSyncKey({ key, salt: 'salt', iter: 1000 });
      await saveSyncMeta({ version: 4, lastSyncedAt: '2026-11-07T10:00:00.000Z' });
      await sessionStorage.setItem('auth', 'stored-session');

      await withReload(async (reload) => {
        renderLock(repo);
        await call(() => api.eraseEverything());
        expect(stop).toHaveBeenCalledTimes(1);
        expect(stop.mock.invocationCallOrder[0]).toBeLessThan(erase.mock.invocationCallOrder[0]);
        expect(vi.mocked(clearSyncIdentity).mock.invocationCallOrder[0]).toBeLessThan(erase.mock.invocationCallOrder[0]);
        expect(erase).toHaveBeenCalledTimes(1);
        expect(await loadSyncKey()).toBeNull();
        expect(await loadSyncMeta()).toEqual({ version: 0 });
        expect(await sessionStorage.getItem('auth')).toBeNull();

        await engine.syncNow();
        expect(engine.getState()).toEqual({ status: 'off' });
        expect(server.shared.gets).toBe(0);
        expect(server.shared.pushes).toBe(0);
        expect(reload).toHaveBeenCalledTimes(1);
      });
    });

    // The original bug: Android WebView wrote localStorage late, so after a force-stop the erased record came back.
    it('the next start is open even when an old localStorage copy of the record is still on disk', async () => {
      const old = await storeRecord();
      await withReload(async () => {
        const view = renderLock();
        await call(() => api.eraseEverything());
        view.unmount();
      });
      localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(old));
      resetLockStoreForTests();
      await loadLock();
      renderLock();
      expect(isOpen()).toBe(true);
      expect(api.enabled).toBe(false);
      expect(localStorage.getItem(LOCK_STORAGE_KEY)).toBeNull();
    });

    it('a lock set up after the erase is kept on the next start', async () => {
      await storeRecord();
      await withReload(async () => {
        const view = renderLock();
        await call(() => api.eraseEverything());
        view.unmount();
      });
      // The reload after the erase starts the store afresh.
      resetLockStoreForTests();
      await loadLock();
      const setup = renderLock();
      await call(() => api.setUp('2468', false));
      setup.unmount();
      resetLockStoreForTests();
      await loadLock();
      renderLock();
      expect(isLocked()).toBe(true);
      expect(await call(() => api.unlock('2468'))).toBe('ok');
    });

    it('reloads even when clearing the lock never finishes', async () => {
      await storeRecord();
      vi.mocked(clearLockDb).mockImplementation(() => new Promise(() => {}));
      const repo = createMemoryRepo();
      const erase = vi.spyOn(repo, 'eraseAll');
      await withReload(async (reload) => {
        renderLock(repo);
        await call(() => api.eraseEverything());
        expect(erase).toHaveBeenCalledTimes(1);
        expect(vi.mocked(clearLockDb)).toHaveBeenCalledTimes(1);
        expect(localStorage.getItem(LOCK_STORAGE_KEY)).toBeNull();
        expect(readLock()).toBeNull();
        expect(reload).toHaveBeenCalledTimes(1);
      });
    });

    it('a hung failure-count write does not stop the erase from clearing the lock and reloading', async () => {
      await storeRecord();
      await withReload(async (reload) => {
        renderLock();
        vi.mocked(writeLockDb)
          .mockClear()
          .mockImplementation(() => new Promise(() => {}));
        act(() => {
          void api.verifyPin('0000');
        });
        await vi.waitFor(() => expect(vi.mocked(writeLockDb)).toHaveBeenCalled(), { timeout: 3000 });
        const started = performance.now();
        await call(() => api.eraseEverything());
        expect(performance.now() - started).toBeLessThan(2600);
        expect(localStorage.getItem(LOCK_STORAGE_KEY)).toBeNull();
        expect(readLock()).toBeNull();
        expect(await readLockDb()).toEqual({ initialized: true, record: undefined });
        expect(reload).toHaveBeenCalledTimes(1);
      });
    });

    /**
     * Starts the erase and runs the fake clock in small steps, giving IndexedDB (real macrotasks) a turn after each,
     * until the app reloads or 8 s of fake time have passed: long enough for every capped wait, no more.
     */
    async function eraseWithFakeClock(reload: ReturnType<typeof vi.fn>) {
      // The shared set-up fakes only Date and intervals; installing again needs the real timers back first.
      const now = Date.now();
      vi.useRealTimers();
      vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'], now });
      act(() => {
        void api.eraseEverything();
      });
      for (let step = 0; step < 80 && reload.mock.calls.length === 0; step++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(100);
          await new Promise((resolve) => setImmediate(resolve));
        });
      }
    }

    it('preserves local data and the lock when clearing the sync identity fails', async () => {
      await storeRecord();
      vi.mocked(clearSyncIdentity).mockRejectedValue(new Error('IndexedDB unavailable'));
      const repo = createMemoryRepo();
      const erase = vi.spyOn(repo, 'eraseAll');
      await withReload(async (reload) => {
        renderLock(repo);
        await expect(call(() => api.eraseEverything())).rejects.toThrow('IndexedDB unavailable');
        expect(erase).not.toHaveBeenCalled();
        expect(vi.mocked(clearSyncIdentity)).toHaveBeenCalledTimes(1);
        expect(readLock()).not.toBeNull();
        expect(vi.mocked(clearLockDb)).not.toHaveBeenCalled();
        expect(reload).toHaveBeenCalledTimes(1);
      });
    });

    it('erases and reloads even when stopping the sync run in flight never finishes', async () => {
      await storeRecord();
      const repo = createMemoryRepo();
      const engine = createSyncEngine({ repo, server: createFakeSyncServer() });
      const stop = vi.spyOn(engine, 'stop');
      vi.spyOn(engine, 'whenIdle').mockReturnValue(new Promise(() => {}));
      const erase = vi.spyOn(repo, 'eraseAll');
      await withReload(async (reload) => {
        renderLock(repo);
        await eraseWithFakeClock(reload);
        expect(stop).toHaveBeenCalledTimes(1);
        expect(erase).toHaveBeenCalledTimes(1);
        expect(stop.mock.invocationCallOrder[0]).toBeLessThan(erase.mock.invocationCallOrder[0]);
        expect(readLock()).toBeNull();
        expect(reload).toHaveBeenCalledTimes(1);
      });
    });

    it('reloads even when clearing the lock fails', async () => {
      await storeRecord();
      vi.mocked(clearLockDb).mockRejectedValue(new Error('aborted'));
      await withReload(async (reload) => {
        renderLock();
        await call(() => api.eraseEverything());
        expect(vi.mocked(clearLockDb)).toHaveBeenCalledTimes(1);
        expect(reload).toHaveBeenCalledTimes(1);
      });
    });
  });

  it('caps a wait stored while the clock was far ahead at 15 minutes from now', async () => {
    await storeRecord({ failures: 7, blockedUntil: Date.now() + 10 * 86400000 });
    renderLock();
    expect(api.waitMs).toBe(900000);
    await call(() => readLockFresh());
    expect((await stored())!.blockedUntil).toBe(Date.now() + 900000);
    expect(await call(() => api.unlock('1357'))).toBe('blocked');
    act(() => vi.advanceTimersByTime(900000));
    expect(api.waitMs).toBe(0);
    expect(await call(() => api.unlock('1357'))).toBe('ok');
  });

  it('caps the wait when the clock moves back during a wait', async () => {
    await storeRecord({ failures: 5, blockedUntil: Date.now() + 30000 });
    renderLock();
    vi.setSystemTime(Date.now() - 86400000);
    expect(await call(() => api.unlock('1357'))).toBe('blocked');
    expect(api.waitMs).toBe(900000);
    await call(() => readLockFresh());
    expect((await stored())!.blockedUntil).toBe(Date.now() + 900000);
    act(() => vi.advanceTimersByTime(900000));
    expect(await call(() => api.unlock('1357'))).toBe('ok');
  });

  it('stays locked and returns false when the biometric prompt fails', async () => {
    vi.mocked(verifyBiometric).mockResolvedValueOnce(false);
    await storeRecord({ biometric: true });
    renderLock();
    expect(await call(() => api.unlockWithBiometric())).toBe(false);
    expect(isLocked()).toBe(true);
  });

  it('a repeated return to the foreground does not lock again', async () => {
    await storeRecord({ autoLockMs: 0 });
    renderLock();
    act(() => fg.cb!(false));
    act(() => fg.cb!(true));
    await call(() => api.unlock('1357'));
    act(() => fg.cb!(true));
    act(() => fg.cb!(true));
    expect(isOpen()).toBe(true);
  });

  it('changePin while open keeps the app open and does not touch recovery state', async () => {
    await storeRecord();
    renderLock();
    await call(() => api.unlock('1357'));
    const code = await call(() => api.changePin('2468'));
    expect(isOpen()).toBe(true);
    expect(api.recovered).toBe(false);
    expect(await call(() => api.recover(code))).toBe('ok');
  });

  it('changePin started while open does not unlock or apply if the app locks meanwhile', async () => {
    await storeRecord();
    renderLock();
    await call(() => api.unlock('1357'));
    let pending!: Promise<string>;
    act(() => {
      pending = api.changePin('2468');
    });
    act(() => fg.cb!(false));
    act(() => vi.advanceTimersByTime(61000));
    act(() => fg.cb!(true));
    expect(isLocked()).toBe(true);
    await act(async () => {
      await expect(pending).rejects.toThrow();
    });
    expect(isLocked()).toBe(true);
    expect(await call(() => api.verifyPin('1357'))).toBe('ok');
    expect(await call(() => api.recover(CODE))).toBe('ok');
  });

  it('serializes a double tap on changePin so the last returned code is the valid one', async () => {
    await storeRecord();
    renderLock();
    await call(() => api.recover(CODE));
    const [first, second] = await call(() => Promise.all([api.changePin('2468'), api.changePin('8642')]));
    expect(first).not.toBe(second);
    expect(await call(() => api.verifyPin('8642'))).toBe('ok');
    expect(await call(() => api.recover(second))).toBe('ok');
    expect(await call(() => api.recover(first))).toBe('wrong');
  });

  it('turnOff and setUp queued behind a running check apply after it, and the new lock starts clean', async () => {
    await storeRecord();
    renderLock();
    await call(() => api.unlock('1357'));
    let check!: Promise<string>;
    let setUp!: Promise<string>;
    let off!: Promise<boolean>;
    act(() => {
      check = api.verifyPin('0000');
      off = api.turnOff();
      setUp = api.setUp('2468', false);
    });
    expect(await call(() => off)).toBe(true);
    expect(await call(() => check)).toBe('wrong');
    await call(() => setUp);
    expect(await stored()).toMatchObject({ failures: 0, blockedUntil: 0 });
    expect(await call(() => api.verifyPin('2468'))).toBe('ok');
  });

  it('turnOff and settings changes do nothing while locked, even after recovery', async () => {
    const before = await storeRecord();
    renderLock();
    expect(await call(() => api.turnOff())).toBe(false);
    expect(await call(() => api.setAutoLockMs(0))).toBe(false);
    expect(await call(() => api.setBiometric(true))).toBe(false);
    expect(await stored()).toEqual(before);
    expect(readLock()).toEqual(before);
    expect(isLocked()).toBe(true);

    await call(() => api.recover(CODE));
    expect(await call(() => api.turnOff())).toBe(false);
    expect(await call(() => api.setAutoLockMs(0))).toBe(false);
    expect(await stored()).toMatchObject({ autoLockMs: 60000 });
    expect(isLocked()).toBe(true);
  });

  it('adopts a newer record written by another tab instead of writing the old one back', async () => {
    await storeRecord();
    renderLock();
    const other: LockRecord = {
      v: 1,
      pin: await hashSecret('2468', 1000),
      recovery: await hashSecret(normalizeRecoveryCode('ZZZZ-ZZZZ-ZZZZ'), 1000),
      biometric: false,
      autoLockMs: 300000,
      failures: 2,
      blockedUntil: 0,
    };
    await writeLockDb(other);
    expect(await call(() => api.unlock('0000'))).toBe('wrong');
    expect(await stored()).toMatchObject({ pin: other.pin, recovery: other.recovery, autoLockMs: 300000, failures: 3 });
    expect(await call(() => api.unlock('1357'))).toBe('wrong');
    expect(await call(() => api.unlock('2468'))).toBe('ok');
    expect(await stored()).toMatchObject({ pin: other.pin, failures: 0 });
  });

  it("adopts another tab's record before a settings change", async () => {
    const mine = await storeRecord();
    renderLock();
    await call(() => api.unlock('1357'));
    const otherPin = await hashSecret('2468', 1000);
    await writeLockDb({ ...mine, pin: otherPin });
    expect(await call(() => api.setBiometric(true))).toBe(true);
    expect(await stored()).toMatchObject({ pin: otherPin, biometric: true });
  });

  it('a check whose record another tab replaces while it runs returns wrong without counting', async () => {
    await storeRecord();
    renderLock();
    const otherPin = await hashSecret('2468', 1000);
    const derive = crypto.subtle.deriveBits.bind(crypto.subtle);
    vi.spyOn(crypto.subtle, 'deriveBits').mockImplementationOnce(async (...args) => {
      await writeLockDb({ ...(await stored())!, pin: otherPin });
      return derive(...args);
    });
    expect(await call(() => api.verifyPin('1357'))).toBe('wrong');
    expect(await stored()).toMatchObject({ pin: otherPin, failures: 0 });
  });

  it('keeps the lock on when a storage read returns nothing', async () => {
    await storeRecord();
    renderLock();
    vi.mocked(readLockDb).mockResolvedValue({ initialized: true, record: undefined });
    expect(await call(() => api.unlock('0000'))).toBe('wrong');
    expect(api.enabled).toBe(true);
    expect(isLocked()).toBe(true);
    expect(await call(() => api.turnOff())).toBe(false);
    expect(api.enabled).toBe(true);
    expect(await call(() => api.unlock('1357'))).toBe('ok');
    expect(await call(() => api.setAutoLockMs(0))).toBe(true);
    expect(api.enabled).toBe(true);
    expect(api.record?.autoLockMs).toBe(0);
  });

  it('reports a damaged record once, even under StrictMode', async () => {
    localStorage.setItem(LOCK_STORAGE_KEY, '{"v":1,"pin":');
    await loadLock();
    const first = render(
      <StrictMode>
        <RepoProvider repo={createMemoryRepo()}>
          <LockProvider screen={Stub}>
            <Capture />
            <Child />
          </LockProvider>
        </RepoProvider>
      </StrictMode>,
    );
    expect(api.resetNotice).toBe(true);
    expect(api.enabled).toBe(false);
    expect(isOpen()).toBe(true);
    first.unmount();

    renderLock();
    expect(api.resetNotice).toBe(false);
  });
});
