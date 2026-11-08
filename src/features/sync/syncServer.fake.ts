// An in-memory SyncServer for tests and local development. It follows the real server's rules: compare-and-swap on
// the version, the previous envelope kept on every accepted push, a 5 MB cap and one fixed user per email.
import type { Envelope } from './envelope';
import {
  MAX_ENVELOPE_BYTES,
  SyncServerError,
  type SyncServer,
  type SyncServerErrorKind,
  type SyncSession,
  type VaultRow,
} from './syncServer';

export const FAKE_CODE = '123456';

interface StoredVault extends VaultRow {
  prevEnvelope: Envelope | null;
}

/** The cloud: shared by every fake instance (device) created with it. */
export interface FakeBackingStore {
  users: Map<string, string>;
  vaults: Map<string, StoredVault>;
  pushes: number;
  gets: number;
}

export function createFakeBackingStore(): FakeBackingStore {
  return { users: new Map(), vaults: new Map(), pushes: 0, gets: 0 };
}

type Hook = () => void | Promise<void>;

export interface FakeSyncServer extends SyncServer {
  /** The backing store, to bind a second device to the same cloud. */
  shared: FakeBackingStore;
  /** The signed-in account's row (a copy), or null. */
  vault(): VaultRow | null;
  /** The previous envelope kept by the last accepted push. */
  prevEnvelope(): Envelope | null;
  /** Replaces the signed-in account's envelope without changing the version (tampering, damaged copies). */
  setEnvelope(envelope: unknown): void;
  /** The next vault call (get, push or replace) throws this kind. */
  failNext(kind: SyncServerErrorKind): void;
  setOffline(on: boolean): void;
  /** Every push from now on is refused as stale. */
  refuseAlways(on: boolean): void;
  /** Runs once inside the next `pushVault`, before the version check (to move the version under the engine). */
  beforeNextPush(hook: Hook): void;
  /** Runs once inside the next `getVault`, before it reads (to pause or change things mid-run). */
  beforeNextGet(hook: Hook): void;
  /** Accepted and refused push attempts, on the shared cloud. */
  pushCount(): number;
  getCount(): number;
  users: Map<string, string>;
}

export function createFakeSyncServer(opts: { latencyMs?: number; shared?: FakeBackingStore } = {}): FakeSyncServer {
  const shared = opts.shared ?? createFakeBackingStore();
  let current: SyncSession | null = null;
  let offline = false;
  let refuse = false;
  let nextFailure: SyncServerErrorKind | null = null;
  let pushHook: Hook | null = null;
  let getHook: Hook | null = null;

  const wait = async () => {
    if (opts.latencyMs) await new Promise((resolve) => setTimeout(resolve, opts.latencyMs));
  };
  const network = async () => {
    await wait();
    if (offline) throw new SyncServerError('network');
  };
  const vaultCall = async (): Promise<string> => {
    await network();
    if (nextFailure) {
      const kind = nextFailure;
      nextFailure = null;
      throw new SyncServerError(kind);
    }
    if (!current) throw new SyncServerError('auth');
    return current.userId;
  };
  const copy = (row: StoredVault): VaultRow => structuredClone({ version: row.version, envelope: row.envelope });

  return {
    shared,
    users: shared.users,

    async requestCode(email) {
      await network();
      if (!email.includes('@')) throw new SyncServerError('unknown');
    },
    async verifyCode(email, code) {
      await network();
      if (code !== FAKE_CODE) throw new SyncServerError('auth');
      const key = email.trim().toLowerCase();
      let userId = shared.users.get(key);
      if (!userId) {
        userId = `user-${shared.users.size + 1}`;
        shared.users.set(key, userId);
      }
      current = { userId, email: key };
      return { ...current };
    },
    async session() {
      return current ? { ...current } : null;
    },
    async signOut() {
      current = null;
    },
    async getVault() {
      const hook = getHook;
      getHook = null;
      if (hook) await hook();
      const userId = await vaultCall();
      shared.gets++;
      const row = shared.vaults.get(userId);
      return row ? copy(row) : null;
    },
    async pushVault(expectedVersion, envelope) {
      const userId = await vaultCall();
      const hook = pushHook;
      pushHook = null;
      if (hook) await hook();
      shared.pushes++;
      if (JSON.stringify(envelope).length > MAX_ENVELOPE_BYTES) throw new SyncServerError('tooLarge');
      const row = shared.vaults.get(userId);
      const version = row?.version ?? 0;
      if (refuse || expectedVersion !== version) return { ok: false, version };
      shared.vaults.set(userId, {
        version: version + 1,
        envelope: structuredClone(envelope),
        prevEnvelope: row?.envelope ?? null,
      });
      return { ok: true, version: version + 1 };
    },
    async replaceVault(envelope) {
      const userId = await vaultCall();
      if (JSON.stringify(envelope).length > MAX_ENVELOPE_BYTES) throw new SyncServerError('tooLarge');
      const row = shared.vaults.get(userId);
      const version = (row?.version ?? 0) + 1;
      shared.vaults.set(userId, {
        version,
        envelope: structuredClone(envelope),
        prevEnvelope: row?.envelope ?? null,
      });
      return { version };
    },

    vault() {
      const row = current && shared.vaults.get(current.userId);
      return row ? copy(row) : null;
    },
    prevEnvelope() {
      const row = current && shared.vaults.get(current.userId);
      return row?.prevEnvelope ? structuredClone(row.prevEnvelope) : null;
    },
    setEnvelope(envelope) {
      const row = current && shared.vaults.get(current.userId);
      if (!row) throw new Error('No vault to replace');
      row.envelope = structuredClone(envelope) as Envelope;
    },
    failNext(kind) {
      nextFailure = kind;
    },
    setOffline(on) {
      offline = on;
    },
    refuseAlways(on) {
      refuse = on;
    },
    beforeNextPush(hook) {
      pushHook = hook;
    },
    beforeNextGet(hook) {
      getHook = hook;
    },
    pushCount: () => shared.pushes,
    getCount: () => shared.gets,
  };
}
