import { useEffect, useState } from 'react';
import { Switch } from '../../components/Switch';
import { emotionLabel } from '../../content';
import { useRepo } from '../../db/RepoContext';
import type { WeeklyReview } from '../../db/schema';
import { ensureWeeklyReview } from '../../lib/weekly';

const TREND = { up: 'ارتفاع', flat: 'استقرار', down: 'انخفاض' } as const;

export function WeeklyReviewCard({ today = new Date() }: { today?: Date }) {
  const repo = useRepo();
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    let alive = true;
    void ensureWeeklyReview(repo, today).then((r) => {
      if (!alive || !r) return;
      setReview(r);
      setAnswer(r.answer ?? '');
    });
    return () => {
      alive = false;
    };
    // The review depends on the day, not on the Date object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, today.toDateString()]);

  if (!review) return null;

  async function update(patch: Partial<Pick<WeeklyReview, 'answer' | 'share'>>) {
    if (!review) return;
    const next = { ...review, ...patch };
    await repo.saveWeeklyReview(next);
    setReview(next);
  }

  const { summary } = review;
  const emotions = summary.topEmotions.map((e) => emotionLabel(e.id)).join('، ') || '—';

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-teal-soft p-4 text-teal-ink">
      <h2 className="text-[13px] font-semibold">مراجعة الأسبوع جاهزة</h2>
      <p className="text-sm leading-7">{`أكثر المشاعر: ${emotions} · الشدّة: ${TREND[summary.trend]}`}</p>
      <p className="text-base font-semibold leading-8 text-ink">{summary.question}</p>
      <textarea
        aria-label="إجابتي"
        rows={3}
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        className="w-full rounded-2xl border border-line bg-card p-3 text-base leading-8 text-ink"
      />
      <button
        type="button"
        onClick={() => void update({ answer: answer.trim() })}
        className="min-h-11 self-start rounded-full border-[1.5px] border-teal bg-card px-5 text-[15px] font-bold text-teal-ink"
      >
        حفظ إجابتي
      </button>
      <Switch
        label="مشاركة مع معالجي"
        checked={review.share}
        onChange={(share) => void update({ share })}
      />
    </section>
  );
}
