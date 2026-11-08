import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Envelope } from './envelope';
import { SyncServerError } from './syncServer';
import { createSupabaseServer, isSyncConfigured, type SupabaseClientLike } from './supabaseServer';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

const envelope: Envelope = {
  v: 1,
  kdf: { name: 'PBKDF2-SHA256', iter: 600000, salt: 'c2FsdA==' },
  alg: 'AES-256-GCM',
  gz: true,
  iv: 'aXY=',
  ct: 'Y3Q=',
};
const SESSION = { user: { id: 'u1', email: 'a@b.co' }, access_token: 'ACCESS-TOKEN-1' };
const CODE = '987654';
const EMAIL = 'secret.person@example.com';

type Result = { data: unknown; error: unknown };
const ok = (data: unknown = null): Result => ({ data, error: null });
const fail = (error: unknown): Result => ({ data: null, error });

function makeClient(over: { session?: Result; maybeSingle?: Result; rpc?: Result; verify?: Result; otp?: Result } = {}) {
  const maybeSingle = vi.fn(async () => over.maybeSingle ?? ok(null));
  const select = vi.fn(() => ({ maybeSingle }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn(async (_name: string, _args: unknown) => over.rpc ?? ok([{ ok: true, version: 1 }]));
  const auth = {
    signInWithOtp: vi.fn(async (_p: unknown) => over.otp ?? ok({})),
    verifyOtp: vi.fn(async (_p: unknown) => over.verify ?? ok({ session: SESSION, user: SESSION.user })),
    getSession: vi.fn(async () => over.session ?? ok({ session: SESSION })),
    signOut: vi.fn(async () => ok(null)),
  };
  const client = { auth, from, rpc } as unknown as SupabaseClientLike;
  return { client, auth, from, select, maybeSingle, rpc };
}

async function kindOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(SyncServerError);
    return (e as SyncServerError).kind;
  }
  throw new Error('did not throw');
}

afterEach(() => vi.unstubAllEnvs());

describe('isSyncConfigured', () => {
  it('is true only when both variables are non-empty strings', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    expect(isSyncConfigured()).toBe(true);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    expect(isSyncConfigured()).toBe(false);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    expect(isSyncConfigured()).toBe(false);
  });
});

describe('default client', () => {
  it('uses IndexedDB session storage and disables redirect session detection', () => {
    const { client } = makeClient();
    vi.mocked(createClient).mockReturnValue(client as never);
    vi.stubEnv('VITE_SUPABASE_URL', 'https://x.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');

    createSupabaseServer();

    expect(createClient).toHaveBeenCalledTimes(1);
    const [url, key, options] = vi.mocked(createClient).mock.calls[0];
    expect([url, key]).toEqual(['https://x.supabase.co', 'anon']);
    expect(options?.auth).toMatchObject({
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: {
        getItem: expect.any(Function),
        setItem: expect.any(Function),
        removeItem: expect.any(Function),
      },
    });
  });
});

describe('sign-in', () => {
  it('requestCode asks for a code and allows new users', async () => {
    const { client, auth } = makeClient();
    await createSupabaseServer(client).requestCode(EMAIL);
    expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: EMAIL, options: { shouldCreateUser: true } });
  });

  it('verifyCode verifies an email code and returns the user id and email', async () => {
    const { client, auth } = makeClient();
    const s = await createSupabaseServer(client).verifyCode('a@b.co', CODE);
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'a@b.co', token: CODE, type: 'email' });
    expect(s).toEqual({ userId: 'u1', email: 'a@b.co' });
  });

  it('maps an invalid or expired code to auth', async () => {
    const { client } = makeClient({
      verify: fail({ name: 'AuthApiError', status: 403, code: 'otp_expired', message: `Token ${CODE} has expired` }),
    });
    expect(await kindOf(createSupabaseServer(client).verifyCode(EMAIL, CODE))).toBe('auth');
  });

  it('maps a rejected request (rate limit) to unknown and a dropped connection to network', async () => {
    const limited = makeClient({ otp: fail({ name: 'AuthApiError', status: 429, message: 'rate limit' }) });
    expect(await kindOf(createSupabaseServer(limited.client).requestCode(EMAIL))).toBe('unknown');
    const down = makeClient({ otp: fail({ name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' }) });
    expect(await kindOf(createSupabaseServer(down.client).requestCode(EMAIL))).toBe('network');
  });

  it('maps a thrown TypeError (fetch failure) to network', async () => {
    const { client, auth } = makeClient();
    auth.signInWithOtp.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await kindOf(createSupabaseServer(client).requestCode(EMAIL))).toBe('network');
  });

  it('session() reads the stored session, null when there is none', async () => {
    expect(await createSupabaseServer(makeClient().client).session()).toEqual({ userId: 'u1', email: 'a@b.co' });
    const none = makeClient({ session: ok({ session: null }) });
    expect(await createSupabaseServer(none.client).session()).toBeNull();
  });

  it('signOut calls auth.signOut', async () => {
    const { client, auth } = makeClient();
    await createSupabaseServer(client).signOut();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });

  it('signOut only ends this device (scope local), never every device', async () => {
    const { client, auth } = makeClient();
    await createSupabaseServer(client).signOut();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});

describe('getVault', () => {
  it('checks the session first and never queries without one', async () => {
    const { client, from } = makeClient({ session: ok({ session: null }) });
    expect(await kindOf(createSupabaseServer(client).getVault())).toBe('auth');
    expect(from).not.toHaveBeenCalled();
  });

  it('maps a getSession error to its kind', async () => {
    const { client, from } = makeClient({ session: fail({ name: 'AuthSessionMissingError', message: 'missing' }) });
    expect(await kindOf(createSupabaseServer(client).getVault())).toBe('auth');
    expect(from).not.toHaveBeenCalled();
  });

  it('selects the caller row and returns it', async () => {
    const { client, from, select } = makeClient({ maybeSingle: ok({ version: 4, envelope }) });
    expect(await createSupabaseServer(client).getVault()).toEqual({ version: 4, envelope });
    expect(from).toHaveBeenCalledWith('vaults');
    expect(select).toHaveBeenCalledWith('version, envelope');
  });

  it('returns null only when the row does not exist', async () => {
    const { client } = makeClient({ maybeSingle: ok(null) });
    expect(await createSupabaseServer(client).getVault()).toBeNull();
  });

  it('throws unknown for a malformed row, never null', async () => {
    for (const row of [
      { version: 1, envelope: { v: 1 } },
      { version: 'x', envelope },
      { version: 1 },
    ]) {
      const { client } = makeClient({ maybeSingle: ok(row) });
      expect(await kindOf(createSupabaseServer(client).getVault())).toBe('unknown');
    }
  });

  it('maps 401 / JWT errors to auth and fetch failures to network', async () => {
    const jwt = makeClient({ maybeSingle: fail({ code: 'PGRST301', message: 'JWT expired', status: 401 }) });
    expect(await kindOf(createSupabaseServer(jwt.client).getVault())).toBe('auth');
    const net = makeClient({ maybeSingle: fail({ message: 'TypeError: Failed to fetch', code: '' }) });
    expect(await kindOf(createSupabaseServer(net.client).getVault())).toBe('network');
    const other = makeClient({ maybeSingle: fail({ code: '42P01', message: 'boom', status: 500 }) });
    expect(await kindOf(createSupabaseServer(other.client).getVault())).toBe('unknown');
  });
});

describe('pushVault', () => {
  it('requires a session', async () => {
    const { client, rpc } = makeClient({ session: ok({ session: null }) });
    expect(await kindOf(createSupabaseServer(client).pushVault(0, envelope))).toBe('auth');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('calls push_vault and maps the row', async () => {
    const { client, rpc } = makeClient({ rpc: ok([{ ok: false, version: 7 }]) });
    expect(await createSupabaseServer(client).pushVault(3, envelope)).toEqual({ ok: false, version: 7 });
    expect(rpc).toHaveBeenCalledWith('push_vault', { expected_version: 3, new_envelope: envelope });
  });

  it('accepts a single object and a string bigint', async () => {
    const { client } = makeClient({ rpc: ok({ ok: true, version: '2' }) });
    expect(await createSupabaseServer(client).pushVault(1, envelope)).toEqual({ ok: true, version: 2 });
  });

  it('throws unknown for an unreadable result', async () => {
    const { client } = makeClient({ rpc: ok([]) });
    expect(await kindOf(createSupabaseServer(client).pushVault(1, envelope))).toBe('unknown');
  });

  it('maps the size exception to tooLarge', async () => {
    const { client } = makeClient({ rpc: fail({ code: 'P0001', message: 'vault too large', status: 400 }) });
    expect(await kindOf(createSupabaseServer(client).pushVault(1, envelope))).toBe('tooLarge');
  });
});

describe('replaceVault', () => {
  it('requires a session', async () => {
    const { client, rpc } = makeClient({ session: ok({ session: null }) });
    expect(await kindOf(createSupabaseServer(client).replaceVault(envelope))).toBe('auth');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('calls reset_vault and returns the version', async () => {
    const { client, rpc } = makeClient({ rpc: ok(5) });
    expect(await createSupabaseServer(client).replaceVault(envelope)).toEqual({ version: 5 });
    expect(rpc).toHaveBeenCalledWith('reset_vault', { new_envelope: envelope });
  });

  it('maps tooLarge, auth and unreadable results', async () => {
    const big = makeClient({ rpc: fail({ message: 'vault too large' }) });
    expect(await kindOf(createSupabaseServer(big.client).replaceVault(envelope))).toBe('tooLarge');
    const auth = makeClient({ rpc: fail({ status: 401, message: 'Unauthorized' }) });
    expect(await kindOf(createSupabaseServer(auth.client).replaceVault(envelope))).toBe('auth');
    const bad = makeClient({ rpc: ok('nope') });
    expect(await kindOf(createSupabaseServer(bad.client).replaceVault(envelope))).toBe('unknown');
  });
});

describe('expired or revoked sessions', () => {
  const refreshFailure = (code: string) => ({ name: 'AuthApiError', status: 400, code, message: 'refresh failed' });
  const callers: Array<[string, (s: ReturnType<typeof createSupabaseServer>) => Promise<unknown>]> = [
    ['session', (s) => s.session()],
    ['getVault', (s) => s.getVault()],
    ['pushVault', (s) => s.pushVault(1, envelope)],
    ['replaceVault', (s) => s.replaceVault(envelope)],
  ];

  for (const code of ['refresh_token_not_found', 'refresh_token_already_used', 'session_expired', 'session_not_found']) {
    it(`maps getSession failing with ${code} to auth for every call`, async () => {
      for (const [, run] of callers) {
        const { client } = makeClient({ session: fail(refreshFailure(code)) });
        expect(await kindOf(run(createSupabaseServer(client)))).toBe('auth');
      }
    });
  }

  it('maps the refresh-token and missing-session messages to auth', async () => {
    for (const [name, message] of [
      ['AuthApiError', 'Invalid Refresh Token: Refresh Token Not Found'],
      ['AuthSessionMissingError', 'Auth session missing!'],
    ]) {
      const { client } = makeClient({ session: fail({ name, status: 400, message }) });
      expect(await kindOf(createSupabaseServer(client).session())).toBe('auth');
    }
  });

  it('maps PostgREST 28000 and 42501 to auth on the vault calls', async () => {
    for (const code of ['28000', '42501']) {
      const pg = { code, message: 'denied', status: 403 };
      const vault = createSupabaseServer(makeClient({ maybeSingle: fail(pg) }).client);
      const rpc = createSupabaseServer(makeClient({ rpc: fail(pg) }).client);
      expect(await kindOf(vault.getVault())).toBe('auth');
      expect(await kindOf(rpc.pushVault(1, envelope))).toBe('auth');
      expect(await kindOf(rpc.replaceVault(envelope))).toBe('auth');
    }
  });

  it('keeps an unrelated 400 as unknown outside the code sign-in', async () => {
    const bad = { name: 'AuthApiError', status: 400, code: 'validation_failed', message: 'x' };
    const other = makeClient({ session: fail(bad) });
    expect(await kindOf(createSupabaseServer(other.client).session())).toBe('unknown');
  });

  it('keeps the thrown message fixed text', async () => {
    const leaky = `refresh_token_not_found ${CODE} ${EMAIL} ACCESS-TOKEN-1`;
    const bad = { name: 'AuthApiError', status: 400, code: 'session_expired', message: leaky };
    const { client } = makeClient({ session: fail(bad) });
    try {
      await createSupabaseServer(client).session();
      throw new Error('did not throw');
    } catch (e) {
      for (const secret of [CODE, EMAIL, 'ACCESS-TOKEN-1', 'refresh_token_not_found']) {
        expect((e as Error).message).not.toContain(secret);
      }
    }
  });
});

describe('no secrets in errors', () => {
  it('never puts the code, token, email or envelope into a message', async () => {
    const leaky = `${CODE} ${EMAIL} ACCESS-TOKEN-1 ${envelope.ct}`;
    const calls: Array<() => Promise<unknown>> = [];
    const mk = (o: Parameters<typeof makeClient>[0]) => createSupabaseServer(makeClient(o).client);
    calls.push(() => mk({ verify: fail({ status: 403, message: leaky }) }).verifyCode(EMAIL, CODE));
    calls.push(() => mk({ otp: fail({ status: 500, message: leaky }) }).requestCode(EMAIL));
    calls.push(() => mk({ maybeSingle: fail({ status: 500, message: leaky }) }).getVault());
    calls.push(() => mk({ rpc: fail({ status: 500, message: leaky }) }).pushVault(1, envelope));
    calls.push(() => mk({ rpc: fail({ status: 401, message: leaky }) }).replaceVault(envelope));
    for (const call of calls) {
      try {
        await call();
        throw new Error('did not throw');
      } catch (e) {
        const text = `${(e as Error).message} ${(e as Error).stack ?? ''}`;
        for (const secret of [CODE, EMAIL, 'ACCESS-TOKEN-1', envelope.ct]) expect(text).not.toContain(secret);
      }
    }
  });
});
