import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { steps } from '../../content';
import { useRepo } from '../../db/RepoContext';
import type { StepProgress } from '../../db/schema';
import { type Bi } from '../../i18n';
import { useI18n } from '../../i18n/LanguageProvider';

const STATUS_LABEL: Partial<Record<StepProgress['status'], Bi>> = {
  done: { ar: 'مكتملة', en: 'Done' },
  inProgress: { ar: 'قيد التمرين', en: 'In progress' },
};

export function JourneyPage() {
  const repo = useRepo();
  const { t, digits } = useI18n();
  const [progress, setProgress] = useState<StepProgress[] | null>(null);

  useEffect(() => {
    let alive = true;
    void Promise.all(steps.map((s) => repo.getStepProgress(s.id))).then((rows) => alive && setProgress(rows));
    return () => {
      alive = false;
    };
  }, [repo]);

  if (!progress) return null;
  const currentId = progress.find((p) => p.status !== 'done')?.stepId ?? 10;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="mb-1 text-[28px] font-bold leading-snug">{t({ ar: 'رحلتك', en: 'Your journey' })}</h1>
        <p className="text-sm leading-7 text-muted">
          {t({
            ar: 'عشر خطوات بالترتيب الذي يناسبني. يمكنني العودة إلى أي خطوة في أي وقت، فلا شيء مقفل.',
            en: 'Ten steps, in the order that suits me. I can go back to any step at any time, because nothing is locked.',
          })}
        </p>
      </div>
      <ol aria-label={t({ ar: 'خطوات الرحلة', en: 'Journey steps' })} className="m-0 flex list-none flex-col gap-2 p-0">
        {steps.map((s, i) => {
          const status = progress[i].status;
          const isCurrent = s.id === currentId;
          return (
            <li key={s.id}>
              <Link
                to={`/step/${s.id}`}
                aria-current={isCurrent ? 'step' : undefined}
                className={`flex min-h-14 items-center gap-3 rounded-2xl bg-card px-3.5 py-2 ${
                  isCurrent ? 'border-2 border-teal' : 'border border-line'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${
                    status === 'done' ? 'bg-teal text-card' : 'bg-teal-soft text-teal-ink'
                  }`}
                >
                  {status === 'done' ? '✓' : digits(s.id)}
                </span>
                <span className="flex-1">
                  <span className="block text-base font-semibold leading-snug">{t(s.title)}</span>
                  <span className="line-clamp-1 block text-[13px] text-muted">{t(s.coreQuestion)}</span>
                </span>
                {STATUS_LABEL[status] && (
                  <span className="whitespace-nowrap rounded-full bg-teal-soft px-2.5 py-1 text-xs font-semibold text-teal-ink">
                    {t(STATUS_LABEL[status]!)}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
