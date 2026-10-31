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

describe('Dexie upgrade to version 3', () => {
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
});
