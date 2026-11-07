// The sync loop: pull the cloud copy, merge it into this device, push the merged result when it differs.
// One run at a time; requests during a run coalesce into one follow-up. Local data is written only after the cloud
// copy has decrypted and validated. Nothing here logs, and the state never carries a key or a passphrase.
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
  /** Clears every timer; a run in progress finishes but schedules nothing. */
  stop(): void;
  /** 'change' is debounced 5 s; 'manual' runs now and resets the backoff; the others run now. */
  requestSync(reason: SyncReason): void;
  /** Runs one sync (or joins the current one and its follow-up) and resolves when it finished. Never rejects. */
  syncNow(): Promise<void>;
  /** Re-reads the session and the key and publishes the state (after sign-in or sign-out). */
  refresh(): Promise<void>;
}

export const START_DELAY_MS = 2_000;
export const CHANGE_DEBOUNCE_MS = 5_000;
export const BACKOFF_MS = [30_000, 120_000, 600_000, 1_800_000] as const;
export const MAX_ATTEMPTS = 3;

/** Ends a run with an issue ('off': the session or key went away during the run). */
class Halt {
  constructor(readonly issue: SyncIssue | 'off') {}
}

/** Issues that clear only when something changes (a new key, a new sign-in, a smaller copy): no automatic retry. */
const RETRIED: ReadonlySet<SyncIssue> = new Set(['busy', 'unknown']);

function envelopeIssue(error: unknown): SyncIssue {
  return error instanceof EnvelopeError && error.kind === 'unsupported' ? 'newerVersion' : 'damaged';
}

export function createSyncEngine(deps: { repo: Repo; server: SyncServer }): SyncEngine {
  const { repo, server } = deps;
  let state: SyncState = { status: 'off' };
  const listeners = new Set<(s: SyncState) => void>();
  let loop: Promise<void> | null = null;
  let pending = false;
  let active = true;
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
    if (!active) return;
    timers[name] = setTimeout(() => {
      timers[name] = undefined;
      void kick();
    }, ms);
  }

  async function identity(): Promise<{
    session: SyncSession;
    key: SyncKey;
  } | null> {
    const [session, key] = await Promise.all([server.session().catch(() => null), loadSyncKey()]);
    return session && key ? { session, key } : null;
  }

  /** The session and key this run started with are still the ones stored (not signed out, erased or reset). */
  async function unchanged(session: SyncSession, key: SyncKey): Promise<boolean> {
    const now = await identity();
    return !!now && now.session.userId === session.userId && now.key.salt === key.salt && now.key.iter === key.iter;
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

  /** Pull, merge, push; returns the cloud version this device now matches. */
  async function exchange(session: SyncSession, key: SyncKey): Promise<number> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const row = await server.getVault();
      let remote: SyncData | null = null;
      if (row) {
        remote = await open(row, session, key);
        if (!(await unchanged(session, key))) throw new Halt('off');
        await repo.mergeAll(prepareRemote(remote, await repo.exportAll()));
        // A homework deleted elsewhere leaves its photos here; they never sync, so remove them now.
        for (const id of orphanPhotoIds(await repo.exportAll())) await repo.deleteHomeworkImage(id);
      }
      const mine = toSyncData(await repo.exportAll());
      if (row && remote && sameSyncData(mine, remote)) return row.version;
      const envelope = await encryptEnvelope(key.key, key.salt, session.userId, toPlaintext(mine), key.iter);
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

  async function runOnce(): Promise<void> {
    clearTimer('retry');
    const who = await identity();
    if (!who) {
      publish({ status: 'off' });
      return;
    }
    const { session, key } = who;
    const meta = await loadSyncMeta();
    publish({
      status: 'syncing',
      email: session.email,
      lastSyncedAt: meta.lastSyncedAt ?? state.lastSyncedAt,
    });
    try {
      const version = await exchange(session, key);
      if (!(await unchanged(session, key))) throw new Halt('off');
      const lastSyncedAt = new Date().toISOString();
      await saveSyncMeta({ version, lastSyncedAt }).catch(() => undefined);
      failures = 0;
      publish({ status: 'idle', email: session.email, lastSyncedAt });
    } catch (error) {
      if (error instanceof Halt) {
        if (error.issue === 'off') publish({ status: 'off' });
        else fail(error.issue, session.email);
      } else if (error instanceof SyncServerError) {
        fail(error.kind === 'network' ? 'offline' : error.kind, session.email);
      } else {
        fail('unknown', session.email);
      }
    }
  }

  function kick(): Promise<void> {
    pending = true;
    if (!loop) {
      loop = (async () => {
        try {
          while (pending) {
            pending = false;
            await runOnce().catch(() => publish({ status: 'attention', issue: 'unknown' }));
          }
        } finally {
          loop = null;
        }
      })();
    }
    return loop;
  }

  async function refresh(): Promise<void> {
    const who = await identity();
    if (!who) {
      clearTimer('retry');
      publish({ status: 'off' });
      return;
    }
    const meta = await loadSyncMeta();
    const lastSyncedAt = meta.lastSyncedAt ?? state.lastSyncedAt;
    publish({
      status: loop ? 'syncing' : 'idle',
      email: who.session.email,
      lastSyncedAt,
    });
  }

  return {
    getState: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    start() {
      active = true;
      void refresh();
      schedule('start', START_DELAY_MS);
    },
    stop() {
      active = false;
      clearTimer('start');
      clearTimer('change');
      clearTimer('retry');
    },
    requestSync(reason) {
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
    refresh,
  };
}
