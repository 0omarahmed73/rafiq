import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { steps } from '../../content';
import { useRepo } from '../../db/RepoContext';
import { dayKey, formatArabicDate } from '../../lib/dates';
import { toArabicDigits } from '../../lib/digits';
import { QuickCheckin } from '../checkin/QuickCheckin';
import { currentStepId } from '../step/stepStatus';
import { HomeReminders } from './HomeReminders';
import { WeeklyReviewCard } from './WeeklyReviewCard';

export function HomePage() {
  const repo = useRepo();
  const [stepId, setStepId] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    void currentStepId(repo).then((id) => alive && setStepId(id));
    return () => {
      alive = false;
    };
  }, [repo]);

  const step = steps.find((s) => s.id === stepId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-sm text-muted">{formatArabicDate(dayKey(new Date()))}</div>
          <h1 className="text-[28px] font-bold leading-snug">كيف حالك اليوم؟</h1>
        </div>
        <Link
          to="/calm"
          className="flex min-h-11 items-center rounded-full bg-teal-soft px-4 text-sm font-semibold text-teal-ink"
        >
          أحتاج تهدئة
        </Link>
      </div>

      <HomeReminders />

      <QuickCheckin />

      {step && (
        <section className="flex flex-col gap-2 rounded-2xl bg-teal p-4 text-card">
          <div className="text-sm opacity-90">{`الخطوة ${toArabicDigits(step.id)} من ${toArabicDigits(10)}`}</div>
          <div className="text-[22px] font-bold">{step.title}</div>
          <p className="text-sm leading-7 opacity-90">{step.coreQuestion}</p>
          <Link
            to={`/step/${step.id}`}
            className="mt-1 flex min-h-11 self-start items-center rounded-full bg-card px-5 text-[15px] font-bold text-teal-ink"
          >
            تابع التمرين
          </Link>
        </section>
      )}

      <WeeklyReviewCard />

      <Link to="/settings" className="flex min-h-11 items-center text-sm font-semibold text-teal">
        الإعدادات والنسخ الاحتياطي ‹
      </Link>
    </div>
  );
}
