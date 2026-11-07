import { parseBackupFile } from "../../db/backup";
import { stableStringify } from "../../db/repoCore";
import type { AllData, Settings } from "../../db/schema";

/** Everything that syncs: a full backup without the photos. */
export type SyncData = Omit<AllData, "homeworkImages">;

/** Settings that belong to this device only; they never leave it and are never overwritten by a remote copy. */
export const LOCAL_ONLY_SETTINGS = [
  "reminderTime",
  "lastReminderDay",
  "lastBackupAt",
] as const;

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
    syncTombstones: all.syncTombstones.filter(
      (tombstone) => tombstone.table !== "homeworkImages",
    ),
  };
}

export function toPlaintext(
  data: SyncData,
  exportedAt: string = new Date().toISOString(),
): { version: 1; exportedAt: string; data: SyncData } {
  return { version: 1, exportedAt, data };
}

/** Validates a decrypted snapshot with the backup parser; throws BackupError when it is not valid. */
export function parseRemote(plaintext: unknown): SyncData {
  const { homeworkImages: _photos, ...data } = parseBackupFile(plaintext).data;
  return data;
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

export function sameSyncData(a: SyncData, b: SyncData): boolean {
  return stableStringify(a) === stableStringify(b);
}

/** Ids of photos whose homework no longer exists. */
export function orphanPhotoIds(all: AllData): string[] {
  const homeworkIds = new Set(all.homework.map((homework) => homework.id));
  return all.homeworkImages
    .filter((photo) => !homeworkIds.has(photo.homeworkId))
    .map((photo) => photo.id);
}
