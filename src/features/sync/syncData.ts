import { parseBackupFile } from '../../db/backup';
import { stableStringify } from '../../db/repoCore';
import type { AllData, Settings } from '../../db/schema';

/** Everything that syncs: a full backup without the photos. */
export type SyncData = Omit<AllData, 'homeworkImages'>;

/** Settings that belong to this device only; they never leave it and are never overwritten by a remote copy. */
export const LOCAL_ONLY_SETTINGS = ['reminderTime', 'lastReminderDay', 'lastBackupAt'] as const;

function withoutLocalOnly(row: Settings): Settings {
  const copy: Settings = { ...row };
  for (const key of LOCAL_ONLY_SETTINGS) delete copy[key];
  return copy;
}

/** Photos and photo tombstones stay on the device; device-only settings are stripped. */
export function toSyncData(all: AllData): SyncData {
  const { homeworkImages: _photos, ...rest } = all;
  return {
    ...rest,
    settings: all.settings.map(withoutLocalOnly),
    syncTombstones: all.syncTombstones.filter((tombstone) => tombstone.table !== 'homeworkImages'),
  };
}

export function toPlaintext(
  data: SyncData,
  exportedAt: string = new Date().toISOString(),
): { version: 1; exportedAt: string; data: SyncData } {
  return { version: 1, exportedAt, data };
}

/**
 * Validates a decrypted snapshot with the backup parser; throws BackupError when it is not valid. Photos never sync,
 * so they are dropped before parsing, and a settings row without a language stays without one (the parser would
 * otherwise default it, which means "not chosen yet" is lost).
 */
export function parseRemote(plaintext: unknown): SyncData {
  let raw: unknown = plaintext;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return parseBackupFile(raw).data; // throws BackupError
    }
  }
  const rawData = (raw as { data?: Record<string, unknown> } | null)?.data;
  if (raw && typeof raw === 'object' && rawData && typeof rawData === 'object' && !Array.isArray(rawData)) {
    const { homeworkImages: _dropped, ...noPhotos } = rawData;
    raw = { ...(raw as object), data: noPhotos };
  }
  const { homeworkImages: _photos, ...data } = parseBackupFile(raw).data;
  const rawSettings = (rawData as { settings?: unknown } | undefined)?.settings;
  const noLanguage = new Set(
    Array.isArray(rawSettings)
      ? rawSettings.filter((row) => row && typeof row === 'object' && !('language' in row)).map((row) => row.id)
      : [],
  );
  return {
    ...data,
    settings: data.settings.map((row) => {
      if (!noLanguage.has(row.id)) return row;
      const { language: _language, ...rest } = row;
      return rest;
    }),
  };
}

/**
 * Turns remote data into a full local dataset. This device's own values for the device-only settings are copied
 * into the remote settings row; `updatedAt` stays the remote one so applying never looks like a new edit.
 */
export function prepareRemote(remote: SyncData, local: AllData): AllData {
  const mine = local.settings[0];
  const settings = remote.settings.map((row) => {
    if (!mine) return row;
    const merged: Settings = { ...row };
    for (const key of LOCAL_ONLY_SETTINGS) {
      if (mine[key] === undefined) delete merged[key];
      else (merged as unknown as Record<string, unknown>)[key] = mine[key];
    }
    return merged;
  });
  return { ...remote, settings, homeworkImages: [] };
}

function canonical(data: SyncData): SyncData {
  const out: Record<string, unknown> = {};
  for (const [table, rows] of Object.entries(data)) {
    const key = (row: { id?: string; stepId?: number }) => String(table === 'stepProgress' ? row.stepId : row.id);
    out[table] = [...(rows as { id?: string; stepId?: number }[])].sort((x, y) =>
      key(x) < key(y) ? -1 : key(x) > key(y) ? 1 : 0,
    );
  }
  return out as unknown as SyncData;
}

/** Equal content, whatever the key order or row order. */
export function sameSyncData(a: SyncData, b: SyncData): boolean {
  return stableStringify(canonical(a)) === stableStringify(canonical(b));
}

/** Ids of photos whose homework no longer exists. */
export function orphanPhotoIds(all: AllData): string[] {
  const homeworkIds = new Set(all.homework.map((homework) => homework.id));
  return all.homeworkImages.filter((photo) => !homeworkIds.has(photo.homeworkId)).map((photo) => photo.id);
}
