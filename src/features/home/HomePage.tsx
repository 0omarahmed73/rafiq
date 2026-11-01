import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { steps } from '../../content';
import { useRepo } from '../../db/RepoContext';
import { dayKey, formatArabicDate } from '../../lib/dates';
import { toArabicDigits } from '../../lib/digits';
import { QuickCheckin } from '../checkin/QuickCheckin';
import { currentStepId } from '../step/stepStatus';
import { YearPlanCard } from './YearPlanCard';
import { HomeNotes } from './HomeNotes';
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
      <div className="flex flex-col gap-3">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <div className="text-sm text-muted">{formatArabicDate(dayKey(new Date()))}</div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/library"
              aria-label="مكتبتي"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-soft text-teal-ink"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 7c-1.5-1.2-3.5-2-7-2v13c3.5 0 5.5.8 7 2 1.5-1.2 3.5-2 7-2V5c-3.5 0-5.5.8-7 2zM12 7v13" />
              </svg>
            </Link>
            <Link
              to="/calm"
              className="flex min-h-11 items-center rounded-full bg-teal-soft px-4 text-sm font-semibold text-teal-ink"
            >
              أحتاج تهدئة
            </Link>
          </div>
        </div>
        <h1 className="text-[28px] font-bold leading-snug">كيف حالك اليوم؟</h1>
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

      <Link to="/triggers" aria-label="محفزاتي" className="flex min-h-20 flex-col justify-center gap-1 rounded-2xl border border-line bg-card p-4">
        <span className="text-base font-bold text-teal-ink">محفزاتي</span>
        <span className="text-sm leading-7 text-muted">أعود إلى سجلاتي لفهم ذاتي، أو أضيف سجلًا جديدًا.</span>
      </Link>

      <HomeNotes />

      <WeeklyReviewCard />

      <YearPlanCard />

      <Link to="/settings" className="flex min-h-11 items-center text-sm font-semibold text-teal">
        الإعدادات والنسخ الاحتياطي ‹
      </Link>
    </div>
  );
}
