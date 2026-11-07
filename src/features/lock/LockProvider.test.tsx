import { StrictMode, useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RepoProvider } from '../../db/RepoContext';
import { createMemoryRepo } from '../../db/memoryRepo';
import { LockProvider, useLock, type LockApi } from './LockProvider';
import { LOCK_STORAGE_KEY, consumeResetNotice, readLock, writeLock, type LockRecord } from './lockStore';
import { hashSecret, normalizeRecoveryCode } from './pin';

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

  it('treats a record that cannot be verified as a wrong PIN', async () => {
    await storeRecord({ pin: { salt: '!!not base64!!', hash: '%%%', iter: 1000 } });
    renderLock();
    expect(await call(() => api.unlock('1357'))).toBe('wrong');
    expect(isLocked()).toBe(true);
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

    it('locks on every return when set to immediately', async () => {
      await openWith(0);
      act(() => fg.cb!(false));
      act(() => fg.cb!(true));
      expect(isLocked()).toBe(true);
    });

    it('never locks when the page is never backgrounded', async () => {
      await openWith(0);
      act(() => vi.advanceTimersByTime(30 * 60000));
      act(() => fg.cb!(true));
      expect(isOpen()).toBe(true);
    });
  });

  it('recovers with the right code, then a new PIN unlocks and replaces the code', async () => {
    await storeRecord();
    renderLock();
    expect(await call(() => api.recover('abcd efgh jkmn'))).toBe('ok');
    expect(api.recovered).toBe(true);
    expect(isLocked()).toBe(true);

    const code = await call(() => api.changePin('2468'));
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(code).not.toBe(CODE);
    expect(isOpen()).toBe(true);
    expect(api.recovered).toBe(false);

    expect(await call(() => api.recover(CODE))).toBe('wrong');
    expect(await call(() => api.verifyPin('2468'))).toBe('ok');
    expect(await call(() => api.verifyPin('1357'))).toBe('wrong');
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

  it('turnOff removes the record and unlocks', async () => {
    await storeRecord();
    renderLock();
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
