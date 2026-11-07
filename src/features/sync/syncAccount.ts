// The account flows: sign in with an emailed code, then create, unlock or reset the encrypted vault, or sign out.
// The passphrase and the derived key are used in place and never stored, logged or put in an error message.
import type { Repo } from "../../db/repo";
import {
  assertSupportedKdf,
  decryptEnvelope,
  deriveVaultKey,
  encryptEnvelope,
  EnvelopeError,
  KDF_ITERATIONS,
  newSalt,
} from "./envelope";
import type { SyncEngine } from "./syncEngine";
import { toPlaintext, toSyncData } from "./syncData";
import { clearSyncIdentity, saveSyncKey, saveSyncMeta } from "./syncKeyStore";
import { SyncServerError, type SyncServer } from "./syncServer";

export const MIN_PASSPHRASE_LENGTH = 10;
export type PassphraseCheck = "ok" | "tooShort";
export type VaultStatus = "none" | "exists";
export type SyncAccountErrorKind =
  "newerVersion" | "tooShort" | "notSignedIn" | "network" | "auth" | "unknown";

/** A typed account failure. The message is fixed text: never a passphrase, key or server body. */
export class SyncAccountError extends Error {
  kind: SyncAccountErrorKind;

  constructor(kind: SyncAccountErrorKind) {
    super(`Sync account error: ${kind}`);
    this.name = "SyncAccountError";
    this.kind = kind;
  }
}

export function checkPassphrase(passphrase: string): PassphraseCheck {
  return passphrase.length >= MIN_PASSPHRASE_LENGTH ? "ok" : "tooShort";
}

export interface SyncAccount {
  requestCode(email: string): Promise<void>;
  verifyCode(
    email: string,
    code: string,
  ): Promise<{ email: string; vault: VaultStatus }>;
  /** No cloud copy yet: new salt, key cached, first sync. */
  createVault(passphrase: string): Promise<void>;
  /** Existing cloud copy: true when the passphrase opens it (key cached, first sync), false when it is wrong. */
  unlockVault(passphrase: string): Promise<boolean>;
  /** New salt and key; this device's data replaces the cloud copy atomically. Other devices must unlock again. */
  resetVault(passphrase: string): Promise<void>;
  /** Clears the key, the meta and the session. Local data and the cloud copy are untouched. */
  signOut(): Promise<void>;
}

function toAccountError(error: unknown): SyncAccountError {
  if (error instanceof SyncAccountError) return error;
  if (error instanceof SyncServerError) {
    return new SyncAccountError(
      error.kind === "network" || error.kind === "auth"
        ? error.kind
        : "unknown",
    );
  }
  if (error instanceof EnvelopeError && error.kind === "unsupported")
    return new SyncAccountError("newerVersion");
  return new SyncAccountError("unknown");
}

async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw toAccountError(error);
  }
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
    if (!session) throw new SyncAccountError("notSignedIn");
    return session;
  }

  function requireLongEnough(passphrase: string): void {
    if (checkPassphrase(passphrase) !== "ok")
      throw new SyncAccountError("tooShort");
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
        const row = await server.getVault();
        return { email: session.email, vault: row ? "exists" : "none" };
      }),

    createVault: (passphrase) =>
      guarded(async () => {
        requireLongEnough(passphrase);
        await requireSession();
        // A copy already exists: this passphrase would never open it, so unlock or reset instead.
        if (await server.getVault()) throw new SyncAccountError("unknown");
        const salt = newSalt();
        const key = await deriveVaultKey(passphrase, salt, iter);
        await saveSyncKey({ key, salt, iter });
        await finish();
      }),

    unlockVault: (passphrase) =>
      guarded(async () => {
        const session = await requireSession();
        const row = await server.getVault();
        if (!row) throw new SyncAccountError("unknown");
        const { envelope } = row;
        assertSupportedKdf(envelope);
        const key = await deriveVaultKey(
          passphrase,
          envelope.kdf.salt,
          envelope.kdf.iter,
        );
        try {
          await decryptEnvelope(key, session.userId, envelope);
        } catch (error) {
          if (error instanceof EnvelopeError && error.kind === "decrypt")
            return false;
          throw error;
        }
        await saveSyncKey({
          key,
          salt: envelope.kdf.salt,
          iter: envelope.kdf.iter,
        });
        await finish();
        return true;
      }),

    resetVault: (passphrase) =>
      guarded(async () => {
        requireLongEnough(passphrase);
        const session = await requireSession();
        const salt = newSalt();
        const key = await deriveVaultKey(passphrase, salt, iter);
        const data = toSyncData(await repo.exportAll());
        const envelope = await encryptEnvelope(
          key,
          salt,
          session.userId,
          toPlaintext(data),
          iter,
        );
        const { version } = await server.replaceVault(envelope);
        // Only now that the server holds the new copy does this device switch to the new key.
        await saveSyncKey({ key, salt, iter });
        await saveSyncMeta({ version, lastSyncedAt: new Date().toISOString() });
        await engine.refresh();
      }),

    signOut: () =>
      guarded(async () => {
        try {
          await server.signOut();
        } finally {
          await clearSyncIdentity();
        }
        await engine.refresh();
      }),
  };
}
