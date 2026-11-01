import { Capacitor, registerPlugin } from '@capacitor/core';

interface SaveBackupResult {
  cancelled: boolean;
}

interface ReadBackupResult {
  cancelled: boolean;
  text?: string;
}

interface RafiqDocumentsPlugin {
  saveBackup(options: { filename: string; text: string }): Promise<SaveBackupResult>;
  readBackup(): Promise<ReadBackupResult>;
  printSummary(options: { html: string }): Promise<void>;
  shareBackup(options: { filename: string; text: string }): Promise<{ opened: boolean }>;
}

const RafiqDocuments = registerPlugin<RafiqDocumentsPlugin>('RafiqDocuments');

export function isAndroidPlatform(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export async function saveBackupDocument(filename: string, text: string): Promise<'saved' | 'cancelled'> {
  const result = await RafiqDocuments.saveBackup({ filename, text });
  return result.cancelled ? 'cancelled' : 'saved';
}

function webShareData(filename: string, text: string): ShareData {
  return { files: [new File([text], filename, { type: 'application/json' })] };
}

export function canShareBackup(): boolean {
  if (isAndroidPlatform()) return true;
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') {
    return false;
  }
  return navigator.canShare(webShareData('rafiq-backup.json', '{}'));
}

/** 'opened' only means the share sheet appeared; it never proves the file was delivered anywhere. */
export async function shareBackupDocument(filename: string, text: string): Promise<'opened' | 'cancelled'> {
  if (isAndroidPlatform()) {
    await RafiqDocuments.shareBackup({ filename, text });
    return 'opened';
  }
  try {
    await navigator.share(webShareData(filename, text));
    return 'opened';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    throw error;
  }
}

export async function readBackupDocument(): Promise<string | null> {
  const result = await RafiqDocuments.readBackup();
  if (result.cancelled) return null;
  if (typeof result.text !== 'string') throw new Error('The native picker returned no file text');
  return result.text;
}

export function printSummaryDocument(html: string): Promise<void> {
  return RafiqDocuments.printSummary({ html });
}
