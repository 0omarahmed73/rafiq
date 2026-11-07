import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';

const isAndroid = () => Capacitor.getPlatform() === 'android';

/** True only on Android with an enrolled biometric; false off Android and on any plugin error. */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!isAndroid()) return false;
  try {
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable === true;
  } catch {
    return false;
  }
}

/** Prompts for a biometric. Resolves true only on success; cancel, failure, error and non-Android give false. */
export async function verifyBiometric(reason: string): Promise<boolean> {
  if (!isAndroid()) return false;
  try {
    await NativeBiometric.verifyIdentity({ reason, title: reason });
    return true;
  } catch {
    return false;
  }
}
