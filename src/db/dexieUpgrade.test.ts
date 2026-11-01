import Dexie from 'dexie';
import { RafiqDB } from './dexieRepo';

const V1 = {
  checkins: 'id, day, at',
  practices: 'id, practiceId, stepId, startedAt',
  followups: 'id, practiceRecordId',
  letters: 'id',
  weeklyReviews: 'id, weekStart',
  sessions: 'id, date',
  stepProgress: 'stepId',
  soothingList: 'id',
  settings: 'id',
  agendaPoints: 'id',
};

describe('Dexie upgrades', () => {
  it('turns old session homework into homework rows, once', async () => {
    const name = `rafiq-upgrade-${Math.random().toString(36).slice(2)}`;
    const old = new Dexie(name);
    old.version(1).stores(V1);
    old.version(2).stores({ yearPlan: 'id' });
    await old.table('sessions').put({
      id: 's1',
      date: '2026-10-27',
      therapistSaid: 'قال',
      takeaway: '',
      homework: [
        { text: 'أقرأ الفصل', done: false },
        { text: 'أكتب يومياتي', done: true },
      ],
      createdAt: '2026-10-27T09:00:00.000Z',
      updatedAt: '2026-10-27T09:00:00.000Z',
    });
    old.close();

    const db = new RafiqDB(name);
    await db.open();
    const rows = await db.table('homework').toArray();
    expect(rows.map((r) => [r.id, r.sessionId, r.text, r.done])).toEqual([
      ['legacy-s1-0', 's1', 'أقرأ الفصل', false],
      ['legacy-s1-1', 's1', 'أكتب يومياتي', true],
    ]);
    expect((await db.table('sessions').get('s1')).homework).toEqual([]);
    db.close();

    const again = new RafiqDB(name);
    await again.open();
    expect(await again.table('homework').count()).toBe(2);
    again.close();
  });

  it('upgrades existing homework images as prompt photos and adds tombstones', async () => {
    const name = `rafiq-photo-upgrade-${Math.random().toString(36).slice(2)}`;
    const old = new Dexie(name);
    old.version(1).stores(V1);
    old.version(2).stores({ yearPlan: 'id' });
    old.version(3).stores({ homework: 'id, sessionId, createdAt', homeworkImages: 'id, homeworkId' });
    await old.table('homeworkImages').put({
      id: 'legacy-image',
      homeworkId: 'legacy-homework',
      dataUrl: 'data:image/jpeg;base64,AAAA',
      createdAt: '2026-10-27T09:00:00.000Z',
      updatedAt: '2026-10-27T09:00:00.000Z',
    });
    old.close();

    const upgraded = new RafiqDB(name);
    await upgraded.open();
    expect(await upgraded.table('homeworkImages').get('legacy-image')).toMatchObject({ kind: 'prompt' });
    expect(await upgraded.table('syncTombstones').count()).toBe(0);
    upgraded.close();
  });

  it('adds notes in version 5 without touching existing rows', async () => {
    const name = `rafiq-notes-upgrade-${Math.random().toString(36).slice(2)}`;
    const old = new Dexie(name);
    old.version(1).stores(V1);
    old.version(2).stores({ yearPlan: 'id' });
    old.version(3).stores({ homework: 'id, sessionId, createdAt', homeworkImages: 'id, homeworkId' });
    old.version(4).stores({ homeworkImages: 'id, homeworkId, kind', syncTombstones: 'id, [table+recordId], updatedAt' });
    await old.table('soothingList').put({ id: 's', text: 'شاي', source: 'user', updatedAt: '2026-10-27T09:00:00.000Z' });
    old.close();

    const upgraded = new RafiqDB(name);
    await upgraded.open();
    expect(await upgraded.table('notes').count()).toBe(0);
    expect(await upgraded.table('soothingList').count()).toBe(1);
    upgraded.close();
  });
});
