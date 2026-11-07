import { useEffect, useState } from 'react';
import { Switch } from '../../components/Switch';
import { emotionLabel } from '../../content';
import { weeklyQuestionText } from '../../content/weeklyQuestions';
import { useRepo } from '../../db/RepoContext';
import type { WeeklyReview } from '../../db/schema';
import { useI18n } from '../../i18n/LanguageProvider';
import { ensureWeeklyReview } from '../../lib/weekly';

const TREND = {
  up: { ar: 'ارتفاع', en: 'rising' },
  flat: { ar: 'استقرار', en: 'steady' },
  down: { ar: 'انخفاض', en: 'falling' },
} as const;

export function WeeklyReviewCard({ today = new Date() }: { today?: Date }) {
  const repo = useRepo();
  const { t } = useI18n();
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
  const emotions = summary.topEmotions.map((e) => emotionLabel(e.id)).join(t({ ar: '، ', en: ', ' })) || '—';

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-teal-soft p-4 text-teal-ink">
      <h2 className="text-[13px] font-semibold">{t({ ar: 'مراجعة الأسبوع جاهزة', en: 'Your weekly review is ready' })}</h2>
      <p className="text-sm leading-7">
        {t(
          { ar: 'أكثر المشاعر: {emotions} · الشدّة: {trend}', en: 'Most common feelings: {emotions} · Intensity: {trend}' },
          { emotions, trend: t(TREND[summary.trend]) },
        )}
      </p>
      <p className="text-base font-semibold leading-8 text-ink">{weeklyQuestionText(summary.question)}</p>
      <textarea
        aria-label={t({ ar: 'إجابتي', en: 'My answer' })}
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
        {t({ ar: 'حفظ إجابتي', en: 'Save my answer' })}
      </button>
      <Switch
        label={t({ ar: 'مشاركة مع معالجي', en: 'Share with my therapist' })}
        checked={review.share}
        onChange={(share) => void update({ share })}
      />
    </section>
  );
}
