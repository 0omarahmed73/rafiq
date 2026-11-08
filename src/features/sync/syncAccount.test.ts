import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { decryptEnvelope, MAX_KDF_ITERATIONS } from './envelope';
import { parseRemote, sameSyncData, toSyncData } from './syncData';
import { createSyncEngine, type SyncEngine } from './syncEngine';
import { loadSyncKey, loadSyncMeta, createSessionStorage } from './syncKeyStore';
import {
  checkPassphrase,
  createSyncAccount,
  SyncAccountError,
  type SyncAccount,
  type SyncAccountErrorKind,
} from './syncAccount';
import { createFakeSyncServer, FAKE_CODE, type FakeBackingStore, type FakeSyncServer } from './syncServer.fake';

const PASS = 'correct horse';
const EMAIL = 'me@example.com';

interface Device {
  server: FakeSyncServer;
  repo: Repo;
  engine: SyncEngine;
  account: SyncAccount;
}

const engines: SyncEngine[] = [];

function device(shared?: FakeBackingStore): Device {
  const server = createFakeSyncServer({ shared });
  const repo = createMemoryRepo();
  const engine = createSyncEngine({ repo, server });
  engines.push(engine);
  const account = createSyncAccount({ server, engine, repo, iterations: 1000 });
  return { server, repo, engine, account };
}

async function signedIn(shared?: FakeBackingStore): Promise<Device> {
  const d = device(shared);
  await d.account.verifyCode(EMAIL, FAKE_CODE);
  return d;
}

function checkin(repo: Repo, note: string) {
  return repo.addCheckin({
    at: new Date().toISOString(),
    day: '2026-11-08',
    emotions: ['calm'],
    intensity: 3,
    tags: [],
    note,
    forNextSession: false,
  });
}

const notes = async (repo: Repo) => (await repo.exportAll()).checkins.map((c) => c.note).sort();
const snapshot = async (repo: Repo) => JSON.stringify(await repo.exportAll());

async function rejection(promise: Promise<unknown>): Promise<SyncAccountError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(SyncAccountError);
    return error as SyncAccountError;
  }
  throw new Error('expected a rejection');
}

async function expectKind(promise: Promise<unknown>, kind: SyncAccountErrorKind): Promise<void> {
  expect((await rejection(promise)).kind).toBe(kind);
}

async function cloud(d: Device, key: CryptoKey) {
  const session = await d.server.session();
  return parseRemote(await decryptEnvelope(key, session!.userId, d.server.vault()!.envelope));
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

afterEach(() => {
  vi.restoreAllMocks();
  engines.length = 0;
});

describe('checkPassphrase', () => {
  it('needs at least 10 characters', () => {
    expect(checkPassphrase('123456789')).toBe('tooShort');
    expect(checkPassphrase('1234567890')).toBe('ok');
  });
});

describe('sign-in', () => {
  it('requests a code and reports no vault for a new account', async () => {
    const d = device();
    await d.account.requestCode(EMAIL);
    expect(await d.account.verifyCode(EMAIL, FAKE_CODE)).toEqual({
      email: EMAIL,
      vault: 'none',
    });
  });

  it('reports an existing vault after another device created one', async () => {
    const a = await signedIn();
    await a.account.createVault(PASS);
    const b = device(a.server.shared);
    expect(await b.account.verifyCode(EMAIL, FAKE_CODE)).toEqual({
      email: EMAIL,
      vault: 'exists',
    });
  });

  it('keeps the session and reports vault unknown when the vault lookup fails, then vaultStatus retries', async () => {
    const d = device();
    d.server.failNext('network');
    expect(await d.account.verifyCode(EMAIL, FAKE_CODE)).toEqual({ email: EMAIL, vault: 'unknown' });
    expect(await d.server.session()).not.toBeNull();
    expect(await d.account.vaultStatus()).toBe('none');
    await signedIn(d.server.shared).then((a) => a.account.createVault(PASS));
    expect(await d.account.vaultStatus()).toBe('exists');
  });

  it('vaultStatus rejects when signed out or offline', async () => {
    const d = device();
    await expectKind(d.account.vaultStatus(), 'notSignedIn');
    await d.account.verifyCode(EMAIL, FAKE_CODE);
    d.server.failNext('network');
    await expectKind(d.account.vaultStatus(), 'network');
  });

  it('maps a wrong code to an auth error and a network failure to network', async () => {
    const d = device();
    await expectKind(d.account.verifyCode(EMAIL, '000000'), 'auth');
    d.server.setOffline(true);
    await expectKind(d.account.requestCode(EMAIL), 'network');
  });
});

describe('createVault', () => {
  it('caches a key with a new 16-byte salt and runs the first sync', async () => {
    const d = await signedIn();
    await checkin(d.repo, 'mine');
    await d.account.createVault(PASS);

    const stored = await loadSyncKey();
    expect(stored).not.toBeNull();
    expect(atob(stored!.salt)).toHaveLength(16);
    expect(stored!.iter).toBe(1000);
    expect(d.server.vault()!.version).toBe(1);
    const remote = await cloud(d, stored!.key);
    expect(sameSyncData(remote, toSyncData(await d.repo.exportAll()))).toBe(true);
    expect(d.engine.getState()).toMatchObject({ status: 'idle', email: EMAIL });
    expect((await loadSyncMeta()).version).toBe(1);
  });

  it('rejects a short passphrase with tooShort and touches nothing', async () => {
    const d = await signedIn();
    await checkin(d.repo, 'mine');
    const before = await snapshot(d.repo);
    await expectKind(d.account.createVault('short'), 'tooShort');
    expect(await loadSyncKey()).toBeNull();
    expect(d.server.vault()).toBeNull();
    expect(d.server.pushCount()).toBe(0);
    expect(await snapshot(d.repo)).toBe(before);
  });

  it('rejects when signed out', async () => {
    const d = device();
    await expectKind(d.account.createVault(PASS), 'notSignedIn');
    expect(await loadSyncKey()).toBeNull();
  });

  it('refuses to start a second vault when a cloud copy exists', async () => {
    const a = await signedIn();
    await a.account.createVault(PASS);
    const keyA = (await loadSyncKey())!;
    const b = await signedIn(a.server.shared);
    await expectKind(b.account.createVault('another passphrase'), 'vaultExists');
    expect((await loadSyncKey())!.salt).toBe(keyA.salt);
    expect(a.server.vault()!.version).toBe(1);
  });
});

describe('unlockVault', () => {
  async function twoDevices() {
    const a = await signedIn();
    await checkin(a.repo, 'from a');
    await a.account.createVault(PASS);
    const keyA = await loadSyncKey();
    globalThis.indexedDB = new IDBFactory(); // device b has its own key store
    const b = await signedIn(a.server.shared);
    return { a, b, keyA: keyA! };
  }

  it('returns true, caches the key and merges both ways', async () => {
    const { a, b, keyA } = await twoDevices();
    await checkin(b.repo, 'only on b');
    expect(await b.account.unlockVault(PASS)).toBe(true);

    const stored = await loadSyncKey();
    expect(stored).not.toBeNull();
    expect(stored!.salt).toBe(keyA.salt);
    expect(stored!.iter).toBe(1000);
    expect(await notes(b.repo)).toEqual(['from a', 'only on b']);
    const remote = await cloud(a, keyA.key);
    expect(remote.checkins.map((c) => c.note).sort()).toEqual(['from a', 'only on b']);
    expect(b.engine.getState().status).toBe('idle');
  });

  it('returns false for a wrong passphrase and leaves local data and the key store untouched', async () => {
    const { a, b } = await twoDevices();
    await checkin(b.repo, 'only on b');
    const before = await snapshot(b.repo);
    const version = a.server.vault()!.version;
    expect(await b.account.unlockVault('not the passphrase')).toBe(false);
    expect(await loadSyncKey()).toBeNull();
    expect(await snapshot(b.repo)).toBe(before);
    expect(a.server.vault()!.version).toBe(version);
    expect(b.engine.getState().status).toBe('off');
  });

  it('rejects when signed out', async () => {
    const d = device();
    await expectKind(d.account.unlockVault(PASS), 'notSignedIn');
  });

  it('rejects with noVault when there is no cloud copy', async () => {
    const d = await signedIn();
    await expectKind(d.account.unlockVault(PASS), 'noVault');
    expect(await loadSyncKey()).toBeNull();
  });

  it.each([
    ['a newer envelope version', (e: Record<string, unknown>) => ({ ...e, v: 2 })],
    [
      'an iteration count above the cap',
      (e: Record<string, unknown>) => ({
        ...e,
        kdf: { ...(e.kdf as object), iter: MAX_KDF_ITERATIONS + 1 },
      }),
    ],
  ])('rejects with newerVersion for %s without deriving a key', async (_name, tamper) => {
    const { a, b } = await twoDevices();
    a.server.setEnvelope(tamper(a.server.vault()!.envelope as unknown as Record<string, unknown>));
    const importKey = vi.spyOn(crypto.subtle, 'importKey');
    const deriveKey = vi.spyOn(crypto.subtle, 'deriveKey');
    await expectKind(b.account.unlockVault(PASS), 'newerVersion');
    expect(importKey).not.toHaveBeenCalled();
    expect(deriveKey).not.toHaveBeenCalled();
    expect(await loadSyncKey()).toBeNull();
  });
});

describe('resetVault', () => {
  it('replaces the cloud copy under a new salt with this device data and keeps the previous copy', async () => {
    const a = await signedIn();
    await a.account.createVault(PASS);
    const oldKey = (await loadSyncKey())!;
    const oldEnvelope = a.server.vault()!.envelope;
    await checkin(a.repo, 'after');

    await a.account.resetVault('a brand new passphrase');
    const fresh = (await loadSyncKey())!;
    expect(fresh.salt).not.toBe(oldKey.salt);
    expect(fresh.iter).toBe(1000);
    const row = a.server.vault()!;
    expect(row.version).toBe(2);
    expect(row.envelope.kdf.salt).toBe(fresh.salt);
    expect(a.server.prevEnvelope()).toEqual(oldEnvelope);
    expect((await cloud(a, fresh.key)).checkins.map((c) => c.note)).toEqual(['after']);
    expect(await loadSyncMeta()).toMatchObject({ version: 2 });
    expect(a.engine.getState().status).toBe('idle');
  });

  it('makes another device report keyChanged on its next sync', async () => {
    const a = await signedIn();
    await a.account.createVault(PASS);
    globalThis.indexedDB = new IDBFactory();
    const b = await signedIn(a.server.shared);
    expect(await b.account.unlockVault(PASS)).toBe(true);
    const keyB = (await loadSyncKey())!;

    globalThis.indexedDB = new IDBFactory();
    await checkin(a.repo, 'a data');
    // a's identity was in the previous store; re-cache before the reset
    expect(await a.account.unlockVault(PASS)).toBe(true);
    await a.account.resetVault('a brand new passphrase');

    globalThis.indexedDB = new IDBFactory();
    const { saveSyncKey } = await import('./syncKeyStore');
    await saveSyncKey(keyB);
    await b.engine.refresh();
    await b.engine.syncNow();
    expect(b.engine.getState()).toMatchObject({
      status: 'attention',
      issue: 'keyChanged',
    });
  });

  it('leaves the old key and meta untouched when the server fails', async () => {
    const a = await signedIn();
    await checkin(a.repo, 'mine');
    await a.account.createVault(PASS);
    const oldKey = (await loadSyncKey())!;
    const oldMeta = await loadSyncMeta();
    const oldEnvelope = a.server.vault()!.envelope;

    a.server.failNext('network');
    await expectKind(a.account.resetVault('a brand new passphrase'), 'network');
    const after = (await loadSyncKey())!;
    expect(after.salt).toBe(oldKey.salt);
    expect(await loadSyncMeta()).toEqual(oldMeta);
    expect(a.server.vault()!.envelope).toEqual(oldEnvelope);
  });

  it('rejects a short passphrase and needs a session', async () => {
    const a = await signedIn();
    await checkin(a.repo, 'mine');
    await a.account.createVault(PASS);
    const key = (await loadSyncKey())!;
    const meta = await loadSyncMeta();
    const envelope = a.server.vault()!.envelope;
    await expectKind(a.account.resetVault('short'), 'tooShort');
    expect((await loadSyncKey())!.salt).toBe(key.salt);
    expect(await loadSyncMeta()).toEqual(meta);
    expect(a.server.vault()!.envelope).toEqual(envelope);
    const b = device();
    await expectKind(b.account.resetVault('a brand new passphrase'), 'notSignedIn');
  });

  it('rejects with emptyLocal when this device has no records, and touches nothing', async () => {
    const a = await signedIn();
    await checkin(a.repo, 'mine');
    await a.account.createVault(PASS);
    const envelope = a.server.vault()!.envelope;
    globalThis.indexedDB = new IDBFactory(); // a fresh phone: no key, no data
    const b = await signedIn(a.server.shared);
    const keyBefore = await loadSyncKey();
    const metaBefore = await loadSyncMeta();
    const vaultBefore = b.server.vault();

    await expectKind(b.account.resetVault('a brand new passphrase'), 'emptyLocal');
    expect(await loadSyncKey()).toEqual(keyBefore);
    expect(await loadSyncMeta()).toEqual(metaBefore);
    expect(b.server.vault()).toEqual(vaultBefore);
    expect(b.server.vault()!.envelope).toEqual(envelope);
  });

  it('replaces the cloud copy with an empty one when allowEmpty is true', async () => {
    const a = await signedIn();
    await a.account.createVault(PASS);
    await a.account.resetVault('a brand new passphrase', { allowEmpty: true });
    expect(a.server.vault()!.version).toBe(2);
    expect((await loadSyncKey())!.salt).toBe(a.server.vault()!.envelope.kdf.salt);
  });

  it('counts the records to upload, without settings', async () => {
    const a = await signedIn();
    expect(await a.account.localRecordCount()).toBe(0);
    await checkin(a.repo, 'one');
    await checkin(a.repo, 'two');
    await a.repo.saveNote({ id: 'n1', text: 'a note' } as never);
    expect(await a.account.localRecordCount()).toBe(3);
    await a.repo.deleteNote('n1');
    expect(await a.account.localRecordCount()).toBe(2);
  });

  it('clears stale attention/damaged state after a successful reset', async () => {
    const a = await signedIn();
    await checkin(a.repo, 'mine');
    await a.account.createVault(PASS);
    a.server.setEnvelope({ v: 1, junk: true });
    await a.engine.syncNow();
    expect(a.engine.getState()).toMatchObject({ status: 'attention', issue: 'damaged' });

    await a.account.resetVault('a brand new passphrase');
    expect(a.engine.getState()).toMatchObject({ status: 'idle' });
    expect(a.engine.getState().issue).toBeUndefined();
  });

  it('maps a server tooLarge error and keeps the old key and meta', async () => {
    const a = await signedIn();
    await checkin(a.repo, 'mine');
    await a.account.createVault(PASS);
    const keyBefore = (await loadSyncKey())!;
    const metaBefore = await loadSyncMeta();
    const vaultBefore = a.server.vault();
    a.server.failNext('tooLarge');

    await expectKind(a.account.resetVault('a brand new passphrase'), 'tooLarge');
    expect((await loadSyncKey())!.salt).toBe(keyBefore.salt);
    expect((await loadSyncKey())!.iter).toBe(keyBefore.iter);
    expect(await loadSyncMeta()).toEqual(metaBefore);
    expect(a.server.vault()).toEqual(vaultBefore);
  });

  it('works when no cloud copy exists yet', async () => {
    const a = await signedIn();
    await checkin(a.repo, 'solo');
    await a.account.resetVault('a brand new passphrase');
    expect(a.server.vault()!.version).toBe(1);
    expect((await loadSyncKey())!.salt).toBe(a.server.vault()!.envelope.kdf.salt);
  });
});

describe('signOut', () => {
  it('clears key, meta and session, keeps local data and the cloud copy, and turns the engine off', async () => {
    const a = await signedIn();
    await checkin(a.repo, 'mine');
    await a.account.createVault(PASS);
    await createSessionStorage().setItem('token', 'x');
    const local = await snapshot(a.repo);
    const envelope = a.server.vault()!.envelope;
    expect(a.engine.getState().status).toBe('idle');

    await a.account.signOut();
    expect(await loadSyncKey()).toBeNull();
    expect(await loadSyncMeta()).toEqual({ version: 0 });
    expect(await createSessionStorage().getItem('token')).toBeNull();
    expect(await a.server.session()).toBeNull();
    expect(a.engine.getState()).toEqual({ status: 'off' });
    expect(await snapshot(a.repo)).toBe(local);
    expect(a.server.shared.vaults.size).toBe(1);
    expect(Array.from(a.server.shared.vaults.values())[0].envelope).toEqual(envelope);
  });

  it('still clears the identity when the server sign-out fails', async () => {
    const a = await signedIn();
    await a.account.createVault(PASS);
    await createSessionStorage().setItem('token', 'x');
    const refresh = vi.spyOn(a.engine, 'refresh');
    a.server.signOut = () => Promise.reject(new Error('boom'));
    await a.account.signOut();
    expect(await loadSyncKey()).toBeNull();
    expect(await loadSyncMeta()).toEqual({ version: 0 });
    expect(await createSessionStorage().getItem('token')).toBeNull();
    expect(refresh).toHaveBeenCalledOnce();
    expect(a.engine.getState()).toEqual({ status: 'off' });
  });
});

describe('secrets', () => {
  it('never put the passphrase in an error or a log', async () => {
    const secret = 'super secret phrase 42';
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => undefined),
    );
    const a = await signedIn();
    await a.account.createVault(secret);
    const errors: string[] = [];
    const b = await signedIn(a.server.shared);
    await checkin(b.repo, 'b data');
    for (const run of [
      () => b.account.unlockVault('wrong wrong wrong'),
      () => b.account.createVault(secret),
      () => {
        b.server.failNext('network');
        return b.account.resetVault(secret);
      },
    ]) {
      try {
        await run();
      } catch (error) {
        errors.push(JSON.stringify(error), String((error as Error).stack), (error as Error).message);
      }
    }
    const logged = spies.flatMap((s) => s.mock.calls).map((c) => JSON.stringify(c));
    for (const text of [...errors, ...logged]) {
      expect(text).not.toContain(secret);
      expect(text).not.toContain('wrong wrong wrong');
    }
    expect(spies.every((s) => s.mock.calls.length === 0)).toBe(true);
  });
});
