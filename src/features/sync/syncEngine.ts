// The sync loop: pull the cloud copy, merge it into this device, push the merged result when it differs.
// One run at a time; requests during a run coalesce into one follow-up. Local data is written only after the cloud
// copy has decrypted and validated, and every write or push is preceded by a check that the engine was not stopped
// and the session and key are still the ones the run started with. Nothing here logs, and the state never carries a
// key or a passphrase.
import type { Repo } from '../../db/repo';
import { assertSupportedKdf, decryptEnvelope, encryptEnvelope, EnvelopeError } from './envelope';
import {
  orphanPhotoIds,
  parseRemote,
  prepareRemote,
  sameSyncData,
  toPlaintext,
  toSyncData,
  type SyncData,
} from './syncData';
import { loadSyncKey, loadSyncMeta, saveSyncMeta, type SyncKey } from './syncKeyStore';
import { SyncServerError, type SyncServer, type SyncSession, type VaultRow } from './syncServer';

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'offline' | 'attention';
export type SyncIssue =
  'wrongPassphrase' | 'keyChanged' | 'damaged' | 'newerVersion' | 'tooLarge' | 'auth' | 'busy' | 'unknown';

export interface SyncState {
  status: SyncStatus;
  issue?: SyncIssue;
  lastSyncedAt?: string;
  email?: string;
}

export type SyncReason = 'start' | 'change' | 'foreground' | 'online' | 'manual';

export interface SyncEngine {
  getState(): SyncState;
  subscribe(fn: (s: SyncState) => void): () => void;
  /** Schedules the start sync (about 2 s); it only reaches the server when signed in with a cached key. */
  start(): void;
  /**
   * Final: clears every timer, cancels a pending follow-up and makes every later call a no-op. A run in flight
   * stops before its next write, push or key-store write. Create a new engine to sync again.
   */
  stop(): void;
  /** 'change' is debounced 5 s; 'manual' runs now and resets the backoff; the others run now. */
  requestSync(reason: SyncReason): void;
  /** Runs one sync (or joins the current one and its follow-up) and resolves when it finished. Never rejects. */
  syncNow(): Promise<void>;
  /** Resolves when no run is in flight. Never rejects. */
  whenIdle(): Promise<void>;
  /**
   * Re-reads the session and the key (after sign-in or sign-out): `off` without them; otherwise updates the email
   * and last sync time and keeps the last run's status and issue (`off` becomes `idle`).
   */
  refresh(): Promise<void>;
}

export interface SyncEngineDeps {
  /** The raw repo: the engine's own writes must never count as local changes. */
  repo: Repo;
  server: SyncServer;
  /** Called after a run whose merge changed this device's data (to reload the screens). Never for a no-op merge. */
  onMerged?: () => void;
}

export const START_DELAY_MS = 2_000;
export const CHANGE_DEBOUNCE_MS = 5_000;
export const BACKOFF_MS = [30_000, 120_000, 600_000, 1_800_000] as const;
export const MAX_ATTEMPTS = 3;
export const STOP_TIMEOUT_MS = 2_500;

/** Ends a run with an issue ('off': the session or key went away; 'stopped': stop() was called). */
class Halt {
  constructor(readonly issue: SyncIssue | 'off' | 'stopped') {}
}

/** Issues that clear only when something changes (a new key, a new sign-in, a smaller copy): no automatic retry. */
const RETRIED: ReadonlySet<SyncIssue> = new Set(['busy', 'unknown']);

function envelopeIssue(error: unknown): SyncIssue {
  return error instanceof EnvelopeError && error.kind === 'unsupported' ? 'newerVersion' : 'damaged';
}

/** The most recently created engine, for stopActiveSync(). */
let latest: SyncEngine | null = null;

/**
 * Stops the most recently created engine and waits until its run in flight has finished, or `timeoutMs` passed.
 * For sign-out and erase, before they touch the key store or the data. Never rejects; a no-op without an engine.
 */
export function stopActiveSync(timeoutMs: number = STOP_TIMEOUT_MS): Promise<void> {
  const engine = latest;
  if (!engine) return Promise.resolve();
  engine.stop();
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    void engine.whenIdle().then(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export function createSyncEngine(deps: SyncEngineDeps): SyncEngine {
  const { repo, server, onMerged } = deps;
  let state: SyncState = { status: 'off' };
  const listeners = new Set<(s: SyncState) => void>();
  let loop: Promise<void> | null = null;
  let pending = false;
  let stopped = false;
  let failures = 0;
  const timers: Record<'start' | 'change' | 'retry', ReturnType<typeof setTimeout> | undefined> = {
    start: undefined,
    change: undefined,
    retry: undefined,
  };

  function publish(next: SyncState): void {
    const clean: SyncState = { status: next.status };
    if (next.issue) clean.issue = next.issue;
    if (next.lastSyncedAt) clean.lastSyncedAt = next.lastSyncedAt;
    if (next.email) clean.email = next.email;
    if (JSON.stringify(clean) === JSON.stringify(state)) return;
    state = clean;
    for (const fn of [...listeners]) fn(state);
  }

  function clearTimer(name: keyof typeof timers): void {
    clearTimeout(timers[name]);
    timers[name] = undefined;
  }

  function schedule(name: keyof typeof timers, ms: number): void {
    clearTimer(name);
    if (stopped) return;
    timers[name] = setTimeout(() => {
      timers[name] = undefined;
      void kick();
    }, ms);
  }

  async function identity(): Promise<{ session: SyncSession; key: SyncKey } | null> {
    const [session, key] = await Promise.all([server.session().catch(() => null), loadSyncKey()]);
    return session && key ? { session, key } : null;
  }

  /**
   * Throws unless the engine is still running with the session and key this run started with (not stopped, signed
   * out, erased or reset). Synchronous on its last step, so the write that follows starts in the same tick.
   */
  async function guard(session: SyncSession, key: SyncKey): Promise<void> {
    if (stopped) throw new Halt('stopped');
    const now = await identity();
    if (stopped) throw new Halt('stopped');
    const same =
      !!now && now.session.userId === session.userId && now.key.salt === key.salt && now.key.iter === key.iter;
    if (!same) throw new Halt('off');
  }

  /** Decrypts and validates the cloud copy. Throws a Halt; never writes. */
  async function open(row: VaultRow, session: SyncSession, key: SyncKey): Promise<SyncData> {
    const envelope = row.envelope;
    try {
      assertSupportedKdf(envelope);
    } catch (error) {
      throw new Halt(envelopeIssue(error));
    }
    // The cached key was derived with other settings (a reset elsewhere): it cannot open this copy.
    if (envelope.kdf.salt !== key.salt || envelope.kdf.iter !== key.iter) throw new Halt('keyChanged');
    let plaintext: unknown;
    try {
      plaintext = await decryptEnvelope(key.key, session.userId, envelope);
    } catch (error) {
      // The key was verified when it was cached, so a failure here means the copy is damaged.
      throw new Halt(envelopeIssue(error));
    }
    try {
      return parseRemote(plaintext);
    } catch {
      throw new Halt('damaged');
    }
  }

  /** Pull, merge, push; returns the cloud version this device now matches. Sets `run.merged` on a real change. */
  async function exchange(session: SyncSession, key: SyncKey, run: { merged: boolean }): Promise<number> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const row = await server.getVault();
      let remote: SyncData | null = null;
      if (row) {
        remote = await open(row, session, key);
        const before = await repo.exportAll();
        await guard(session, key);
        await repo.mergeAll(prepareRemote(remote, before));
        // A homework deleted elsewhere leaves its photos here; they never sync, so remove them now.
        for (const id of orphanPhotoIds(await repo.exportAll())) {
          await guard(session, key);
          await repo.deleteHomeworkImage(id);
        }
        if (!sameSyncData(toSyncData(before), toSyncData(await repo.exportAll()))) run.merged = true;
      }
      const mine = toSyncData(await repo.exportAll());
      if (row && remote && sameSyncData(mine, remote)) return row.version;
      const envelope = await encryptEnvelope(key.key, key.salt, session.userId, toPlaintext(mine), key.iter);
      await guard(session, key);
      const result = await server.pushVault(row?.version ?? 0, envelope);
      if (result.ok) return result.version;
    }
    throw new Halt('busy');
  }

  function fail(issue: SyncIssue | 'offline', email: string): void {
    const lastSyncedAt = state.lastSyncedAt;
    if (issue === 'offline') publish({ status: 'offline', email, lastSyncedAt });
    else publish({ status: 'attention', issue, email, lastSyncedAt });
    if (issue === 'offline' || RETRIED.has(issue)) {
      schedule('retry', BACKOFF_MS[Math.min(failures, BACKOFF_MS.length - 1)]);
      failures++;
    } else {
      clearTimer('retry');
    }
  }

  function goOff(): void {
    failures = 0;
    clearTimer('retry');
    publish({ status: 'off' });
  }

  async function runOnce(): Promise<void> {
    clearTimer('retry');
    const who = await identity();
    if (stopped) return;
    if (!who) {
      goOff();
      return;
    }
    const { session, key } = who;
    const meta = await loadSyncMeta();
    if (stopped) return;
    publish({ status: 'syncing', email: session.email, lastSyncedAt: meta.lastSyncedAt ?? state.lastSyncedAt });
    const run = { merged: false };
    try {
      const version = await exchange(session, key, run);
      await guard(session, key);
      const lastSyncedAt = new Date().toISOString();
      await saveSyncMeta({ version, lastSyncedAt }).catch(() => undefined);
      failures = 0;
      publish({ status: 'idle', email: session.email, lastSyncedAt });
    } catch (error) {
      if (stopped || (error instanceof Halt && error.issue === 'stopped')) {
        // stop() is final: leave the last settled state (never 'syncing') and schedule nothing.
        if (state.status === 'syncing') publish({ ...state, status: 'idle' });
      } else if (error instanceof Halt) {
        if (error.issue === 'off') goOff();
        else fail(error.issue as SyncIssue, session.email);
      } else if (error instanceof SyncServerError) {
        fail(error.kind === 'network' ? 'offline' : error.kind, session.email);
      } else {
        fail('unknown', session.email);
      }
    }
    if (run.merged && onMerged) {
      try {
        onMerged();
      } catch {
        // a listener failure must not break the sync loop
      }
    }
  }

  function kick(): Promise<void> {
    if (stopped) return loop ?? Promise.resolve();
    pending = true;
    if (!loop) {
      loop = (async () => {
        try {
          while (pending && !stopped) {
            pending = false;
            await runOnce().catch(() => {
              if (!stopped) publish({ status: 'attention', issue: 'unknown' });
            });
          }
        } finally {
          pending = false;
          loop = null;
        }
      })();
    }
    return loop;
  }

  async function refresh(): Promise<void> {
    if (stopped) return;
    const who = await identity();
    if (stopped) return;
    if (!who) {
      goOff();
      return;
    }
    const meta = await loadSyncMeta();
    if (stopped) return;
    const lastSyncedAt = meta.lastSyncedAt ?? state.lastSyncedAt;
    const email = who.session.email;
    // A run may have settled while this was reading: keep its status and issue.
    if (state.status === 'off') {
      failures = 0;
      publish({ status: loop ? 'syncing' : 'idle', email, lastSyncedAt });
    } else {
      publish({ ...state, email, lastSyncedAt });
    }
  }

  const engine: SyncEngine = {
    getState: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    start() {
      if (stopped) return;
      void refresh();
      schedule('start', START_DELAY_MS);
    },
    stop() {
      stopped = true;
      pending = false;
      clearTimer('start');
      clearTimer('change');
      clearTimer('retry');
    },
    requestSync(reason) {
      if (stopped) return;
      if (reason === 'change') schedule('change', CHANGE_DEBOUNCE_MS);
      else if (reason === 'start') schedule('start', START_DELAY_MS);
      else {
        if (reason === 'manual') {
          failures = 0;
          clearTimer('retry');
        }
        void kick();
      }
    },
    syncNow: () => kick(),
    whenIdle: () => loop ?? Promise.resolve(),
    refresh,
  };
  latest = engine;
  return engine;
}
