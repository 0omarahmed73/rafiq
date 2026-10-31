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
}

const RafiqDocuments = registerPlugin<RafiqDocumentsPlugin>('RafiqDocuments');

export function isAndroidPlatform(): boolean {
  return Capacitor.getPlatform() === 'android';
}

export async function saveBackupDocument(filename: string, text: string): Promise<'saved' | 'cancelled'> {
  const result = await RafiqDocuments.saveBackup({ filename, text });
  return result.cancelled ? 'cancelled' : 'saved';
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
