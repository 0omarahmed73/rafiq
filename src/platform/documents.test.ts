const native = vi.hoisted(() => ({
  getPlatform: vi.fn(),
  saveBackup: vi.fn(),
  readBackup: vi.fn(),
  printSummary: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: native.getPlatform },
  registerPlugin: vi.fn(() => native),
}));

import {
  isAndroidPlatform,
  printSummaryDocument,
  readBackupDocument,
  saveBackupDocument,
} from './documents';

describe('native documents adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    native.getPlatform.mockReturnValue('android');
  });

  it('recognizes Android only', () => {
    expect(isAndroidPlatform()).toBe(true);
    native.getPlatform.mockReturnValue('web');
    expect(isAndroidPlatform()).toBe(false);
    native.getPlatform.mockReturnValue('ios');
    expect(isAndroidPlatform()).toBe(false);
  });

  it('maps a completed save to saved', async () => {
    native.saveBackup.mockResolvedValue({ cancelled: false });

    await expect(saveBackupDocument('rafiq-backup.json', '{"ok":true}')).resolves.toBe('saved');
    expect(native.saveBackup).toHaveBeenCalledWith({ filename: 'rafiq-backup.json', text: '{"ok":true}' });
  });

  it('maps picker cancellation to cancelled', async () => {
    native.saveBackup.mockResolvedValue({ cancelled: true });

    await expect(saveBackupDocument('rafiq-backup.json', '{}')).resolves.toBe('cancelled');
  });

  it('returns null for a cancelled read and text for a completed read', async () => {
    native.readBackup.mockResolvedValueOnce({ cancelled: true }).mockResolvedValueOnce({ cancelled: false, text: 'عربي' });

    await expect(readBackupDocument()).resolves.toBeNull();
    await expect(readBackupDocument()).resolves.toBe('عربي');
  });

  it('propagates native errors and forwards print requests', async () => {
    const error = new Error('provider failed');
    native.saveBackup.mockRejectedValueOnce(error);
    native.readBackup.mockRejectedValueOnce(error);
    native.printSummary.mockResolvedValue(undefined);

    await expect(saveBackupDocument('x.json', '{}')).rejects.toBe(error);
    await expect(readBackupDocument()).rejects.toBe(error);
    await printSummaryDocument('<article>ملخص</article>');
    expect(native.printSummary).toHaveBeenCalledWith({ html: '<article>ملخص</article>' });
  });
});
