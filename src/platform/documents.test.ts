const native = vi.hoisted(() => ({
  getPlatform: vi.fn(),
  saveBackup: vi.fn(),
  readBackup: vi.fn(),
  printSummary: vi.fn(),
  shareBackup: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: native.getPlatform },
  registerPlugin: vi.fn(() => native),
}));

import {
  canShareBackup,
  isAndroidPlatform,
  printSummaryDocument,
  readBackupDocument,
  saveBackupDocument,
  shareBackupDocument,
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

  it('opens the Android share sheet with the backup text', async () => {
    native.shareBackup.mockResolvedValue({ opened: true });

    await expect(shareBackupDocument('rafiq-backup.json', '{"ok":true}')).resolves.toBe('opened');
    expect(native.shareBackup).toHaveBeenCalledWith({ filename: 'rafiq-backup.json', text: '{"ok":true}' });
  });

  it('shares through the web share API with a JSON file and treats dismissal as cancelled', async () => {
    native.getPlatform.mockReturnValue('web');
    const share = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new DOMException('x', 'AbortError'));
    vi.stubGlobal('navigator', { share, canShare: () => true });
    try {
      await expect(shareBackupDocument('b.json', '{}')).resolves.toBe('opened');
      const files = (share.mock.calls[0][0] as { files: File[] }).files;
      expect(files[0].name).toBe('b.json');
      expect(files[0].type).toBe('application/json');
      await expect(shareBackupDocument('b.json', '{}')).resolves.toBe('cancelled');
      expect(native.shareBackup).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('offers sharing on Android, and on the web only when file sharing is supported', () => {
    expect(canShareBackup()).toBe(true);
    native.getPlatform.mockReturnValue('web');
    vi.stubGlobal('navigator', {});
    expect(canShareBackup()).toBe(false);
    vi.stubGlobal('navigator', { share: vi.fn(), canShare: () => false });
    expect(canShareBackup()).toBe(false);
    vi.stubGlobal('navigator', { share: vi.fn(), canShare: () => true });
    expect(canShareBackup()).toBe(true);
    vi.unstubAllGlobals();
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
