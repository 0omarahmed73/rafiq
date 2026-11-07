import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EnvelopeError,
  KDF_ITERATIONS,
  MAX_KDF_ITERATIONS,
  assertSupportedKdf,
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
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

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

  it('cannot decrypt with a key derived from a different salt', async () => {
    const { key, salt } = await setup('same phrase');
    const env = await encryptEnvelope(key, salt, 'u1', sample, ITER);
    const other = await deriveVaultKey('same phrase', newSalt(), ITER);
    expect(await kindOf(decryptEnvelope(other, 'u1', env))).toBe('decrypt');
  });

  it('cannot decrypt with a key derived with a different iteration count', async () => {
    const { key, salt } = await setup('same phrase');
    const env = await encryptEnvelope(key, salt, 'u1', sample, ITER);
    const other = await deriveVaultKey('same phrase', salt, ITER + 1);
    expect(await kindOf(decryptEnvelope(other, 'u1', env))).toBe('decrypt');
    const same = await deriveVaultKey('same phrase', salt, ITER);
    expect(await decryptEnvelope(same, 'u1', env)).toEqual(sample);
  });

  it('round-trips a large incompressible payload', async () => {
    const { key, salt } = await setup();
    const bytes = new Uint8Array(300 * 1024);
    for (let i = 0; i < bytes.length; i += 65536) crypto.getRandomValues(bytes.subarray(i, i + 65536));
    const big = { blob: Buffer.from(bytes).toString('base64') };
    const env = await encryptEnvelope(key, salt, 'u1', big, ITER);
    expect(env.ct.length).toBeGreaterThan(300 * 1024);
    expect(await decryptEnvelope(key, 'u1', env)).toEqual(big);
  });

  it('skips compression when CompressionStream is missing', async () => {
    const { key, salt } = await setup();
    vi.stubGlobal('CompressionStream', undefined);
    const env = await encryptEnvelope(key, salt, 'u1', sample, ITER);
    vi.unstubAllGlobals();
    expect(env.gz).toBe(false);
    expect(await decryptEnvelope(key, 'u1', env)).toEqual(sample);
  });

  it('reports a compressed envelope as unsupported when DecompressionStream is missing', async () => {
    const { key, salt } = await setup();
    const env = await encryptEnvelope(key, salt, 'u1', sample, ITER);
    expect(env.gz).toBe(true);
    vi.stubGlobal('DecompressionStream', undefined);
    expect(await kindOf(decryptEnvelope(key, 'u1', env))).toBe('unsupported');
  });

  it('rejects unknown algorithms as unsupported', async () => {
    const { key, salt } = await setup();
    const env = await encryptEnvelope(key, salt, 'u1', sample, ITER);
    expect(await kindOf(decryptEnvelope(key, 'u1', { ...env, alg: 'AES-128-CBC' } as never))).toBe('unsupported');
    const kdf = { ...env.kdf, name: 'scrypt' };
    expect(await kindOf(decryptEnvelope(key, 'u1', { ...env, kdf } as never))).toBe('unsupported');
  });

  describe('key derivation bounds', () => {
    it('refuses an absurd iteration count without starting a derivation', async () => {
      const { key, salt } = await setup();
      const env = await encryptEnvelope(key, salt, 'u1', sample, ITER);
      const bad = { ...env, kdf: { ...env.kdf, iter: 2 ** 31 } };
      const deriveKey = vi.spyOn(crypto.subtle, 'deriveKey');
      const deriveBits = vi.spyOn(crypto.subtle, 'deriveBits');
      expect(await kindOf(deriveVaultKey('p', salt, 2 ** 31))).toBe('unsupported');
      expect(() => assertSupportedKdf(bad)).toThrow(EnvelopeError);
      expect(await kindOf(decryptEnvelope(key, 'u1', bad))).toBe('unsupported');
      expect(deriveKey).not.toHaveBeenCalled();
      expect(deriveBits).not.toHaveBeenCalled();
    });

    it('treats a non-integer or non-positive iteration count as a format error', async () => {
      const { key, salt } = await setup();
      const env = await encryptEnvelope(key, salt, 'u1', sample, ITER);
      for (const iter of [Number.NaN, -1, 0, 1.5]) {
        const bad = { ...env, kdf: { ...env.kdf, iter } };
        expect(isEnvelope(bad)).toBe(false);
        expect(await kindOf(decryptEnvelope(key, 'u1', bad))).toBe('format');
        expect(await kindOf(deriveVaultKey('p', salt, iter))).toBe('format');
      }
    });

    it('accepts exactly the maximum in the shape check', async () => {
      const { key, salt } = await setup();
      const env = await encryptEnvelope(key, salt, 'u1', sample, ITER);
      const edge = { ...env, kdf: { ...env.kdf, iter: MAX_KDF_ITERATIONS } };
      expect(isEnvelope(edge)).toBe(true);
      expect(() => assertSupportedKdf(edge)).not.toThrow();
    });
  });
});
