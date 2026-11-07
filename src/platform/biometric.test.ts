import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { isBiometricAvailable, verifyBiometric } from './biometric';

vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: vi.fn(() => 'android') } }));
vi.mock('@capgo/capacitor-native-biometric', () => ({
  NativeBiometric: { isAvailable: vi.fn(), verifyIdentity: vi.fn() },
}));

beforeEach(() => {
  vi.mocked(Capacitor.getPlatform).mockReturnValue('android');
  vi.mocked(NativeBiometric.isAvailable).mockReset();
  vi.mocked(NativeBiometric.verifyIdentity).mockReset();
});

describe('isBiometricAvailable', () => {
  it('is false off Android and never calls the plugin', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
    expect(await isBiometricAvailable()).toBe(false);
    expect(NativeBiometric.isAvailable).not.toHaveBeenCalled();
  });

  it('is true on Android when the plugin reports available', async () => {
    vi.mocked(NativeBiometric.isAvailable).mockResolvedValue({ isAvailable: true } as never);
    expect(await isBiometricAvailable()).toBe(true);
  });

  it('is false on Android when the plugin reports unavailable', async () => {
    vi.mocked(NativeBiometric.isAvailable).mockResolvedValue({ isAvailable: false } as never);
    expect(await isBiometricAvailable()).toBe(false);
  });

  it('is false when the plugin rejects', async () => {
    vi.mocked(NativeBiometric.isAvailable).mockRejectedValue(new Error('boom'));
    expect(await isBiometricAvailable()).toBe(false);
  });
});

describe('verifyBiometric', () => {
  it('is false off Android and never calls the plugin', async () => {
    vi.mocked(Capacitor.getPlatform).mockReturnValue('web');
    expect(await verifyBiometric('Unlock')).toBe(false);
    expect(NativeBiometric.verifyIdentity).not.toHaveBeenCalled();
  });

  it('is true on success and passes the reason', async () => {
    vi.mocked(NativeBiometric.verifyIdentity).mockResolvedValue(undefined);
    expect(await verifyBiometric('Unlock Rafiq')).toBe(true);
    expect(NativeBiometric.verifyIdentity).toHaveBeenCalledWith(expect.objectContaining({ reason: 'Unlock Rafiq' }));
  });

  it('is false on cancel or failure, without throwing', async () => {
    vi.mocked(NativeBiometric.verifyIdentity).mockRejectedValue(new Error('cancelled'));
    expect(await verifyBiometric('Unlock')).toBe(false);
  });
});
