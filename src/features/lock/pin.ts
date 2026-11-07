export const PBKDF2_ITERATIONS = 210_000;

export interface SecretRecord {
  salt: string;
  hash: string;
  iter: number;
}

export const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const SALT_BYTES = 16;
const HASH_BITS = 256;

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function deriveSecret(secret: string, salt: Uint8Array, iter: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt.slice().buffer as ArrayBuffer, iterations: iter, hash: 'SHA-256' },
    key,
    HASH_BITS,
  );
  return new Uint8Array(bits);
}

export async function hashSecret(secret: string, iter = PBKDF2_ITERATIONS): Promise<SecretRecord> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveSecret(secret, salt, iter);
  return { salt: toBase64(salt), hash: toBase64(hash), iter };
}

export async function verifySecret(secret: string, rec: SecretRecord): Promise<boolean> {
  const expected = fromBase64(rec.hash);
  const actual = await deriveSecret(secret, fromBase64(rec.salt), rec.iter);
  let difference = expected.length ^ actual.length;

  for (let index = 0; index < Math.max(expected.length, actual.length); index += 1) {
    difference |= (expected[index] ?? 0) ^ (actual[index] ?? 0);
  }

  return difference === 0;
}

export function normalizeDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/\s/g, '');
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export function isWeakPin(pin: string): boolean {
  if (!isValidPin(pin)) return false;
  if (/^(\d)\1+$/.test(pin)) return true;
  if (pin.length !== 4) return false;

  return (
    [...pin].every((digit, index) => index === 0 || Number(digit) === Number(pin[index - 1]) + 1) ||
    [...pin].every((digit, index) => index === 0 || Number(digit) === Number(pin[index - 1]) - 1)
  );
}

export function generateRecoveryCode(): string {
  const characters: string[] = [];

  while (characters.length < 12) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    for (const byte of bytes) {
      if (byte < 248) characters.push(RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length]);
      if (characters.length === 12) break;
    }
  }

  return `${characters.slice(0, 4).join('')}-${characters.slice(4, 8).join('')}-${characters.slice(8).join('')}`;
}

export function normalizeRecoveryCode(input: string): string {
  return [...input.toUpperCase()].filter((character) => RECOVERY_ALPHABET.includes(character)).join('');
}

export function waitMs(failures: number): number {
  return failures < 5 ? 0 : Math.min(30_000 * 2 ** (failures - 5), 900_000);
}
