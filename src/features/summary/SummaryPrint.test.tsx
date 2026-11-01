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
  homework: [],
  notes: [],
};
const all: SummarySwitches = { checkins: true, curve: true, weeklyReviews: true, practices: true, tagged: true, homework: true, notes: true };
const none: SummarySwitches = { checkins: false, curve: false, weeklyReviews: false, practices: false, tagged: false, homework: false, notes: false };

function text(model: SummaryModel, switches: SummarySwitches, extra: Partial<Parameters<typeof SummaryPrint>[0]> = {}) {
  const { container } = render(<SummaryPrint model={model} switches={switches} {...extra} />);
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
    expect(t).not.toContain('أيام التسجيل');
    expect(t).toContain('لم أختر ما يدخل في الملخّص');
    expect(t).not.toMatch(/NaN|undefined|null/);
  });

  it('writes the range as dates with month names, not hyphenated numbers', () => {
    const t = text(emptyModel, none);
    expect(t).toContain('١ أكتوبر ٢٠٢٦ – ٣١ أكتوبر ٢٠٢٦');
    expect(t).not.toContain('٢٠٢٦-١٠');
  });

  it('draws the intensity curve only when there are at least two days to draw', () => {
    const one = { ...emptyModel, curve: [{ day: '2026-10-01', max: 5 }] };
    const two = { ...emptyModel, curve: [{ day: '2026-10-01', max: 5 }, { day: '2026-10-02', max: 7 }] };
    const curveOnly = { ...none, curve: true };

    const alone = text(one, curveOnly);
    expect(alone).not.toContain('منحنى الشدّة');
    expect(alone).not.toContain('أسجّل يومين');
    expect(alone).toContain('لا توجد بيانات في هذه الفترة');

    expect(text(two, curveOnly)).toContain('منحنى الشدّة');
  });

  it('prints no totals at all when every switch is off', () => {
    const t = text({ ...emptyModel, totals: { daysLogged: 24, topEmotion: 'anxiety', currentStep: 2 } }, none);
    expect(t).not.toContain('أيام التسجيل');
    expect(t).not.toContain('أكثر شعور');
    expect(t).not.toContain('الخطوة الحالية');
    expect(t).not.toContain('قلق');
    expect(t).toContain('لم أختر ما يدخل في الملخّص');
  });

  it('shows the range and totals in Arabic-Indic digits', () => {
    const t = text(
      { ...emptyModel, totals: { daysLogged: 24, topEmotion: 'anxiety', currentStep: 2 } },
      { ...none, checkins: true },
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

  describe('header and footer', () => {
    it('names the person, the therapist and the day it was made when they are known', () => {
      const t = text(emptyModel, all, {
        profile: { displayName: 'عمر', therapistName: 'د. سارة' },
        generatedOn: '2026-10-31',
      });
      expect(t).toContain('الاسم');
      expect(t).toContain('عمر');
      expect(t).toContain('المعالج');
      expect(t).toContain('د. سارة');
      expect(t).toContain('أُنشئ في ٣١ أكتوبر ٢٠٢٦');
    });

    it('leaves out the name and therapist rows when they are not set', () => {
      const t = text(emptyModel, all, { generatedOn: '2026-10-31' });
      expect(t).not.toContain('الاسم');
      expect(t).not.toContain('المعالج:');
    });

    it('ends with the note that this is not a diagnosis', () => {
      expect(text(emptyModel, all)).toContain('هذا الملخّص من تسجيلاتي الشخصية وليس تشخيصًا');
    });
  });

  it('writes a check-in intensity out of ten beside its emotions', () => {
    const t = text(
      {
        ...emptyModel,
        checkins: [
          { id: 'c1', at: new Date(2026, 9, 12, 9, 30).toISOString(), day: '2026-10-12', emotions: ['sadness', 'anxiety'], intensity: 7, tags: [], forNextSession: false, updatedAt: '' },
        ],
      },
      { ...none, checkins: true },
    );
    expect(t).toContain('حزن، قلق');
    expect(t).toContain('٧ / ١٠');
  });

  describe('homework answers', () => {
    const hw = (over: Record<string, unknown>) => ({
      id: 'h', sessionId: 's', text: 'واجب', done: false, createdAt: '2026-10-12T09:00:00.000Z', updatedAt: '', ...over,
    });

    it('prints each homework with its title, whether it was done, and the written answer', () => {
      const t = text(
        { ...emptyModel, homework: [hw({ id: 'a', text: 'تمرين التنفّس', answer: 'جرّبتُه مرتين', done: true }), hw({ id: 'b', text: 'أكتب أفكاري' })] },
        { ...none, homework: true },
      );
      expect(t).toContain('إجابات الواجبات');
      expect(t).toContain('تمرين التنفّس');
      expect(t).toContain('جرّبتُه مرتين');
      expect(t).toContain('أنجزتُه');
      expect(t).toContain('أكتب أفكاري');
      expect(t).toContain('لم أكتب إجابة');
      expect(t).toContain('لم أنجزه');
    });

    it('leaves the section out when there is no homework', () => {
      expect(text(emptyModel, { ...none, homework: true })).not.toContain('إجابات الواجبات');
    });
  });

  describe('notes', () => {
    it('prints notes with their date and time, oldest first, and marks nothing about archives', () => {
      const t = text(
        {
          ...emptyModel,
          notes: [
            { id: 'a', text: 'ملاحظة أولى', createdAt: new Date(2026, 9, 5, 9, 30).toISOString(), updatedAt: '' },
            { id: 'b', text: 'ملاحظة ثانية', createdAt: new Date(2026, 9, 12, 18, 0).toISOString(), archivedAt: '2026-10-13T08:00:00.000Z', updatedAt: '' },
          ],
        },
        { ...none, notes: true },
      );
      expect(t).toContain('ملاحظاتي');
      expect(t.indexOf('ملاحظة أولى')).toBeLessThan(t.indexOf('ملاحظة ثانية'));
      expect(t).toContain('٠٩:٣٠');
      expect(t).not.toContain('لا توجد بيانات');
    });

    it('keeps the whole page free of notes when the switch is off or there are none', () => {
      expect(text(emptyModel, { ...none, notes: true })).not.toContain('ملاحظاتي');
    });
  });
});
