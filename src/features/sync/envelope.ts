// The encryption envelope for account sync: one JSON value in, one opaque envelope out.
// Pure crypto. No network, no storage. Nothing here logs, and no error text carries the passphrase, key or data.

export const KDF_ITERATIONS = 600_000;
// A row from the server is untrusted; an absurd iteration count would hang the unlock, so it is bounded.
export const MAX_KDF_ITERATIONS = 10_000_000;
// Bound gzip expansion on mobile even when a small, authenticated envelope expands dramatically.
export const MAX_DECOMPRESSED_BYTES = 16 * 1024 * 1024;

export interface Envelope {
  v: 1;
  kdf: { name: 'PBKDF2-SHA256'; iter: number; salt: string };
  alg: 'AES-256-GCM';
  gz: boolean;
  iv: string;
  ct: string;
}

export type EnvelopeErrorKind = 'unsupported' | 'decrypt' | 'format' | 'tooLarge';

export class EnvelopeError extends Error {
  kind: EnvelopeErrorKind;

  constructor(kind: EnvelopeErrorKind, message: string) {
    super(message);
    this.name = 'EnvelopeError';
    this.kind = kind;
  }
}

const SALT_BYTES = 16;
const IV_BYTES = 12;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  try {
    const binary = atob(text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    throw new EnvelopeError('format', 'Invalid envelope encoding');
  }
}

async function pipe(
  bytes: Uint8Array,
  transform: CompressionStream | DecompressionStream,
  maxOutputBytes?: number,
): Promise<Uint8Array> {
  const writer = transform.writable.getWriter();
  // Errors surface on the read side; keep the write side from raising an unhandled rejection.
  writer.write(bytes as BufferSource).catch(() => undefined);
  writer.close().catch(() => undefined);
  let readable: ReadableStream<Uint8Array> = transform.readable;
  if (maxOutputBytes !== undefined) {
    let size = 0;
    readable = readable.pipeThrough(
      new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          size += chunk.byteLength;
          if (size > maxOutputBytes) throw new EnvelopeError('tooLarge', 'Decompressed data exceeds the size limit');
          controller.enqueue(chunk);
        },
      }),
    );
  }
  return new Uint8Array(await new Response(readable).arrayBuffer());
}

const canGzip = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

const aad = (userId: string) => encoder.encode(`rafiq-vault-v1:${userId}`);

export function newSalt(): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
}

function checkIter(iter: unknown): void {
  if (typeof iter !== 'number' || !Number.isSafeInteger(iter) || iter < 1) {
    throw new EnvelopeError('format', 'Invalid key derivation settings');
  }
  if (iter > MAX_KDF_ITERATIONS) throw new EnvelopeError('unsupported', 'Unsupported key derivation settings');
}

export async function deriveVaultKey(
  passphrase: string,
  salt: string,
  iter: number = KDF_ITERATIONS,
): Promise<CryptoKey> {
  checkIter(iter);
  try {
    const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return await crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(salt) as BufferSource, iterations: iter },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  } catch (error) {
    if (error instanceof EnvelopeError) throw error;
    throw new EnvelopeError('format', 'Could not derive the vault key');
  }
}

export async function encryptEnvelope(
  key: CryptoKey,
  salt: string,
  userId: string,
  plaintext: unknown,
  iter: number = KDF_ITERATIONS,
): Promise<Envelope> {
  try {
    let data: Uint8Array = encoder.encode(JSON.stringify(plaintext));
    const gz = canGzip();
    if (gz) data = await pipe(data, new CompressionStream('gzip'));
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const params = { name: 'AES-GCM', iv, additionalData: aad(userId) as BufferSource };
    const ct = new Uint8Array(await crypto.subtle.encrypt(params, key, data as BufferSource));
    return {
      v: 1,
      kdf: { name: 'PBKDF2-SHA256', iter, salt },
      alg: 'AES-256-GCM',
      gz,
      iv: toBase64(iv),
      ct: toBase64(ct),
    };
  } catch {
    throw new EnvelopeError('format', 'Could not encrypt the data');
  }
}

const isString = (value: unknown): value is string => typeof value === 'string';

function hasShape(value: unknown): value is Envelope {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  const kdf = e.kdf as Record<string, unknown> | null | undefined;
  return (
    e.v === 1 &&
    isString(e.alg) &&
    typeof e.gz === 'boolean' &&
    isString(e.iv) &&
    isString(e.ct) &&
    typeof kdf === 'object' &&
    kdf !== null &&
    isString(kdf.name) &&
    typeof kdf.iter === 'number' &&
    isString(kdf.salt)
  );
}

export function isEnvelope(value: unknown): value is Envelope {
  return (
    hasShape(value) &&
    value.alg === 'AES-256-GCM' &&
    value.kdf.name === 'PBKDF2-SHA256' &&
    Number.isSafeInteger(value.kdf.iter) &&
    value.kdf.iter >= 1
  );
}

export function envelopeSalt(envelope: Envelope): string {
  return envelope.kdf.salt;
}

// Run before deriving a key: 'format' for a malformed envelope, 'unsupported' for one this app cannot read.
export function assertSupportedKdf(envelope: Envelope): void {
  const version = (envelope as { v?: unknown } | null)?.v;
  if (typeof version === 'number' && version !== 1) {
    throw new EnvelopeError('unsupported', 'Unsupported envelope version');
  }
  if (!hasShape(envelope)) throw new EnvelopeError('format', 'Not a valid envelope');
  if (envelope.alg !== 'AES-256-GCM' || envelope.kdf.name !== 'PBKDF2-SHA256') {
    throw new EnvelopeError('unsupported', 'Unsupported envelope algorithm');
  }
  checkIter(envelope.kdf.iter);
}

export async function decryptEnvelope(key: CryptoKey, userId: string, envelope: Envelope): Promise<unknown> {
  assertSupportedKdf(envelope);

  const iv = fromBase64(envelope.iv);
  const ct = fromBase64(envelope.ct);
  let data: Uint8Array;
  try {
    const params = { name: 'AES-GCM', iv: iv as BufferSource, additionalData: aad(userId) as BufferSource };
    data = new Uint8Array(await crypto.subtle.decrypt(params, key, ct as BufferSource));
  } catch {
    throw new EnvelopeError('decrypt', 'Could not decrypt the data');
  }
  try {
    if (envelope.gz) {
      if (!canGzip()) throw new EnvelopeError('unsupported', 'Compression is not available');
      data = await pipe(data, new DecompressionStream('gzip'), MAX_DECOMPRESSED_BYTES);
    } else if (data.byteLength > MAX_DECOMPRESSED_BYTES) {
      throw new EnvelopeError('tooLarge', 'Decrypted data exceeds the size limit');
    }
    return JSON.parse(decoder.decode(data));
  } catch (error) {
    if (error instanceof EnvelopeError) throw error;
    throw new EnvelopeError('format', 'The decrypted data is not valid');
  }
}
