import { legacyHomework } from './legacyHomework';
import type { Session } from './schema';

const session = (homework: Session['homework']): Session => ({
  id: 's1',
  date: '2026-10-27',
  therapistSaid: 'قال',
  takeaway: '',
  homework,
  createdAt: '2026-10-27T09:00:00.000Z',
  updatedAt: '2026-10-27T09:05:00.000Z',
});

describe('legacyHomework', () => {
  it('converts old items with stable ids and skips blank text', () => {
    const rows = legacyHomework(
      session([
        { text: 'أقرأ الفصل', done: false },
        { text: '   ', done: true },
        { text: 'أكتب يومياتي', done: true },
      ]),
    );
    expect(rows).toEqual([
      { id: 'legacy-s1-0', sessionId: 's1', text: 'أقرأ الفصل', done: false, createdAt: '2026-10-27T09:00:00.000Z', updatedAt: '2026-10-27T09:05:00.000Z' },
      { id: 'legacy-s1-2', sessionId: 's1', text: 'أكتب يومياتي', done: true, createdAt: '2026-10-27T09:00:00.000Z', updatedAt: '2026-10-27T09:05:00.000Z' },
    ]);
  });

  it('is idempotent: the same session gives the same ids', () => {
    const s = session([{ text: 'أ', done: false }, { text: 'ب', done: false }]);
    expect(legacyHomework(s).map((h) => h.id)).toEqual(legacyHomework(s).map((h) => h.id));
  });

  it('gives nothing for a session with no old homework', () => {
    expect(legacyHomework(session([]))).toEqual([]);
  });
});
