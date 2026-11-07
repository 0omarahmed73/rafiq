import { StrictMode, useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RepoProvider } from '../../db/RepoContext';
import { createMemoryRepo } from '../../db/memoryRepo';
import { LockProvider, useLock, type LockApi } from './LockProvider';
import { LOCK_STORAGE_KEY, consumeResetNotice, readLock, writeLock, type LockRecord } from './lockStore';
import { hashSecret, normalizeRecoveryCode } from './pin';
import { verifyBiometric } from '../../platform/biometric';
import { IDBFactory } from 'fake-indexeddb';
import { noteLock, rememberErased, wasErased } from './erasedLocks';

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

// The real erased-lock store, wrapped so tests can wait for its work or make it hang.
vi.mock('./erasedLocks', async (importOriginal) => {
  const real = await importOriginal<typeof import('./erasedLocks')>();
  return {
    noteLock: vi.fn(real.noteLock),
    rememberErased: vi.fn(real.rememberErased),
    wasErased: vi.fn(real.wasErased),
  };
});

/** Every key and value in the erased-lock IndexedDB store, as stored. */
function rawErasedStore(): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('rafiq.lock.erased', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('erased');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const store = db.transaction('erased', 'readonly').objectStore('erased');
      const keys = store.getAllKeys();
      const values = store.getAll();
      values.onsuccess = () => {
        db.close();
        resolve(Object.fromEntries(keys.result.map((k, i) => [String(k), values.result[i]])));
      };
    };
  });
}

function seedErasedStore(lists: Record<string, string[]>): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('rafiq.lock.erased', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('erased');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('erased', 'readwrite');
      for (const [k, v] of Object.entries(lists)) tx.objectStore('erased').put(v, k);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
    };
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
  writeLock(record);
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
  vi.mocked(noteLock).mockClear();
  vi.mocked(rememberErased).mockClear();
  vi.mocked(wasErased).mockClear();
  consumeResetNotice();
  mounts.mockClear();
  effects.mockClear();
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
  vi.setSystemTime(new Date('2026-11-07T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
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
    expect(readLock()?.failures).toBe(1);
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
    const blockedUntil = readLock()!.blockedUntil;
    expect(blockedUntil).toBe(Date.now() + 30000);
    expect(api.waitMs).toBe(30000);

    const derive = vi.spyOn(crypto.subtle, 'deriveBits');
    expect(await call(() => api.unlock('1357'))).toBe('blocked');
    expect(derive).not.toHaveBeenCalled();
    expect(readLock()!.blockedUntil).toBe(blockedUntil);

    act(() => vi.advanceTimersByTime(1000));
    expect(api.waitMs).toBe(29000);
    act(() => vi.advanceTimersByTime(29000));
    expect(api.waitMs).toBe(0);
    expect(vi.getTimerCount()).toBe(0);

    derive.mockRestore();
    expect(await call(() => api.unlock('1357'))).toBe('ok');
    expect(isOpen()).toBe(true);
    expect(readLock()).toMatchObject({ failures: 0, blockedUntil: 0 });
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
    expect(readLock()?.failures).toBe(5);
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
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(await call(() => api.unlock('0000'))).toBe('wrong');
    expect(api.record?.failures).toBe(1);
    expect(await call(() => api.unlock('1357'))).toBe('ok');
    expect(isOpen()).toBe(true);
    expect(api.record?.failures).toBe(0);
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
    expect(readLock()?.failures).toBe(5);
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
    expect(readLock()).toMatchObject({ biometric: true, autoLockMs: 60000, failures: 0, blockedUntil: 0 });
    expect(await call(() => api.verifyPin('٢٤٦٨'))).toBe('ok');
  });

  it('setUp throws and stays off when storage fails', async () => {
    renderLock();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    await expect(call(() => api.setUp('2468', false))).rejects.toThrow();
    expect(api.enabled).toBe(false);
  });

  it('changes the auto-lock time and the biometric choice', async () => {
    await storeRecord();
    renderLock();
    await call(() => api.unlock('1357'));
    act(() => api.setAutoLockMs(300000));
    act(() => api.setBiometric(true));
    expect(readLock()).toMatchObject({ autoLockMs: 300000, biometric: true });
    expect(api.record).toMatchObject({ autoLockMs: 300000, biometric: true });
  });

  it('turnOff while open removes the record', async () => {
    await storeRecord();
    renderLock();
    await call(() => api.unlock('1357'));
    act(() => api.turnOff());
    expect(readLock()).toBeNull();
    expect(api.enabled).toBe(false);
    expect(isOpen()).toBe(true);
  });

  it('eraseEverything erases the repo, clears the record and reloads', async () => {
    await storeRecord();
    const repo = createMemoryRepo();
    const erase = vi.spyOn(repo, 'eraseAll');
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, reload } });
    try {
      renderLock(repo);
      await call(() => api.eraseEverything());
      expect(erase).toHaveBeenCalledTimes(1);
      expect(readLock()).toBeNull();
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original });
    }
  });

  describe('after an erase whose localStorage removal never reached the disk', () => {
    // Android WebView commits localStorage to disk late, so a force-stop soon after an erase can bring the old
    // record back. These tests put it back by hand, then cold start.
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

    /** Waits until every noteLock and start-up check the provider began has finished. */
    async function settle() {
      await act(async () => {
        await Promise.all([
          ...vi.mocked(noteLock).mock.results.map((r) => r.value),
          ...vi.mocked(wasErased).mock.results.map((r) => r.value),
        ]);
      });
    }

    async function eraseThenLoseTheRemoval(): Promise<{ old: LockRecord; reload: ReturnType<typeof vi.fn> }> {
      const old = await storeRecord();
      let reload!: ReturnType<typeof vi.fn>;
      await withReload(async (r) => {
        reload = r;
        const view = renderLock();
        await settle();
        await call(() => api.eraseEverything());
        expect(readLock()).toBeNull();
        view.unmount();
      });
      writeLock(old);
      return { old, reload };
    }

    it('the next start treats the erased record as no lock and removes it again', async () => {
      const { reload } = await eraseThenLoseTheRemoval();
      expect(reload).toHaveBeenCalledTimes(1);
      renderLock();
      await vi.waitFor(() => expect(isOpen()).toBe(true));
      expect(api.enabled).toBe(false);
      expect(localStorage.getItem(LOCK_STORAGE_KEY)).toBeNull();
    });

    it('an older PIN still on disk (changed but never written out) also counts as erased', async () => {
      const older = await storeRecord();
      await withReload(async () => {
        const view = renderLock();
        await settle();
        await call(() => api.unlock('1357'));
        await call(() => api.changePin('2468'));
        expect(readLock()!.pin.salt).not.toBe(older.pin.salt);
        await call(() => api.eraseEverything());
        view.unmount();
      });
      writeLock(older);
      renderLock();
      await vi.waitFor(() => expect(isOpen()).toBe(true));
      expect(localStorage.getItem(LOCK_STORAGE_KEY)).toBeNull();
    });

    it('a lock set up after the erase is kept', async () => {
      await eraseThenLoseTheRemoval();
      localStorage.clear();
      await storeRecord();
      vi.mocked(wasErased).mockClear();
      renderLock();
      expect(isLocked()).toBe(true);
      expect(wasErased).toHaveBeenCalledTimes(1);
      await settle();
      expect(isLocked()).toBe(true);
      expect(readLock()).not.toBeNull();
    });

    it('stores only salts, never a PIN or recovery hash', async () => {
      const first = await storeRecord();
      await withReload(async () => {
        renderLock();
        await settle();
        await call(() => api.unlock('1357'));
        await call(() => api.changePin('2468'));
        await settle();
        const second = readLock()!;
        await call(() => api.eraseEverything());
        const stored = await rawErasedStore();
        const raw = JSON.stringify(stored);
        for (const rec of [first, second]) {
          expect(raw).not.toContain(rec.pin.hash);
          expect(raw).not.toContain(rec.recovery.hash);
          expect(raw).toContain(rec.pin.salt);
        }
        for (const list of Object.values(stored)) {
          for (const entry of list as string[]) expect(entry).not.toContain(':');
        }
      });
    });

    it('reads a legacy salt:hash entry as its salt and rewrites the lists as salts', async () => {
      const old = await storeRecord();
      const legacy = `${old.pin.salt}:${old.pin.hash}`;
      await seedErasedStore({ pins: [legacy], seen: [legacy] });
      await withReload(async () => {
        renderLock();
        await vi.waitFor(() => expect(isOpen()).toBe(true));
        expect(localStorage.getItem(LOCK_STORAGE_KEY)).toBeNull();
        await settle();
        await call(() => api.eraseEverything());
      });
      const raw = await rawErasedStore();
      expect(raw).toEqual({ pins: [old.pin.salt], seen: [old.pin.salt] });
    });

    it('clears the lock and reloads even when marking the erase never finishes', async () => {
      await storeRecord();
      vi.mocked(rememberErased).mockImplementationOnce(() => new Promise(() => {}));
      await withReload(async (reload) => {
        renderLock();
        await call(() => api.eraseEverything());
        expect(readLock()).toBeNull();
        expect(reload).toHaveBeenCalledTimes(1);
      });
    });

    it('erases and reloads even when the erased-lock store cannot be opened', async () => {
      await storeRecord();
      vi.spyOn(indexedDB, 'open').mockImplementation(() => {
        throw new Error('no indexedDB');
      });
      await withReload(async (reload) => {
        renderLock();
        await call(() => api.eraseEverything());
        expect(readLock()).toBeNull();
        expect(reload).toHaveBeenCalledTimes(1);
      });
    });
  });

  it('caps a wait stored while the clock was far ahead at 15 minutes from now', async () => {
    await storeRecord({ failures: 7, blockedUntil: Date.now() + 10 * 86400000 });
    renderLock();
    expect(api.waitMs).toBe(900000);
    expect(readLock()!.blockedUntil).toBe(Date.now() + 900000);
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
    expect(readLock()!.blockedUntil).toBe(Date.now() + 900000);
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

  it('a check whose record is replaced while it runs returns wrong without counting', async () => {
    await storeRecord();
    renderLock();
    await call(() => api.unlock('1357'));
    let check!: Promise<string>;
    let setUp!: Promise<string>;
    act(() => {
      check = api.verifyPin('0000');
      api.turnOff();
      setUp = api.setUp('2468', false);
    });
    expect(await call(() => check)).toBe('wrong');
    await call(() => setUp);
    expect(readLock()).toMatchObject({ failures: 0, blockedUntil: 0 });
    expect(await call(() => api.verifyPin('2468'))).toBe('ok');
  });

  it('turnOff and settings changes do nothing while locked, even after recovery', async () => {
    const stored = await storeRecord();
    renderLock();
    act(() => api.turnOff());
    act(() => api.setAutoLockMs(0));
    act(() => api.setBiometric(true));
    expect(readLock()).toEqual(stored);
    expect(isLocked()).toBe(true);

    await call(() => api.recover(CODE));
    act(() => api.turnOff());
    act(() => api.setAutoLockMs(0));
    expect(readLock()).toMatchObject({ autoLockMs: 60000 });
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
    writeLock(other);
    expect(await call(() => api.unlock('0000'))).toBe('wrong');
    expect(readLock()).toMatchObject({ pin: other.pin, recovery: other.recovery, autoLockMs: 300000, failures: 3 });
    expect(await call(() => api.unlock('1357'))).toBe('wrong');
    expect(await call(() => api.unlock('2468'))).toBe('ok');
    expect(readLock()).toMatchObject({ pin: other.pin, failures: 0 });
  });

  it('adopts another tab\'s record before a settings change', async () => {
    const mine = await storeRecord();
    renderLock();
    await call(() => api.unlock('1357'));
    const otherPin = await hashSecret('2468', 1000);
    writeLock({ ...mine, pin: otherPin });
    act(() => api.setBiometric(true));
    expect(readLock()).toMatchObject({ pin: otherPin, biometric: true });
  });

  it('a check whose record another tab replaces while it runs returns wrong without counting', async () => {
    await storeRecord();
    renderLock();
    const otherPin = await hashSecret('2468', 1000);
    const derive = crypto.subtle.deriveBits.bind(crypto.subtle);
    vi.spyOn(crypto.subtle, 'deriveBits').mockImplementationOnce(async (...args) => {
      writeLock({ ...readLock()!, pin: otherPin });
      return derive(...args);
    });
    expect(await call(() => api.verifyPin('1357'))).toBe('wrong');
    expect(readLock()).toMatchObject({ pin: otherPin, failures: 0 });
  });

  it('keeps the lock on when a storage read returns nothing', async () => {
    await storeRecord();
    renderLock();
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    expect(await call(() => api.unlock('0000'))).toBe('wrong');
    expect(api.enabled).toBe(true);
    expect(isLocked()).toBe(true);
    act(() => api.turnOff());
    expect(api.enabled).toBe(true);
    expect(await call(() => api.unlock('1357'))).toBe('ok');
    act(() => api.setAutoLockMs(0));
    expect(api.enabled).toBe(true);
    expect(api.record?.autoLockMs).toBe(0);
  });

  it('reports a damaged record once, even under StrictMode', () => {
    localStorage.setItem(LOCK_STORAGE_KEY, '{"v":1,"pin":');
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
