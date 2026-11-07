import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRepo } from '../../db/memoryRepo';
import type { Repo } from '../../db/repo';
import { decryptEnvelope, deriveVaultKey, encryptEnvelope, newSalt } from './envelope';
import { parseRemote, sameSyncData, toPlaintext, toSyncData, type SyncData } from './syncData';
import { createSyncEngine, type SyncEngine, type SyncState } from './syncEngine';
import { clearSyncIdentity, loadSyncMeta, saveSyncKey, type SyncKey } from './syncKeyStore';
import { createFakeSyncServer, FAKE_CODE, type FakeBackingStore, type FakeSyncServer } from './syncServer.fake';

const PASS = 'a long test passphrase';
const ITER = 1000;
const EMAIL = 'me@example.com';
const T0 = new Date('2026-11-08T09:00:00.000Z');

interface Device {
  server: FakeSyncServer;
  repo: Repo;
  engine: SyncEngine;
}

const engines: SyncEngine[] = [];

async function makeKey(salt: string = newSalt()): Promise<SyncKey> {
  return { key: await deriveVaultKey(PASS, salt, ITER), salt, iter: ITER };
}

async function cacheKey(salt?: string): Promise<SyncKey> {
  const k = await makeKey(salt);
  await saveSyncKey(k);
  return k;
}

async function device(shared?: FakeBackingStore, signIn = true): Promise<Device> {
  const server = createFakeSyncServer({ shared });
  if (signIn) await server.verifyCode(EMAIL, FAKE_CODE);
  const repo = createMemoryRepo();
  const engine = createSyncEngine({ repo, server });
  engines.push(engine);
  return { server, repo, engine };
}

/** Passes real macrotasks (setImmediate is not faked) until `done()` holds; IndexedDB and WebCrypto progress. */
async function until(done: () => boolean, limit = 5000): Promise<void> {
  for (let i = 0; i < limit && !done(); i++) await new Promise((resolve) => setImmediate(resolve));
  expect(done()).toBe(true);
}

/** Lets an in-flight run settle when nothing observable is expected to happen. */
async function settle(rounds = 300): Promise<void> {
  for (let i = 0; i < rounds; i++) await new Promise((resolve) => setImmediate(resolve));
}

async function cloud(server: FakeSyncServer, k: SyncKey): Promise<SyncData> {
  const session = await server.session();
  return parseRemote(await decryptEnvelope(k.key, session!.userId, server.vault()!.envelope));
}

const snapshot = async (repo: Repo) => JSON.stringify(await repo.exportAll());

function later(ms = 1000): void {
  vi.setSystemTime(Date.now() + ms);
}

async function checkin(repo: Repo, note: string) {
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

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
  });
  vi.setSystemTime(T0);
});

afterEach(async () => {
  for (const engine of engines.splice(0)) engine.stop();
  await settle(20);
  vi.useRealTimers();
});

describe('sync engine: state', () => {
  it('is off without a session or without a cached key, and idle once both exist', async () => {
    const { server, engine } = await device(undefined, false);
    expect(engine.getState()).toEqual({ status: 'off' });
    await engine.refresh();
    expect(engine.getState().status).toBe('off');

    await server.verifyCode(EMAIL, FAKE_CODE);
    await engine.refresh();
    expect(engine.getState().status).toBe('off');

    await cacheKey();
    const seen: SyncState[] = [];
    engine.subscribe((s) => seen.push(s));
    await engine.refresh();
    expect(engine.getState()).toEqual({ status: 'idle', email: EMAIL });
    expect(seen).toEqual([{ status: 'idle', email: EMAIL }]);
  });

  it('never touches the repo or the server while off', async () => {
    const { server, repo, engine } = await device(undefined, false);
    const calls: string[] = [];
    for (const name of Object.keys(repo) as (keyof Repo)[]) {
      vi.spyOn(repo, name).mockImplementation((() => {
        calls.push(name);
        return Promise.resolve();
      }) as never);
    }
    const getVault = vi.spyOn(server, 'getVault');
    await engine.syncNow();
    await cacheKey();
    await engine.syncNow();
    expect(engine.getState().status).toBe('off');
    expect(calls).toEqual([]);
    expect(getVault).not.toHaveBeenCalled();
  });
});

describe('sync engine: syncing', () => {
  it('makes the first push to an empty cloud', async () => {
    const { server, repo, engine } = await device();
    const k = await cacheKey();
    await checkin(repo, 'first');
    await engine.syncNow();

    expect(server.vault()!.version).toBe(1);
    expect((await cloud(server, k)).checkins.map((c) => c.note)).toEqual(['first']);
    expect(server.vault()!.envelope.kdf).toEqual({
      name: 'PBKDF2-SHA256',
      iter: ITER,
      salt: k.salt,
    });
    const state = engine.getState();
    expect(state.status).toBe('idle');
    expect(state.lastSyncedAt).toBe(T0.toISOString());
    expect(await loadSyncMeta()).toEqual({
      version: 1,
      lastSyncedAt: T0.toISOString(),
    });
  });

  it('merges a second device with the cloud and back', async () => {
    const a = await device();
    const b = await device(a.server.shared);
    const k = await cacheKey();
    await checkin(a.repo, 'from A');
    await a.engine.syncNow();
    later();
    await checkin(b.repo, 'from B');
    await b.engine.syncNow();

    expect(await notes(b.repo)).toEqual(['from A', 'from B']);
    expect(a.server.vault()!.version).toBe(2);
    expect((await cloud(a.server, k)).checkins.map((c) => c.note).sort()).toEqual(['from A', 'from B']);
    await a.engine.syncNow();
    expect(await notes(a.repo)).toEqual(['from A', 'from B']);
    expect(a.server.vault()!.version).toBe(2);
  });

  it('propagates a deletion', async () => {
    const a = await device();
    const b = await device(a.server.shared);
    await cacheKey();
    await a.repo.saveNote({
      id: 'n1',
      text: 'keep?',
      createdAt: T0.toISOString(),
    });
    await a.engine.syncNow();
    await b.engine.syncNow();
    expect((await b.repo.listNotes()).map((n) => n.id)).toEqual(['n1']);

    later();
    await a.repo.deleteNote('n1');
    await a.engine.syncNow();
    await b.engine.syncNow();
    expect(await b.repo.listNotes()).toEqual([]);
    expect(await a.repo.listNotes()).toEqual([]);
  });

  it('keeps the latest edit on both devices', async () => {
    const a = await device();
    const b = await device(a.server.shared);
    await cacheKey();
    await a.repo.saveNote({
      id: 'n1',
      text: 'v1',
      createdAt: T0.toISOString(),
    });
    await a.engine.syncNow();
    await b.engine.syncNow();

    later();
    await a.repo.saveNote({
      id: 'n1',
      text: 'A edit',
      createdAt: T0.toISOString(),
    });
    later();
    await b.repo.saveNote({
      id: 'n1',
      text: 'B edit, later',
      createdAt: T0.toISOString(),
    });
    await a.engine.syncNow();
    await b.engine.syncNow();
    await a.engine.syncNow();
    expect((await a.repo.listNotes())[0].text).toBe('B edit, later');
    expect((await b.repo.listNotes())[0].text).toBe('B edit, later');
  });

  it('pulls, merges and pushes again when another device pushed in between', async () => {
    const a = await device();
    const b = await device(a.server.shared);
    const k = await cacheKey();
    await checkin(a.repo, 'from A');
    later();
    await checkin(b.repo, 'from B');
    // B's push lands between A's pull and A's push.
    a.server.beforeNextPush(() => b.engine.syncNow());
    await a.engine.syncNow();

    expect(a.engine.getState().status).toBe('idle');
    expect(await notes(a.repo)).toEqual(['from A', 'from B']);
    expect(a.server.vault()!.version).toBe(2);
    expect((await cloud(a.server, k)).checkins.map((c) => c.note).sort()).toEqual(['from A', 'from B']);
  });

  it('gives up after 3 refused pushes with busy, keeps local data and retries later', async () => {
    const { server, repo, engine } = await device();
    await cacheKey();
    await checkin(repo, 'mine');
    const before = await snapshot(repo);
    server.refuseAlways(true);
    await engine.syncNow();

    expect(engine.getState()).toMatchObject({
      status: 'attention',
      issue: 'busy',
    });
    expect(server.pushCount()).toBe(3);
    expect(await snapshot(repo)).toBe(before);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('refuses a push expecting no row when one exists, and the engine merges instead of overwriting', async () => {
    const a = await device();
    const b = await device(a.server.shared);
    const k = await cacheKey();
    await checkin(a.repo, 'from A');
    await a.engine.syncNow();

    const stale = await encryptEnvelope(
      k.key,
      k.salt,
      'user-1',
      toPlaintext((await b.repo.exportAll()) as SyncData),
      ITER,
    );
    expect(await b.server.pushVault(0, stale)).toEqual({
      ok: false,
      version: 1,
    });

    later();
    await checkin(b.repo, 'from B');
    await b.engine.syncNow();
    expect((await cloud(b.server, k)).checkins.map((c) => c.note).sort()).toEqual(['from A', 'from B']);
    expect(await notes(b.repo)).toEqual(['from A', 'from B']);
  });

  it('pushes nothing and schedules nothing when there is nothing to change', async () => {
    const { server, repo, engine } = await device();
    await cacheKey();
    await checkin(repo, 'once');
    await engine.syncNow();
    const pushes = server.pushCount();
    await engine.syncNow();
    await engine.syncNow();
    expect(server.pushCount()).toBe(pushes);
    expect(vi.getTimerCount()).toBe(0);
    expect(engine.getState().status).toBe('idle');
  });
});

describe('sync engine: never overwriting local data', () => {
  async function seeded() {
    const a = await device();
    const k = await cacheKey();
    await checkin(a.repo, 'cloud');
    await a.engine.syncNow();
    const b = await device(a.server.shared);
    await checkin(b.repo, 'local only');
    return { a, b, k, before: await snapshot(b.repo) };
  }

  async function expectUntouched(b: Device, before: string, issue: string) {
    const pushes = b.server.pushCount();
    await b.engine.syncNow();
    expect(b.engine.getState()).toMatchObject({ status: 'attention', issue });
    expect(await snapshot(b.repo)).toBe(before);
    expect(b.server.pushCount()).toBe(pushes);
    expect(vi.getTimerCount()).toBe(0);
  }

  it('reports damaged when the cached key cannot open a copy with the same salt', async () => {
    const { b, k, before } = await seeded();
    const other = await deriveVaultKey('another passphrase', k.salt, ITER);
    const foreign = await encryptEnvelope(
      other,
      k.salt,
      'user-1',
      toPlaintext((await b.repo.exportAll()) as SyncData),
      ITER,
    );
    b.server.setEnvelope(foreign);
    await expectUntouched(b, before, 'damaged');
  });

  it('reports damaged for a tampered ciphertext', async () => {
    const { b, before } = await seeded();
    const envelope = b.server.vault()!.envelope;
    const bytes = Uint8Array.from(atob(envelope.ct), (c) => c.charCodeAt(0));
    bytes[0] ^= 0xff;
    b.server.setEnvelope({
      ...envelope,
      ct: btoa(String.fromCharCode(...bytes)),
    });
    await expectUntouched(b, before, 'damaged');
  });

  it('reports newerVersion for an unknown envelope version', async () => {
    const { b, before } = await seeded();
    b.server.setEnvelope({ ...b.server.vault()!.envelope, v: 2 });
    await expectUntouched(b, before, 'newerVersion');
  });

  it('reports newerVersion for an absurd iteration count', async () => {
    const { b, before } = await seeded();
    const envelope = b.server.vault()!.envelope;
    b.server.setEnvelope({ ...envelope, kdf: { ...envelope.kdf, iter: 1e9 } });
    await expectUntouched(b, before, 'newerVersion');
  });

  it('reports damaged for an envelope without the expected shape', async () => {
    const { b, before } = await seeded();
    b.server.setEnvelope({ v: 1, nonsense: true });
    await expectUntouched(b, before, 'damaged');
  });

  it('reports damaged when the decrypted data is not a backup', async () => {
    const { b, k, before } = await seeded();
    b.server.setEnvelope(await encryptEnvelope(k.key, k.salt, 'user-1', { hello: 'world' }, ITER));
    await expectUntouched(b, before, 'damaged');
  });

  it('reports keyChanged after a reset on another device, without writing or pushing', async () => {
    const { a, b, before } = await seeded();
    const fresh = await makeKey();
    await a.server.resetVault();
    const data = (await a.repo.exportAll()) as SyncData;
    expect(
      (await a.server.pushVault(0, await encryptEnvelope(fresh.key, fresh.salt, 'user-1', toPlaintext(data), ITER))).ok,
    ).toBe(true);
    await expectUntouched(b, before, 'keyChanged');
  });

  it('reports keyChanged when only the iteration count differs', async () => {
    const { b, k, before } = await seeded();
    const stronger = await deriveVaultKey(PASS, k.salt, 2000);
    const data = toPlaintext((await b.repo.exportAll()) as SyncData);
    b.server.setEnvelope(await encryptEnvelope(stronger, k.salt, 'user-1', data, 2000));
    await expectUntouched(b, before, 'keyChanged');
  });

  it('stays off and leaves an erased repo empty when the identity is cleared mid-run', async () => {
    const { server, repo, engine } = await device();
    await cacheKey();
    await checkin(repo, 'pushed');
    await engine.syncNow();
    const other = createMemoryRepo();
    const fresh = createSyncEngine({ repo: other, server });
    engines.push(fresh);
    server.beforeNextGet(async () => {
      await clearSyncIdentity();
    });
    const pushes = server.pushCount();
    await fresh.syncNow();
    expect(fresh.getState()).toEqual({ status: 'off' });
    expect((await other.exportAll()).checkins).toEqual([]);
    expect(server.pushCount()).toBe(pushes);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps passphrase and key material out of the state', async () => {
    const { server, repo, engine } = await device();
    const k = await cacheKey();
    const seen: SyncState[] = [];
    engine.subscribe((s) => seen.push(s));
    await checkin(repo, 'x');
    await engine.syncNow();
    server.setEnvelope({ ...server.vault()!.envelope, ct: 'AAAA' });
    await engine.syncNow();
    const text = JSON.stringify(seen);
    expect(text).not.toContain(PASS);
    expect(text).not.toContain(k.salt);
    expect(text).not.toContain('user-1');
    for (const s of seen)
      expect(Object.keys(s).every((key) => ['status', 'issue', 'lastSyncedAt', 'email'].includes(key))).toBe(true);
  });
});

describe('sync engine: two devices', () => {
  it('converges and then stops pushing', async () => {
    const a = await device();
    const b = await device(a.server.shared);
    await cacheKey();
    await checkin(a.repo, 'A');
    later();
    await checkin(b.repo, 'B');
    for (let round = 0; round < 2; round++) {
      await a.engine.syncNow();
      await b.engine.syncNow();
    }
    const pushes = a.server.pushCount();
    await a.engine.syncNow();
    await b.engine.syncNow();
    expect(a.server.pushCount()).toBe(pushes);
    // Same content on both devices (key order inside rows may differ).
    expect(sameSyncData(toSyncData(await a.repo.exportAll()), toSyncData(await b.repo.exportAll()))).toBe(true);
  });

  it('syncs settings but keeps the device-only fields of each device', async () => {
    const a = await device();
    const b = await device(a.server.shared);
    await cacheKey();
    await b.repo.saveSettings({
      id: 'settings',
      theme: 'system',
      language: 'ar',
      reminderTime: '07:00',
      lastReminderDay: '2026-11-07',
      lastBackupAt: '2026-11-01T00:00:00.000Z',
    });
    await b.engine.syncNow();
    later();
    await a.repo.saveSettings({
      id: 'settings',
      theme: 'dark',
      language: 'en',
      accent: 'rose',
      reminderTime: '21:30',
    });
    const sent = (await a.repo.getSettings()).updatedAt;
    await a.engine.syncNow();
    await b.engine.syncNow();

    expect(await b.repo.getSettings()).toEqual({
      id: 'settings',
      theme: 'dark',
      language: 'en',
      accent: 'rose',
      reminderTime: '07:00',
      lastReminderDay: '2026-11-07',
      lastBackupAt: '2026-11-01T00:00:00.000Z',
      updatedAt: sent,
    });
    expect((await a.repo.getSettings()).reminderTime).toBe('21:30');
    const pushes = a.server.pushCount();
    await a.engine.syncNow();
    await b.engine.syncNow();
    expect(a.server.pushCount()).toBe(pushes);
  });

  it('never syncs photos and removes local photos of a homework deleted elsewhere', async () => {
    const a = await device();
    const b = await device(a.server.shared);
    const k = await cacheKey();
    const at = T0.toISOString();
    await b.repo.saveHomework({
      id: 'h1',
      sessionId: 's1',
      text: 'Write',
      done: false,
      createdAt: at,
    });
    await b.repo.saveHomeworkImage({
      id: 'p1',
      homeworkId: 'h1',
      dataUrl: 'data:image/jpeg;base64,AAAA',
      createdAt: at,
    });
    await b.engine.syncNow();
    expect(JSON.stringify(a.server.vault())).not.toContain('AAAA');

    await a.engine.syncNow();
    expect((await a.repo.listHomework()).map((h) => h.id)).toEqual(['h1']);
    expect(await a.repo.listHomeworkImages('h1')).toEqual([]);

    later();
    await a.repo.deleteHomework('h1');
    await a.engine.syncNow();
    await b.engine.syncNow();
    const all = await b.repo.exportAll();
    expect(all.homework).toEqual([]);
    expect(all.homeworkImages).toEqual([]);
    expect(all.syncTombstones.some((t) => t.table === 'homeworkImages')).toBe(true);
    const remote = await cloud(b.server, k);
    expect(remote.syncTombstones.some((t) => t.table === 'homeworkImages')).toBe(false);
    const pushes = a.server.pushCount();
    await b.engine.syncNow();
    expect(a.server.pushCount()).toBe(pushes);
  });
});

describe('sync engine: errors and backoff', () => {
  it('goes offline and retries after 30 s, 2 min, 10 min, then every 30 min; success resets', async () => {
    const { server, repo, engine } = await device();
    await cacheKey();
    await checkin(repo, 'x');
    const getVault = vi.spyOn(server, 'getVault');
    server.setOffline(true);
    await engine.syncNow();
    expect(engine.getState().status).toBe('offline');
    expect(getVault).toHaveBeenCalledTimes(1);

    let calls = 1;
    for (const wait of [30_000, 120_000, 600_000, 1_800_000, 1_800_000]) {
      await vi.advanceTimersByTimeAsync(wait - 1);
      expect(getVault).toHaveBeenCalledTimes(calls);
      await vi.advanceTimersByTimeAsync(1);
      calls++;
      await until(
        () =>
          getVault.mock.calls.length === calls && engine.getState().status === 'offline' && vi.getTimerCount() === 1,
      );
    }

    server.setOffline(false);
    await vi.advanceTimersByTimeAsync(1_800_000);
    await until(() => engine.getState().status === 'idle');
    expect(vi.getTimerCount()).toBe(0);

    server.setOffline(true);
    await engine.syncNow();
    expect(engine.getState().status).toBe('offline');
    await vi.advanceTimersByTimeAsync(30_000);
    await until(() => getVault.mock.calls.length === calls + 2 && vi.getTimerCount() === 1);
  });

  it('runs a manual sync now and resets the backoff', async () => {
    const { server, engine } = await device();
    await cacheKey();
    const getVault = vi.spyOn(server, 'getVault');
    server.setOffline(true);
    await engine.syncNow();
    await vi.advanceTimersByTimeAsync(30_000);
    await until(() => getVault.mock.calls.length === 2 && vi.getTimerCount() === 1);

    engine.requestSync('manual');
    await until(() => getVault.mock.calls.length === 3 && vi.getTimerCount() === 1);
    await vi.advanceTimersByTimeAsync(29_999);
    expect(getVault).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1);
    await until(() => getVault.mock.calls.length === 4);
  });

  it('asks to sign in again on an auth error and does not retry by itself', async () => {
    const { server, engine } = await device();
    await cacheKey();
    server.failNext('auth');
    await engine.syncNow();
    expect(engine.getState()).toMatchObject({
      status: 'attention',
      issue: 'auth',
      email: EMAIL,
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reports tooLarge for an envelope over 5 MB and does not retry', async () => {
    const { server, repo, engine } = await device();
    await cacheKey();
    const bytes = new Uint8Array(4 * 1024 * 1024);
    for (let i = 0; i < bytes.length; i += 65536) crypto.getRandomValues(bytes.subarray(i, i + 65536));
    let big = '';
    for (let i = 0; i < bytes.length; i += 0x8000) big += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    await checkin(repo, btoa(big));
    const before = await snapshot(repo);
    await engine.syncNow();
    expect(engine.getState()).toMatchObject({
      status: 'attention',
      issue: 'tooLarge',
    });
    expect(server.vault()).toBeNull();
    expect(await snapshot(repo)).toBe(before);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reports unknown for an unexpected server error and retries later', async () => {
    const { server, engine } = await device();
    await cacheKey();
    server.failNext('unknown');
    await engine.syncNow();
    expect(engine.getState()).toMatchObject({
      status: 'attention',
      issue: 'unknown',
    });
    expect(vi.getTimerCount()).toBe(1);
  });
});

describe('sync engine: triggers', () => {
  it('runs one sync about 2 s after start when signed in', async () => {
    const { server, engine } = await device();
    await cacheKey();
    const getVault = vi.spyOn(server, 'getVault');
    engine.start();
    await vi.advanceTimersByTimeAsync(1_999);
    expect(getVault).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await until(() => engine.getState().status === 'idle' && vi.getTimerCount() === 0);
    expect(getVault).toHaveBeenCalledTimes(1);
  });

  it('does not reach the server after start when signed out', async () => {
    const { server, engine } = await device(undefined, false);
    await cacheKey();
    const getVault = vi.spyOn(server, 'getVault');
    engine.start();
    await vi.advanceTimersByTimeAsync(2_000);
    await settle();
    expect(getVault).not.toHaveBeenCalled();
    expect(engine.getState().status).toBe('off');
  });

  it('debounces changes: three within 5 s run once, 5 s after the last', async () => {
    const { server, engine } = await device();
    await cacheKey();
    const getVault = vi.spyOn(server, 'getVault');
    engine.requestSync('change');
    await vi.advanceTimersByTimeAsync(2_000);
    engine.requestSync('change');
    await vi.advanceTimersByTimeAsync(2_000);
    engine.requestSync('change');
    await vi.advanceTimersByTimeAsync(4_999);
    expect(getVault).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await until(() => engine.getState().status === 'idle' && vi.getTimerCount() === 0);
    expect(getVault).toHaveBeenCalledTimes(1);
  });

  it('coalesces requests during a run into exactly one follow-up', async () => {
    const { server, engine } = await device();
    await cacheKey();
    const getVault = vi.spyOn(server, 'getVault');
    server.beforeNextGet(() => {
      engine.requestSync('foreground');
      engine.requestSync('online');
      engine.requestSync('manual');
    });
    await engine.syncNow();
    expect(getVault).toHaveBeenCalledTimes(2);
    expect(engine.getState().status).toBe('idle');
  });

  it('stop() clears every timer', async () => {
    const { server, engine } = await device();
    await cacheKey();
    const getVault = vi.spyOn(server, 'getVault');
    engine.start();
    engine.requestSync('change');
    server.setOffline(true);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    engine.stop();
    await settle();
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(getVault).not.toHaveBeenCalled();
  });
});
