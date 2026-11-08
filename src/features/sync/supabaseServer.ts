// The Supabase implementation of SyncServer: the email-code sign-in and the vault calls. Thin: it only maps results and
// errors. Every thrown error is a SyncServerError with fixed text, never a server body, token, code, email or data.
import { createClient } from '@supabase/supabase-js';
import { isEnvelope, type Envelope } from './envelope';
import { createSessionStorage } from './syncKeyStore';
import {
  SyncServerError,
  type SyncServer,
  type SyncServerErrorKind,
  type SyncSession,
  type VaultRow,
} from './syncServer';

interface Result {
  data: unknown;
  error: unknown;
}

/** The slice of the supabase-js client this module uses (the test injects a hand-made one). */
export interface SupabaseClientLike {
  auth: {
    signInWithOtp(params: { email: string; options: { shouldCreateUser: boolean } }): PromiseLike<Result>;
    verifyOtp(params: { email: string; token: string; type: 'email' }): PromiseLike<Result>;
    getSession(): PromiseLike<Result>;
    signOut(options: { scope: 'local' }): PromiseLike<{ error: unknown }>;
  };
  from(table: string): { select(columns: string): { maybeSingle(): PromiseLike<Result> } };
  rpc(name: string, args: Record<string, unknown>): PromiseLike<Result>;
}

export function isSyncConfigured(): boolean {
  const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: key } = import.meta.env;
  return typeof url === 'string' && url !== '' && typeof key === 'string' && key !== '';
}

function defaultClient(): SupabaseClientLike {
  return createClient(import.meta.env.VITE_SUPABASE_URL as string, import.meta.env.VITE_SUPABASE_ANON_KEY as string, {
    auth: {
      storage: createSessionStorage(),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }) as unknown as SupabaseClientLike;
}

interface ErrorFields {
  name?: unknown;
  message?: unknown;
  status?: unknown;
  code?: unknown;
}

// A session that can no longer be refreshed (expired, revoked, used twice) and the database's own auth errors.
const AUTH_CODES = new Set([
  'refresh_token_not_found',
  'refresh_token_already_used',
  'session_expired',
  'session_not_found',
  'PGRST301',
  '28000',
  '42501',
]);
const AUTH_TEXT = /invalid refresh token|auth session missing|jwt/i;
const NETWORK_TEXT = /failed to fetch|networkerror|network request failed|load failed|fetch failed|timed? ?out/i;

function kindOf(error: unknown, otp = false): SyncServerErrorKind {
  const e = (error ?? {}) as ErrorFields;
  const message = typeof e.message === 'string' ? e.message : '';
  const name = typeof e.name === 'string' ? e.name : '';
  const code = typeof e.code === 'string' ? e.code : '';
  const status = typeof e.status === 'number' ? e.status : null;
  if (message.includes('vault too large')) return 'tooLarge';
  if (error instanceof TypeError || name === 'AuthRetryableFetchError' || status === 0 || NETWORK_TEXT.test(message)) {
    return 'network';
  }
  if (name === 'AuthSessionMissingError' || status === 401 || AUTH_CODES.has(code) || AUTH_TEXT.test(message)) {
    return 'auth';
  }
  if (otp && (status === 400 || status === 403 || status === 422 || code.startsWith('otp_'))) return 'auth';
  return 'unknown';
}

function fail(error: unknown, otp = false): never {
  throw new SyncServerError(kindOf(error, otp));
}

async function call<T extends { error: unknown }>(run: () => PromiseLike<T>, otp = false): Promise<T> {
  let result: T;
  try {
    result = await run();
  } catch (e) {
    return fail(e, otp);
  }
  if (result.error) fail(result.error, otp);
  return result;
}

function toSession(value: unknown): SyncSession | null {
  const user = (value as { user?: { id?: unknown; email?: unknown } } | null)?.user;
  if (!user || typeof user.id !== 'string') return null;
  return { userId: user.id, email: typeof user.email === 'string' ? user.email : '' };
}

function toVersion(value: unknown): number {
  const n = typeof value === 'string' && value !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0) throw new SyncServerError('unknown');
  return n;
}

export function createSupabaseServer(client: SupabaseClientLike = defaultClient()): SyncServer {
  const stored = async (): Promise<SyncSession | null> => {
    const { data } = await call(() => client.auth.getSession());
    return toSession((data as { session?: unknown } | null)?.session);
  };
  // A vault call without a session would read as an empty vault (RLS), so it is an auth error instead.
  const requireSession = async (): Promise<void> => {
    if (!(await stored())) throw new SyncServerError('auth');
  };

  return {
    async requestCode(email) {
      await call(() => client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }));
    },
    async verifyCode(email, code) {
      const { data } = await call(() => client.auth.verifyOtp({ email, token: code, type: 'email' }), true);
      const session = toSession((data as { session?: unknown } | null)?.session);
      if (!session) throw new SyncServerError('auth');
      return session;
    },
    session: stored,
    async signOut() {
      // 'local' ends this device only; the default 'global' would revoke the refresh tokens of every device.
      await call(() => client.auth.signOut({ scope: 'local' }));
    },
    async getVault(): Promise<VaultRow | null> {
      await requireSession();
      const { data } = await call(() => client.from('vaults').select('version, envelope').maybeSingle());
      if (data === null || data === undefined) return null;
      const row = data as { version?: unknown; envelope?: unknown };
      if (!isEnvelope(row.envelope)) throw new SyncServerError('unknown');
      return { version: toVersion(row.version), envelope: row.envelope };
    },
    async pushVault(expectedVersion: number, envelope: Envelope) {
      await requireSession();
      const { data } = await call(() =>
        client.rpc('push_vault', { expected_version: expectedVersion, new_envelope: envelope }),
      );
      const row = (Array.isArray(data) ? data[0] : data) as { ok?: unknown; version?: unknown } | null | undefined;
      if (!row || typeof row.ok !== 'boolean') throw new SyncServerError('unknown');
      return { ok: row.ok, version: toVersion(row.version) };
    },
    async replaceVault(envelope: Envelope) {
      await requireSession();
      const { data } = await call(() => client.rpc('reset_vault', { new_envelope: envelope }));
      return { version: toVersion(data) };
    },
  };
}
