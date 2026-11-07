import type { Envelope } from './envelope';

/** The one cloud row per account: an opaque envelope and a version that grows by one on every accepted push. */
export interface VaultRow {
  version: number;
  envelope: Envelope;
}

export interface SyncSession {
  userId: string;
  email: string;
}

export type SyncServerErrorKind = 'network' | 'auth' | 'tooLarge' | 'unknown';

/** A typed server failure. The message is fixed text: never a server body, token or data. */
export class SyncServerError extends Error {
  kind: SyncServerErrorKind;

  constructor(kind: SyncServerErrorKind, message: string = `Sync server error: ${kind}`) {
    super(message);
    this.name = 'SyncServerError';
    this.kind = kind;
  }
}

/** Largest envelope the server accepts (serialized JSON). */
export const MAX_ENVELOPE_BYTES = 5 * 1024 * 1024;

export interface SyncServer {
  requestCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<SyncSession>;
  /** The stored session, or null when signed out. Read from this device; needs no network. */
  session(): Promise<SyncSession | null>;
  signOut(): Promise<void>;
  getVault(): Promise<VaultRow | null>;
  /**
   * Compare-and-swap: accepted only when `expectedVersion` is the current version (0 = no row yet). A refused push
   * returns `{ ok: false, version: <current> }`.
   */
  pushVault(expectedVersion: number, envelope: Envelope): Promise<{ ok: boolean; version: number }>;
  /** Deletes this account's cloud row. */
  resetVault(): Promise<void>;
}
