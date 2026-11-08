// The account flows: sign in with an emailed code, then create, unlock or reset the encrypted vault, or sign out.
// The passphrase and the derived key are used in place and never stored, logged or put in an error message.
import type { Repo } from '../../db/repo';
import {
  assertSupportedKdf,
  decryptEnvelope,
  deriveVaultKey,
  encryptEnvelope,
  EnvelopeError,
  KDF_ITERATIONS,
  newSalt,
} from './envelope';
import type { SyncEngine } from './syncEngine';
import { toPlaintext, toSyncData, type SyncData } from './syncData';
import { clearSyncIdentity, saveSyncKey, saveSyncMeta } from './syncKeyStore';
import { SyncServerError, type SyncServer } from './syncServer';

export const MIN_PASSPHRASE_LENGTH = 10;
/** How long sign-out waits for the server before it clears this device anyway. */
export const SIGN_OUT_TIMEOUT_MS = 3000;
export type PassphraseCheck = 'ok' | 'tooShort';
/** 'unknown': the vault lookup failed after sign-in; retry with vaultStatus(). */
export type VaultStatus = 'none' | 'exists' | 'unknown';
export type SyncAccountErrorKind =
  | 'newerVersion'
  | 'tooShort'
  | 'notSignedIn'
  | 'network'
  | 'auth'
  | 'tooLarge'
  | 'vaultExists'
  | 'noVault'
  | 'emptyLocal'
  | 'damaged'
  | 'unknown';

/** A typed account failure. The message is fixed text: never a passphrase, key or server body. */
export class SyncAccountError extends Error {
  kind: SyncAccountErrorKind;

  constructor(kind: SyncAccountErrorKind) {
    super(`Sync account error: ${kind}`);
    this.name = 'SyncAccountError';
    this.kind = kind;
  }
}

export function checkPassphrase(passphrase: string): PassphraseCheck {
  return passphrase.length >= MIN_PASSPHRASE_LENGTH ? 'ok' : 'tooShort';
}

export interface SyncAccount {
  requestCode(email: string): Promise<void>;
  /** Keeps the session even when the vault lookup fails afterwards (then `vault` is 'unknown'). */
  verifyCode(email: string, code: string): Promise<{ email: string; vault: VaultStatus }>;
  /** Whether the signed-in account has a cloud copy; for retrying after `vault: 'unknown'`. */
  vaultStatus(): Promise<VaultStatus>;
  /** No cloud copy yet: new salt, key cached, first sync. */
  createVault(passphrase: string): Promise<void>;
  /** Existing cloud copy: true when the passphrase opens it (key cached, first sync), false when it is wrong. */
  unlockVault(passphrase: string): Promise<boolean>;
  /**
   * New salt and key; this device's data replaces the cloud copy atomically. Other devices must unlock again.
   * Rejects with 'emptyLocal' when this device has no records, unless `allowEmpty` is true.
   */
  resetVault(passphrase: string, opts?: { allowEmpty?: boolean }): Promise<void>;
  /** Records this device would upload: every synced table except settings (and deletion markers). */
  localRecordCount(): Promise<number>;
  /** Clears the key, the meta and the session. Local data and the cloud copy are untouched. */
  signOut(): Promise<void>;
}

function toAccountError(error: unknown): SyncAccountError {
  if (error instanceof SyncAccountError) return error;
  if (error instanceof SyncServerError) {
    const known = error.kind === 'network' || error.kind === 'auth' || error.kind === 'tooLarge';
    return new SyncAccountError(known ? error.kind : 'unknown');
  }
  if (error instanceof EnvelopeError) {
    if (error.kind === 'unsupported') return new SyncAccountError('newerVersion');
    if (error.kind === 'format') return new SyncAccountError('damaged');
  }
  return new SyncAccountError('unknown');
}

async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw toAccountError(error);
  }
}

function countRecords(data: SyncData): number {
  const { settings: _settings, syncTombstones: _tombstones, ...tables } = data;
  return Object.values(tables).reduce((total, rows) => total + rows.length, 0);
}

export function createSyncAccount(deps: {
  server: SyncServer;
  engine: SyncEngine;
  repo: Repo;
  iterations?: number;
}): SyncAccount {
  const { server, engine, repo } = deps;
  const iter = deps.iterations ?? KDF_ITERATIONS;

  async function requireSession() {
    const session = await server.session();
    if (!session) throw new SyncAccountError('notSignedIn');
    return session;
  }

  function requireLongEnough(passphrase: string): void {
    if (checkPassphrase(passphrase) !== 'ok') throw new SyncAccountError('tooShort');
  }

  async function vaultStatus(): Promise<VaultStatus> {
    await requireSession();
    return (await server.getVault()) ? 'exists' : 'none';
  }

  async function finish(): Promise<void> {
    await engine.refresh();
    await engine.syncNow();
  }

  return {
    requestCode: (email) => guarded(() => server.requestCode(email)),

    verifyCode: (email, code) =>
      guarded(async () => {
        const session = await server.verifyCode(email, code);
        // The single-use code is spent: a failed lookup must not undo the sign-in.
        const vault = await vaultStatus().catch((): VaultStatus => 'unknown');
        return { email: session.email, vault };
      }),

    vaultStatus: () => guarded(vaultStatus),

    localRecordCount: () => guarded(async () => countRecords(toSyncData(await repo.exportAll()))),

    createVault: (passphrase) =>
      guarded(async () => {
        requireLongEnough(passphrase);
        const session = await requireSession();
        // A copy already exists: this passphrase would never open it, so unlock or reset instead.
        if (await server.getVault()) throw new SyncAccountError('vaultExists');
        const salt = newSalt();
        const key = await deriveVaultKey(passphrase, salt, iter);
        await saveSyncKey({ key, salt, iter, userId: session.userId });
        await finish();
      }),

    unlockVault: (passphrase) =>
      guarded(async () => {
        const session = await requireSession();
        const row = await server.getVault();
        if (!row) throw new SyncAccountError('noVault');
        const { envelope } = row;
        assertSupportedKdf(envelope);
        const key = await deriveVaultKey(passphrase, envelope.kdf.salt, envelope.kdf.iter);
        try {
          await decryptEnvelope(key, session.userId, envelope);
        } catch (error) {
          if (error instanceof EnvelopeError && error.kind === 'decrypt') return false;
          throw error;
        }
        await saveSyncKey({
          key,
          salt: envelope.kdf.salt,
          iter: envelope.kdf.iter,
          userId: session.userId,
        });
        await finish();
        return true;
      }),

    resetVault: (passphrase, opts) =>
      guarded(async () => {
        requireLongEnough(passphrase);
        const session = await requireSession();
        const data = toSyncData(await repo.exportAll());
        if (countRecords(data) === 0 && opts?.allowEmpty !== true) throw new SyncAccountError('emptyLocal');
        const salt = newSalt();
        const key = await deriveVaultKey(passphrase, salt, iter);
        const envelope = await encryptEnvelope(key, salt, session.userId, toPlaintext(data), iter);
        const { version } = await server.replaceVault(envelope);
        // Only now that the server holds the new copy does this device switch to the new key.
        await saveSyncKey({ key, salt, iter, userId: session.userId });
        await saveSyncMeta({ version, lastSyncedAt: new Date().toISOString() });
        await finish();
      }),

    signOut: () =>
      guarded(async () => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          // The token must still be here for the server call, so nothing is cleared first. A stalled or failing
          // server must not keep the key on this device: the local sign-out is what matters.
          await Promise.race([
            server.signOut(),
            new Promise<void>((resolve) => {
              timer = setTimeout(resolve, SIGN_OUT_TIMEOUT_MS);
            }),
          ]);
        } catch {
          // fall through to the local clear
        } finally {
          clearTimeout(timer);
          await clearSyncIdentity();
          await engine.refresh();
        }
      }),
  };
}
