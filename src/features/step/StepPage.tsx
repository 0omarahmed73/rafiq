import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { steps } from '../../content';
import { practicesForStep } from '../../content/practices';
import { useRepo } from '../../db/RepoContext';
import type { StepProgress } from '../../db/schema';
import { SelfUnderstandingGuide } from './SelfUnderstandingGuide';
import { ReadinessCheck } from './ReadinessCheck';
import { StepRecords } from './StepRecords';
import { useI18n } from '../../i18n/LanguageProvider';

const CHOICE_LABEL = {
  keep: { ar: 'أتقبّله وأُبقيه', en: 'I accept it and keep it' },
  change: { ar: 'أتقبّله وأغيّره', en: 'I accept it and change it' },
} as const;

export function StepPage() {
  const repo = useRepo();
  const { t } = useI18n();
  const { id } = useParams();
  const step = steps.find((s) => String(s.id) === id);
  const [progress, setProgress] = useState<StepProgress | null>(null);

  useEffect(() => {
    if (!step) return;
    let alive = true;
    void repo.getStepProgress(step.id).then((p) => alive && setProgress(p));
    return () => {
      alive = false;
    };
  }, [repo, step]);

  if (!step) {
    return (
      <div className="flex flex-col gap-3">
        <p>{t({ ar: 'هذه الخطوة غير موجودة', en: 'This step does not exist' })}</p>
        <Link to="/journey" className="flex min-h-11 items-center font-semibold text-teal">
          {t({ ar: 'العودة إلى الرحلة', en: 'Back to the journey' })}
        </Link>
      </div>
    );
  }

  const decision = progress?.decision;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link to="/journey" className="flex min-h-11 items-center text-[15px] font-semibold text-teal">
          {t({ ar: '‹ الرحلة', en: '‹ Journey' })}
        </Link>
        <span className="text-[13px] text-muted">
          {t({ ar: 'الخطوة {step} من {total}', en: 'Step {step} of {total}' }, { step: step.id, total: 10 })}
        </span>
      </div>

      <h1 className="text-[28px] font-bold leading-snug">{t(step.title)}</h1>

      {step.id === 4 && (
        <Link to="/triggers" aria-label={t({ ar: 'محفزاتي', en: 'My triggers' })} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line bg-card p-4">
          <span className="text-[15px] font-semibold text-teal-ink">{t({ ar: 'محفزاتي', en: 'My triggers' })}</span>
          <span className="text-[13px] text-muted">{t({ ar: 'سجلاتي المحفوظة ‹', en: 'My saved records ›' })}</span>
        </Link>
      )}

      {step.id === 4 ? (
        <SelfUnderstandingGuide question={step.coreQuestion} lesson={step.lesson} />
      ) : (
        <>
      <section className="rounded-2xl bg-teal-soft p-4">
        <div className="mb-1 text-xs font-semibold text-teal-ink">{t({ ar: 'السؤال الأساسي', en: 'Core question' })}</div>
        <p className="text-[17px] font-semibold leading-8">{t(step.coreQuestion)}</p>
      </section>

      <p className="text-[15px] leading-8">{t(step.lesson)}</p>
        </>
      )}

      {decision && (
        <section className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-4">
          <div className="text-xs font-semibold text-muted">{t({ ar: 'قرارك', en: 'My decision' })}</div>
          <div className="text-base font-bold">{t(CHOICE_LABEL[decision.acceptanceChoice])}</div>
          <ul className="m-0 list-disc ps-5 text-sm leading-7">
            {decision.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="mt-1 text-base font-bold">{t({ ar: 'تمارين الخطوة', en: 'Practices for this step' })}</h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {practicesForStep(step.id).map((p) => (
          <li key={p.id}>
            <Link
              to={`/practice/${p.id}`}
              className="flex min-h-14 items-center rounded-2xl border border-line bg-card px-4 text-[15px] font-semibold"
            >
              {t(p.title)}
            </Link>
          </li>
        ))}
      </ul>

      {step.id !== 4 && <StepRecords stepId={step.id} />}

      <ReadinessCheck key={step.id} stepId={step.id} />

      <p className="text-[13px] leading-7 text-muted">
        {t({
          ar: 'كل ما أكتبه في التمارين خاص بي، ولا يظهر في ملخّص معالجي إلا إذا اخترتُ مشاركته.',
          en: 'Everything I write in the practices is private. It only appears in my therapist\'s summary if I choose to share it.',
        })}
      </p>
    </div>
  );
}
