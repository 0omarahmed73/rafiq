import {
  generateRecoveryCode,
  hashSecret,
  isValidPin,
  isWeakPin,
  normalizeDigits,
  normalizeRecoveryCode,
  RECOVERY_ALPHABET,
  verifySecret,
  waitMs,
} from './pin';

describe('secret helpers', () => {
  it('hashes a secret and verifies only the matching value', async () => {
    const record = await hashSecret('1357', 1000);

    await expect(verifySecret('1357', record)).resolves.toBe(true);
    await expect(verifySecret('1358', record)).resolves.toBe(false);
  });

  it('uses a fresh salt for each hash and records the iteration count', async () => {
    const first = await hashSecret('1357', 1000);
    const second = await hashSecret('1357', 1000);

    expect(first.salt).not.toBe(second.salt);
    expect(first.hash).not.toBe(second.hash);
    expect(first.iter).toBe(1000);
  });
});

describe('PIN helpers', () => {
  it('converts Arabic and Persian digits and removes whitespace only', () => {
    expect(normalizeDigits('١٢٣٤')).toBe('1234');
    expect(normalizeDigits('۱۲ ۳۴')).toBe('1234');
    expect(normalizeDigits('12a4')).toBe('12a4');
  });

  it('accepts only four to six ASCII digits', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123456')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('1234567')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
    expect(isValidPin('')).toBe(false);
  });

  it('identifies the listed weak PIN patterns', () => {
    expect(isWeakPin('0000')).toBe(true);
    expect(isWeakPin('7777')).toBe(true);
    expect(isWeakPin('111111')).toBe(true);
    expect(isWeakPin('1234')).toBe(true);
    expect(isWeakPin('4321')).toBe(true);
    expect(isWeakPin('1357')).toBe(false);
    expect(isWeakPin('123456')).toBe(false);
  });
});

describe('recovery code helpers', () => {
  it('generates uniformly shaped, distinct codes from the recovery alphabet', () => {
    const codePattern = new RegExp(`^[${RECOVERY_ALPHABET}]{4}-[${RECOVERY_ALPHABET}]{4}-[${RECOVERY_ALPHABET}]{4}$`);
    const codes = Array.from({ length: 200 }, () => generateRecoveryCode());

    expect(generateRecoveryCode()).toMatch(codePattern);
    expect(codes.every((code) => codePattern.test(code))).toBe(true);
    expect(new Set(codes).size).toBe(200);
  });

  it('normalizes case and removes separators and ambiguous characters', () => {
    expect(normalizeRecoveryCode('ab2c-d3ef-gh45')).toBe('AB2CD3EFGH45');
    expect(normalizeRecoveryCode('0O1IL')).toBe('');
  });
});

describe('waitMs', () => {
  it('applies the bounded exponential delay schedule', () => {
    for (let failures = 0; failures <= 4; failures += 1) {
      expect(waitMs(failures)).toBe(0);
    }

    expect(waitMs(5)).toBe(30_000);
    expect(waitMs(6)).toBe(60_000);
    expect(waitMs(7)).toBe(120_000);
    expect(waitMs(12)).toBe(900_000);
    expect(waitMs(100)).toBe(900_000);
  });
});
