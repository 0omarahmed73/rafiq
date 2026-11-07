import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { useRepo } from '../../db/RepoContext';
import { t } from '../../i18n';
import { onForegroundChange } from '../../platform/appState';
import { verifyBiometric } from '../../platform/biometric';
import {
  AUTO_LOCK_OPTIONS,
  DEFAULT_AUTO_LOCK_MS,
  clampBlock,
  clearLock,
  consumeResetNotice,
  readLock,
  recordFailure,
  recordSuccess,
  remainingWaitMs,
  writeLock,
  type LockRecord,
} from './lockStore';
import { noteLock, rememberErased, wasErased } from './erasedLocks';
import {
  generateRecoveryCode,
  hashSecret,
  isValidPin,
  normalizeDigits,
  normalizeRecoveryCode,
  verifySecret,
  waitMs as waitForFailures,
  type SecretRecord,
} from './pin';

export type VerifyResult = 'ok' | 'wrong' | 'blocked';

export interface LockApi {
  enabled: boolean;
  locked: boolean;
  record: LockRecord | null;
  resetNotice: boolean;
  waitMs: number;
  verifyPin(pin: string): Promise<VerifyResult>;
  unlock(pin: string): Promise<VerifyResult>;
  unlockWithBiometric(): Promise<boolean>;
  recover(code: string): Promise<VerifyResult>;
  recovered: boolean;
  /** After a new PIN was saved on the recovery path: opens the app and clears `recovered`. */
  finishRecovery(): void;
  setUp(pin: string, biometric: boolean): Promise<string>;
  changePin(pin: string): Promise<string>;
  setAutoLockMs(ms: number): void;
  setBiometric(on: boolean): void;
  /** While true (a recovery code is on screen), leaving and returning to the app does not lock it. */
  setAutoLockPaused(paused: boolean): void;
  turnOff(): void;
  eraseEverything(): Promise<void>;
}

const LockContext = createContext<LockApi | null>(null);

// The damaged-record notice is consumed from lockStore once and held here, so StrictMode's double
// state initialisation (whose second result may be the one kept) still sees it. Cleared after mount.
let pendingResetNotice = false;
function takeResetNotice(): boolean {
  if (consumeResetNotice()) pendingResetNotice = true;
  return pendingResetNotice;
}

/** Persists with lockStore's helper; when storage throws, keeps the same change in memory only. */
function persistOr(write: () => LockRecord, fallback: LockRecord): LockRecord {
  try {
    return write();
  } catch {
    return fallback;
  }
}

async function safeVerify(secret: string, rec: SecretRecord): Promise<boolean> {
  try {
    return await verifySecret(secret, rec);
  } catch {
    return false;
  }
}

function newPin(pin: string): string {
  const normalized = normalizeDigits(pin);
  if (!isValidPin(normalized)) throw new Error('The PIN must be 4 to 6 digits.');
  return normalized;
}

/** Clamps a far-away blockedUntil to the longest wait from now and tries to persist the clamped value. */
function clampAndPersist(record: LockRecord, now: number): LockRecord {
  const clamped = clampBlock(record, now);
  if (clamped !== record) {
    try {
      writeLock(clamped);
    } catch {
      // storage unavailable: the clamp still applies in memory
    }
  }
  return clamped;
}

function sameSecret(a: SecretRecord, b: SecretRecord): boolean {
  return a.salt === b.salt && a.hash === b.hash && a.iter === b.iter;
}

function sameRecord(a: LockRecord, b: LockRecord): boolean {
  return (
    sameSecret(a.pin, b.pin) &&
    sameSecret(a.recovery, b.recovery) &&
    a.biometric === b.biometric &&
    a.autoLockMs === b.autoLockMs &&
    a.failures === b.failures &&
    a.blockedUntil === b.blockedUntil
  );
}

/** Wall-clock and monotonic stamps of one moment, so a clock moved back cannot shorten the time away. */
function stamp(): { wall: number; mono: number } {
  return { wall: Date.now(), mono: performance.now() };
}

function readClamped(): LockRecord | null {
  const record = readLock();
  return record ? clampAndPersist(record, Date.now()) : null;
}

/** Longest wait for the durable erase mark before the lock is cleared and the app reloads anyway. */
const ERASE_MARK_TIMEOUT_MS = 1500;

const NullScreen: ComponentType = () => null;

export function LockProvider({
  children,
  screen: Screen = NullScreen,
}: {
  children: ReactNode;
  screen?: ComponentType;
}) {
  const repo = useRepo();
  const [initial] = useState(() => ({
    record: readClamped(),
    notice: takeResetNotice(),
  }));
  const [record, setRecordState] = useState<LockRecord | null>(initial.record);
  const [locked, setLocked] = useState(initial.record !== null);
  const [recovered, setRecovered] = useState(false);
  const [, setTick] = useState(0);

  const recordRef = useRef(record);
  const lockedRef = useRef(locked);
  const recoveredRef = useRef(recovered);
  /** True once a new PIN has been saved on the recovery path; finishRecovery needs it. */
  const recoveryPinSaved = useRef(false);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const hiddenAt = useRef<{ wall: number; mono: number } | null>(null);
  /** Whether the app is in the background right now, tracked even while auto-lock is paused. */
  const isHidden = useRef(typeof document !== 'undefined' && document.hidden);
  const autoLockPaused = useRef(false);

  const setRecord = useCallback((next: LockRecord | null) => {
    recordRef.current = next;
    setRecordState(next);
  }, []);
  const setLockedBoth = useCallback((next: boolean) => {
    lockedRef.current = next;
    setLocked(next);
  }, []);
  const setRecoveredBoth = useCallback((next: boolean) => {
    recoveredRef.current = next;
    if (!next) recoveryPinSaved.current = false;
    setRecovered(next);
  }, []);

  useEffect(() => {
    pendingResetNotice = false;
  }, []);

  // A record that an earlier erase removed can come back from disk (see erasedLocks); it is no lock.
  useEffect(() => {
    const start = initial.record;
    if (!start) return;
    let live = true;
    void wasErased(start).then((erased) => {
      const current = recordRef.current;
      if (!live || !erased || !current || !sameSecret(current.pin, start.pin)) return;
      clearLock();
      setRecord(null);
      setRecoveredBoth(false);
      setLockedBoth(false);
    });
    return () => {
      live = false;
    };
  }, [initial.record, setRecord, setLockedBoth, setRecoveredBoth]);

  // Every PIN held here is noted durably (by its salt only), so an erase also covers an older PIN still on disk.
  const pinKey = record ? record.pin.salt : null;
  useEffect(() => {
    if (pinKey && recordRef.current) void noteLock(recordRef.current);
  }, [pinKey]);

  /**
   * Adopts the stored record when it is valid and differs from memory (another tab changed it), so this tab
   * never writes an old PIN or recovery back over a newer one. A read that finds nothing keeps the in-memory
   * record: a transient storage failure must never turn the lock off.
   */
  const syncFromStorage = useCallback((): LockRecord | null => {
    const stored = readLock();
    const mine = recordRef.current;
    if (stored && (!mine || !sameRecord(stored, mine))) {
      setRecord(stored);
      return stored;
    }
    return mine;
  }, [setRecord]);

  /** The current record with blockedUntil clamped (and stored) so a block never lasts past the longest wait. */
  const currentClamped = useCallback((): LockRecord | null => {
    const rec = recordRef.current;
    if (!rec) return null;
    const clamped = clampAndPersist(rec, Date.now());
    if (clamped !== rec) setRecord(clamped);
    return clamped;
  }, [setRecord]);

  /** Runs tasks one at a time: PIN and recovery checks and PIN changes share this queue. */
  const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const result = chain.current.then(task, task);
    chain.current = result.catch(() => undefined);
    return result;
  }, []);

  // Auto-lock: remember when the app left the foreground (in memory only) and lock on return when
  // at least autoLockMs has passed.
  useEffect(
    () =>
      onForegroundChange((active) => {
        if (!active) {
          isHidden.current = true;
          if (hiddenAt.current === null && !autoLockPaused.current) hiddenAt.current = stamp();
          return;
        }
        isHidden.current = false;
        const since = hiddenAt.current;
        hiddenAt.current = null;
        if (autoLockPaused.current) return;
        const current = recordRef.current;
        if (since === null || !current || lockedRef.current) return;
        const now = stamp();
        const wall = now.wall - since.wall;
        // A wall clock moved back counts as past the timeout; otherwise the longer of the two clocks wins.
        if (wall < 0 || Math.max(wall, now.mono - since.mono) >= current.autoLockMs) {
          setRecoveredBoth(false);
          setLockedBoth(true);
        }
      }),
    [setLockedBoth, setRecoveredBoth],
  );

  const blockedUntil = record?.blockedUntil ?? 0;
  const waitMs = record ? remainingWaitMs(record, Date.now()) : 0;

  // Re-render once a second while a wait is running, and stop when it reaches zero.
  useEffect(() => {
    if (blockedUntil <= Date.now()) return;
    const id = setInterval(() => {
      currentClamped();
      setTick((n) => n + 1);
      if (Date.now() >= blockedUntil) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [blockedUntil, currentClamped]);

  /** Runs one check at a time against the stored counter; while blocked, hashes nothing and changes nothing. */
  const check = useCallback(
    (secret: string, pick: (rec: LockRecord) => SecretRecord): Promise<VerifyResult> => {
      const run = async (): Promise<VerifyResult> => {
        syncFromStorage();
        const rec = currentClamped();
        if (!rec) return 'wrong';
        if (remainingWaitMs(rec, Date.now()) > 0) return 'blocked';
        const target = pick(rec);
        const ok = await safeVerify(secret, target);
        const latest = syncFromStorage();
        if (!latest || !sameSecret(pick(latest), target)) return 'wrong';
        if (ok) {
          setRecord(
            persistOr(() => recordSuccess(latest), {
              ...latest,
              failures: 0,
              blockedUntil: 0,
            }),
          );
          return 'ok';
        }
        const now = Date.now();
        const failures = latest.failures + 1;
        setRecord(
          persistOr(() => recordFailure(latest, now), {
            ...latest,
            failures,
            blockedUntil: now + waitForFailures(failures),
          }),
        );
        return 'wrong';
      };
      return enqueue(run);
    },
    [setRecord, syncFromStorage, currentClamped, enqueue],
  );

  const verifyPin = useCallback((pin: string) => check(normalizeDigits(pin), (rec) => rec.pin), [check]);

  const unlock = useCallback(
    async (pin: string) => {
      const result = await verifyPin(pin);
      if (result === 'ok') {
        setRecoveredBoth(false);
        setLockedBoth(false);
      }
      return result;
    },
    [verifyPin, setLockedBoth, setRecoveredBoth],
  );

  // Biometrics work during a PIN wait and reset the failure count; the device's own biometric throttling applies.
  const unlockWithBiometric = useCallback(async () => {
    if (!recordRef.current?.biometric) return false;
    const ok = await verifyBiometric(t({ ar: 'افتح رفيق', en: 'Unlock Rafiq' }));
    const latest = recordRef.current;
    if (!ok || !latest) return false;
    setRecord(
      persistOr(() => recordSuccess(latest), {
        ...latest,
        failures: 0,
        blockedUntil: 0,
      }),
    );
    setRecoveredBoth(false);
    setLockedBoth(false);
    return true;
  }, [setRecord, setLockedBoth, setRecoveredBoth]);

  const recover = useCallback(
    async (code: string) => {
      const result = await check(normalizeRecoveryCode(code), (rec) => rec.recovery);
      if (result === 'ok') setRecoveredBoth(true);
      return result;
    },
    [check, setRecoveredBoth],
  );

  const setUp = useCallback(
    (pin: string, biometric: boolean) =>
      enqueue(async () => {
        const normalized = newPin(pin);
        if (syncFromStorage()) throw new Error('The lock is already on.');
        const code = generateRecoveryCode();
        const next: LockRecord = {
          v: 1,
          pin: await hashSecret(normalized),
          recovery: await hashSecret(normalizeRecoveryCode(code)),
          biometric,
          autoLockMs: DEFAULT_AUTO_LOCK_MS,
          failures: 0,
          blockedUntil: 0,
        };
        if (syncFromStorage()) throw new Error('The lock is already on.');
        writeLock(next);
        setRecord(next);
        setRecoveredBoth(false);
        setLockedBoth(false);
        return code;
      }),
    [enqueue, syncFromStorage, setRecord, setLockedBoth, setRecoveredBoth],
  );

  const changePin = useCallback(
    (pin: string) =>
      enqueue(async () => {
        const normalized = newPin(pin);
        if (!syncFromStorage()) throw new Error('The lock is off.');
        if (lockedRef.current && !recoveredRef.current) throw new Error('Unlock or recover before changing the PIN.');
        // Recovery path: locked with a recovered code; it stays locked so the new code can be shown, and
        // finishRecovery opens the app. Settings path: open; it changes nothing else.
        const viaRecovery = lockedRef.current;
        const code = generateRecoveryCode();
        const pinHash = await hashSecret(normalized);
        const recoveryHash = await hashSecret(normalizeRecoveryCode(code));
        const current = syncFromStorage();
        if (!current) throw new Error('The lock is off.');
        const stillAllowed = viaRecovery ? lockedRef.current && recoveredRef.current : !lockedRef.current;
        if (!stillAllowed) throw new Error('The lock state changed while the PIN was being changed.');
        const next: LockRecord = {
          ...current,
          pin: pinHash,
          recovery: recoveryHash,
          failures: 0,
          blockedUntil: 0,
        };
        writeLock(next);
        setRecord(next);
        if (viaRecovery) recoveryPinSaved.current = true;
        return code;
      }),
    [enqueue, syncFromStorage, setRecord],
  );

  const finishRecovery = useCallback(() => {
    if (!lockedRef.current || !recoveredRef.current || !recoveryPinSaved.current) return;
    setRecoveredBoth(false);
    setLockedBoth(false);
  }, [setLockedBoth, setRecoveredBoth]);

  const update = useCallback(
    (change: Partial<LockRecord>) => {
      if (lockedRef.current) return;
      const current = syncFromStorage();
      if (!current) return;
      const next = { ...current, ...change };
      try {
        writeLock(next);
      } catch {
        // storage unavailable: keep the choice for this session
      }
      setRecord(next);
    },
    [syncFromStorage, setRecord],
  );

  const setAutoLockMs = useCallback(
    (ms: number) => {
      if (!(AUTO_LOCK_OPTIONS as readonly number[]).includes(ms)) return;
      update({ autoLockMs: ms });
    },
    [update],
  );

  const setBiometric = useCallback((on: boolean) => update({ biometric: on }), [update]);

  // Pausing forgets any background time. Releasing while visible forgets it too; releasing while hidden
  // (the card unmounted in the background) starts the time away from the release, so the timeout still applies.
  const setAutoLockPaused = useCallback((paused: boolean) => {
    autoLockPaused.current = paused;
    hiddenAt.current = !paused && isHidden.current ? stamp() : null;
  }, []);

  const turnOff = useCallback(() => {
    if (lockedRef.current) return;
    syncFromStorage();
    clearLock();
    setRecord(null);
    setRecoveredBoth(false);
    setLockedBoth(false);
  }, [syncFromStorage, setRecord, setLockedBoth, setRecoveredBoth]);

  const eraseEverything = useCallback(async () => {
    await repo.eraseAll();
    // Durably mark the record erased before removing it: on Android the localStorage removal may never reach the
    // disk before a force-stop (see erasedLocks). Only the erase is covered this way; any other lock write
    // (set-up, PIN change, turning off, failure count) can still be lost on a force-stop, and moving the record
    // to durable storage is an open owner decision recorded in HANDOFF. The wait is capped so that, with the
    // data already gone, the lock is always cleared and the app reloads even if IndexedDB hangs.
    const erased = [recordRef.current, readLock()].filter((r): r is LockRecord => r !== null);
    await Promise.race([
      rememberErased(erased),
      new Promise<void>((resolve) => setTimeout(resolve, ERASE_MARK_TIMEOUT_MS)),
    ]);
    clearLock();
    window.location.reload();
  }, [repo]);

  const enabled = record !== null;
  const isLocked = enabled && locked;

  const api = useMemo<LockApi>(
    () => ({
      enabled,
      locked: isLocked,
      record,
      resetNotice: initial.notice,
      waitMs,
      verifyPin,
      unlock,
      unlockWithBiometric,
      recover,
      recovered,
      finishRecovery,
      setUp,
      changePin,
      setAutoLockMs,
      setBiometric,
      setAutoLockPaused,
      turnOff,
      eraseEverything,
    }),
    [
      enabled,
      isLocked,
      record,
      initial.notice,
      waitMs,
      verifyPin,
      unlock,
      unlockWithBiometric,
      recover,
      recovered,
      finishRecovery,
      setUp,
      changePin,
      setAutoLockMs,
      setBiometric,
      setAutoLockPaused,
      turnOff,
      eraseEverything,
    ],
  );

  return <LockContext.Provider value={api}>{isLocked ? <Screen /> : children}</LockContext.Provider>;
}

export function useLock(): LockApi {
  const api = useContext(LockContext);
  if (!api) throw new Error('useLock must be used inside a LockProvider');
  return api;
}
