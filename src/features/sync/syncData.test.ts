import { describe, expect, it } from "vitest";
import { BackupError } from "../../db/backup";
import type { AllData, HomeworkImage, Settings } from "../../db/schema";
import {
  LOCAL_ONLY_SETTINGS,
  orphanPhotoIds,
  parseRemote,
  prepareRemote,
  sameSyncData,
  toPlaintext,
  toSyncData,
} from "./syncData";

const T = "2026-10-31T10:00:00.000Z";

function empty(): AllData {
  return {
    checkins: [],
    practices: [],
    followups: [],
    letters: [],
    weeklyReviews: [],
    sessions: [],
    stepProgress: [],
    soothingList: [],
    settings: [],
    agendaPoints: [],
    yearPlan: [],
    homework: [],
    homeworkImages: [],
    notes: [],
    syncTombstones: [],
  };
}

function photo(id: string, homeworkId: string): HomeworkImage {
  return {
    id,
    homeworkId,
    kind: "prompt",
    dataUrl: "data:image/jpeg;base64,AAAA",
    createdAt: T,
    updatedAt: T,
  };
}

function settings(extra: Partial<Settings> = {}): Settings {
  return {
    id: "settings",
    theme: "dark",
    accent: "rose",
    language: "ar",
    updatedAt: T,
    ...extra,
  };
}

function sample(): AllData {
  return {
    ...empty(),
    checkins: [
      {
        id: "c1",
        at: T,
        day: "2026-10-31",
        emotions: ["sadness"],
        intensity: 5,
        tags: [],
        forNextSession: false,
        updatedAt: T,
      },
    ],
    homework: [
      {
        id: "h1",
        sessionId: "s1",
        text: "اقرأ",
        done: false,
        createdAt: T,
        updatedAt: T,
      },
    ],
    homeworkImages: [photo("i1", "h1")],
    settings: [
      settings({
        reminderTime: "20:00",
        lastReminderDay: "2026-10-30",
        lastBackupAt: "2026-10-29T00:00:00.000Z",
      }),
    ],
    syncTombstones: [
      {
        id: "homeworkImages:i9",
        table: "homeworkImages",
        recordId: "i9",
        deletedAt: T,
        updatedAt: T,
      },
      {
        id: "checkins:c9",
        table: "checkins",
        recordId: "c9",
        deletedAt: T,
        updatedAt: T,
      },
    ],
  };
}

describe("toSyncData", () => {
  it("drops photos and photo tombstones, keeps other tombstones, strips device-only settings", () => {
    const all = sample();
    const data = toSyncData(all);
    expect("homeworkImages" in data).toBe(false);
    expect(data.syncTombstones.map((t) => t.table)).toEqual(["checkins"]);
    for (const key of LOCAL_ONLY_SETTINGS)
      expect(key in data.settings[0]).toBe(false);
    const { homeworkImages: _photos, ...rest } = all;
    expect({ ...data, settings: all.settings }).toEqual({
      ...rest,
      syncTombstones: all.syncTombstones.slice(1),
    });
    expect(data.settings[0]).toEqual(settings());
  });
});

describe("prepareRemote", () => {
  it("copies this device local-only settings without touching updatedAt", () => {
    const remote = toSyncData({
      ...sample(),
      settings: [
        settings({ theme: "light", updatedAt: "2026-11-01T00:00:00.000Z" }),
      ],
    });
    const out = prepareRemote(remote, sample());
    expect(out.settings[0]).toEqual({
      ...remote.settings[0],
      reminderTime: "20:00",
      lastReminderDay: "2026-10-30",
      lastBackupAt: "2026-10-29T00:00:00.000Z",
    });
    expect(out.settings[0].updatedAt).toBe("2026-11-01T00:00:00.000Z");
    expect(out.homeworkImages).toEqual([]);
  });

  it("returns the remote row unchanged when there is no local settings row", () => {
    const remote = toSyncData(sample());
    expect(
      prepareRemote(remote, { ...sample(), settings: [] }).settings,
    ).toEqual(remote.settings);
  });

  it("does not change a settings row that round-trips through sync", () => {
    const local = sample();
    const out = prepareRemote(toSyncData(local), local);
    expect(out.settings).toEqual(local.settings);
    expect(out.homeworkImages).toEqual([]);
  });
});

describe("parseRemote", () => {
  it("round-trips toPlaintext", () => {
    const data = toSyncData(sample());
    expect(parseRemote(toPlaintext(data))).toEqual(data);
  });

  it("stamps the snapshot shape", () => {
    const plain = toPlaintext(toSyncData(sample()), "2026-11-08T00:00:00.000Z");
    expect(plain.version).toBe(1);
    expect(plain.exportedAt).toBe("2026-11-08T00:00:00.000Z");
  });

  it("throws BackupError on invalid shapes", () => {
    const good = toPlaintext(toSyncData(sample()));
    expect(() => parseRemote({ version: 1, exportedAt: T })).toThrow(
      BackupError,
    );
    expect(() => parseRemote({ ...good, version: 2 })).toThrow(BackupError);
    expect(() =>
      parseRemote({ ...good, data: { ...good.data, checkins: [{ id: "x" }] } }),
    ).toThrow(BackupError);
    expect(() => parseRemote(null)).toThrow(BackupError);
  });
});

describe("sameSyncData", () => {
  it("ignores key order and notices a difference", () => {
    const a = toSyncData(sample());
    const b = JSON.parse(JSON.stringify(a), (_k, v) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? Object.fromEntries(Object.entries(v).reverse())
        : v,
    );
    expect(sameSyncData(a, b)).toBe(true);
    expect(
      sameSyncData(a, { ...a, checkins: [{ ...a.checkins[0], intensity: 6 }] }),
    ).toBe(false);
  });
});

describe("orphanPhotoIds", () => {
  it("returns only photos without a homework", () => {
    const all = {
      ...sample(),
      homeworkImages: [photo("i1", "h1"), photo("i2", "gone")],
    };
    expect(orphanPhotoIds(all)).toEqual(["i2"]);
    expect(orphanPhotoIds(sample())).toEqual([]);
  });
});
