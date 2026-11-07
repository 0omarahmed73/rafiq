import { describe, expect, it } from 'vitest';
import {
  EnvelopeError,
  KDF_ITERATIONS,
  decryptEnvelope,
  deriveVaultKey,
  encryptEnvelope,
  envelopeSalt,
  isEnvelope,
  newSalt,
} from './envelope';

const ITER = 1000;
const sample = { name: 'رفيق', days: [1, 2, [3, { note: 'مرحبا بالعالم' }]], ok: true, none: null };

async function setup(passphrase = 'correct horse', salt = newSalt()) {
  return { salt, key: await deriveVaultKey(passphrase, salt, ITER) };
}

async function kindOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(EnvelopeError);
    return (error as EnvelopeError).kind;
  }
  return 'no error';
}

function flip(text: string, index: number) {
  const next = text[index] === 'A' ? 'B' : 'A';
  return text.slice(0, index) + next + text.slice(index + 1);
}

describe('envelope', () => {
  it('uses 600000 PBKDF2 iterations and 16-byte random salts', () => {
    expect(KDF_ITERATIONS).toBe(600000);
    const a = newSalt();
    expect(atob(a).length).toBe(16);
    expect(newSalt()).not.toBe(a);
  });

  it('round-trips a value', async () => {
    const { key, salt } = await setup();
    const env = await encryptEnvelope(key, salt, 'u1', sample, ITER);
    expect(await decryptEnvelope(key, 'u1', env)).toEqual(sample);
  });

  it('fails to decrypt with a different passphrase', async () => {
    const { key, salt } = await setup();
    const env = await encryptEnvelope(key, salt, 'u1', sample, ITER);
    const other = await deriveVaultKey('wrong', salt, ITER);
    expect(await kindOf(decryptEnvelope(other, 'u1', env))).toBe('decrypt');
  });

  it('rejects tampered ciphertext, tampered iv and another user id', async () => {
    const { key, salt } = await setup();
    const env = await encryptEnvelope(key, salt, 'u1', sample, ITER);
    expect(await kindOf(decryptEnvelope(key, 'u1', { ...env, ct: flip(env.ct, 4) }))).toBe('decrypt');
    expect(await kindOf(decryptEnvelope(key, 'u1', { ...env, iv: flip(env.iv, 0) }))).toBe('decrypt');
    expect(await kindOf(decryptEnvelope(key, 'u2', env))).toBe('decrypt');
  });

  it('writes the envelope fields and uses a fresh iv every time', async () => {
    const { key, salt } = await setup();
    const a = await encryptEnvelope(key, salt, 'u1', sample, ITER);
    const b = await encryptEnvelope(key, salt, 'u1', sample, ITER);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
    expect(a.v).toBe(1);
    expect(a.alg).toBe('AES-256-GCM');
    expect(a.kdf).toEqual({ name: 'PBKDF2-SHA256', iter: ITER, salt });
    expect(envelopeSalt(a)).toBe(salt);
  });

  it('classifies unsupported versions and malformed input', async () => {
    const { key, salt } = await setup();
    const env = await encryptEnvelope(key, salt, 'u1', sample, ITER);
    expect(await kindOf(decryptEnvelope(key, 'u1', { ...env, v: 2 } as never))).toBe('unsupported');
    expect(await kindOf(decryptEnvelope(key, 'u1', {} as never))).toBe('format');
    expect(isEnvelope(env)).toBe(true);
    expect(isEnvelope(null)).toBe(false);
    expect(isEnvelope({})).toBe(false);
    const { iv: _iv, ...missing } = env;
    expect(isEnvelope(missing)).toBe(false);
  });

  it('derives a non-extractable key', async () => {
    const { key } = await setup();
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow();
  });

  it('compresses large repetitive plaintext', async () => {
    const { key, salt } = await setup();
    const big = { rows: Array.from({ length: 2000 }, () => 'the same line again and again') };
    const env = await encryptEnvelope(key, salt, 'u1', big, ITER);
    expect(env.gz).toBe(true);
    expect(env.ct.length).toBeLessThan(JSON.stringify(big).length / 4);
    expect(await decryptEnvelope(key, 'u1', env)).toEqual(big);
  });

  it('derives the same key from the same passphrase and salt', async () => {
    const salt = 'AAECAwQFBgcICQoLDA0ODw==';
    const first = await deriveVaultKey('same phrase', salt, ITER);
    const second = await deriveVaultKey('same phrase', salt, ITER);
    const env = await encryptEnvelope(first, salt, 'u1', sample, ITER);
    expect(await decryptEnvelope(second, 'u1', env)).toEqual(sample);
  });
});
