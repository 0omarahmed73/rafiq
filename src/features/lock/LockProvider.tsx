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
  setUp(pin: string, biometric: boolean): Promise<string>;
  changePin(pin: string): Promise<string>;
  setAutoLockMs(ms: number): void;
  setBiometric(on: boolean): void;
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

function readClamped(): LockRecord | null {
  const record = readLock();
  return record ? clampAndPersist(record, Date.now()) : null;
}

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
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const hiddenAt = useRef<number | null>(null);

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
    setRecovered(next);
  }, []);

  useEffect(() => {
    pendingResetNotice = false;
  }, []);

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
          if (hiddenAt.current === null) hiddenAt.current = Date.now();
          return;
        }
        const since = hiddenAt.current;
        hiddenAt.current = null;
        const current = recordRef.current;
        if (since === null || !current || lockedRef.current) return;
        if (Date.now() - since >= current.autoLockMs) {
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
        const rec = currentClamped();
        if (!rec) return 'wrong';
        if (remainingWaitMs(rec, Date.now()) > 0) return 'blocked';
        const target = pick(rec);
        const ok = await safeVerify(secret, target);
        const latest = recordRef.current;
        if (!latest || pick(latest) !== target) return 'wrong';
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
    [setRecord, currentClamped, enqueue],
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
        if (recordRef.current) throw new Error('The lock is already on.');
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
        if (recordRef.current) throw new Error('The lock is already on.');
        writeLock(next);
        setRecord(next);
        setRecoveredBoth(false);
        setLockedBoth(false);
        return code;
      }),
    [enqueue, setRecord, setLockedBoth, setRecoveredBoth],
  );

  const changePin = useCallback(
    (pin: string) =>
      enqueue(async () => {
        const normalized = newPin(pin);
        if (!recordRef.current) throw new Error('The lock is off.');
        if (lockedRef.current && !recoveredRef.current) throw new Error('Unlock or recover before changing the PIN.');
        // Recovery path: locked with a recovered code; it ends by opening the app. Settings path: open; it changes nothing else.
        const viaRecovery = lockedRef.current;
        const code = generateRecoveryCode();
        const pinHash = await hashSecret(normalized);
        const recoveryHash = await hashSecret(normalizeRecoveryCode(code));
        const current = recordRef.current;
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
        if (viaRecovery) {
          setRecoveredBoth(false);
          setLockedBoth(false);
        }
        return code;
      }),
    [enqueue, setRecord, setLockedBoth, setRecoveredBoth],
  );

  const update = useCallback(
    (change: Partial<LockRecord>) => {
      const current = recordRef.current;
      if (!current || lockedRef.current) return;
      const next = { ...current, ...change };
      try {
        writeLock(next);
      } catch {
        // storage unavailable: keep the choice for this session
      }
      setRecord(next);
    },
    [setRecord],
  );

  const setAutoLockMs = useCallback(
    (ms: number) => {
      if (!(AUTO_LOCK_OPTIONS as readonly number[]).includes(ms)) return;
      update({ autoLockMs: ms });
    },
    [update],
  );

  const setBiometric = useCallback((on: boolean) => update({ biometric: on }), [update]);

  const turnOff = useCallback(() => {
    if (lockedRef.current) return;
    clearLock();
    setRecord(null);
    setRecoveredBoth(false);
    setLockedBoth(false);
  }, [setRecord, setLockedBoth, setRecoveredBoth]);

  const eraseEverything = useCallback(async () => {
    await repo.eraseAll();
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
      setUp,
      changePin,
      setAutoLockMs,
      setBiometric,
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
      setUp,
      changePin,
      setAutoLockMs,
      setBiometric,
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
