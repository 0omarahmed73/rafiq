import { openDb } from './open';
import { RafiqDB } from './dexieRepo';

describe('openDb', () => {
  it('uses IndexedDB when it opens', async () => {
    const { repo, persistent } = await openDb(async () => {
      const db = new RafiqDB('rafiq-open-ok');
      await db.open();
      return db;
    });
    expect(persistent).toBe(true);
    await repo.addCheckin({
      at: '2026-10-31T10:00:00.000Z',
      day: '2026-10-31',
      emotions: ['calm'],
      intensity: 2,
      tags: [],
      forNextSession: false,
    });
    expect(await repo.listCheckins({ from: '2026-10-31', to: '2026-10-31' })).toHaveLength(1);
  });

  it('falls back to an in-memory repo when IndexedDB cannot open', async () => {
    const { repo, persistent } = await openDb(() => Promise.reject(new Error('blocked')));
    expect(persistent).toBe(false);
    await repo.addSoothing('الرسم', 'user');
    expect(await repo.listSoothing()).toHaveLength(1);
  });
});
