import { render } from '@testing-library/react';
import { SummaryPrint } from './SummaryPrint';
import type { SummaryModel, SummarySwitches } from './buildSummary';

const emptyModel: SummaryModel = {
  range: { from: '2026-10-01', to: '2026-10-31' },
  totals: { daysLogged: 0, currentStep: 1 },
  checkins: [],
  curve: [],
  weeklyReviews: [],
  practices: [],
  tagged: [],
};
const all: SummarySwitches = { checkins: true, curve: true, weeklyReviews: true, practices: true, tagged: true };
const none: SummarySwitches = { checkins: false, curve: false, weeklyReviews: false, practices: false, tagged: false };

function text(model: SummaryModel, switches: SummarySwitches) {
  const { container } = render(<SummaryPrint model={model} switches={switches} />);
  return container.textContent ?? '';
}

describe('SummaryPrint', () => {
  it('says there is no data for an empty range, without NaN or undefined', () => {
    const t = text(emptyModel, all);
    expect(t).toContain('لا توجد بيانات في هذه الفترة');
    expect(t).not.toMatch(/NaN|undefined|null/);
  });

  it('says nothing was chosen when every switch is off, without NaN or undefined', () => {
    const t = text(emptyModel, none);
    expect(t).toContain('لم أختر ما يدخل في الملخّص');
    expect(t).not.toMatch(/NaN|undefined|null/);
  });

  it('shows the range and totals in Arabic-Indic digits', () => {
    const t = text(
      { ...emptyModel, totals: { daysLogged: 24, topEmotion: 'anxiety', currentStep: 2 } },
      none,
    );
    expect(t).toContain('٢٤');
    expect(t).toContain('قلق');
    expect(t).toContain('٢٠٢٦');
  });

  it('shows check-ins and a shared practice with its answers', () => {
    const t = text(
      {
        ...emptyModel,
        totals: { daysLogged: 1, topEmotion: 'sadness', currentStep: 1 },
        checkins: [
          {
            id: 'c1',
            at: new Date(2026, 9, 12, 9, 30).toISOString(),
            day: '2026-10-12',
            emotions: ['sadness'],
            intensity: 6,
            tags: [],
            note: 'يوم ثقيل',
            forNextSession: false,
            updatedAt: '',
          },
        ],
        practices: [
          {
            id: 'p1',
            practiceId: 'validate',
            stepId: 1,
            startedAt: '2026-10-20T09:00:00.000Z',
            completedAt: '2026-10-20T09:05:00.000Z',
            answers: { v1: [{ id: 'sadness', intensity: 6 }] },
            share: true,
            forNextSession: false,
            updatedAt: '',
          },
        ],
      },
      all,
    );
    expect(t).toContain('يوم ثقيل');
    expect(t).toContain('٠٩:٣٠');
    expect(t).toContain('تصديق المشاعر');
    expect(t).toContain('حزن ٦ / ١٠');
    expect(t).not.toContain('لا توجد بيانات');
  });
});
