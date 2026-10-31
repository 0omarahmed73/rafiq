import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { steps } from '../../content';
import { practicesForStep } from '../../content/practices';
import { useRepo } from '../../db/RepoContext';
import type { StepProgress } from '../../db/schema';
import { toArabicDigits } from '../../lib/digits';
import { SelfUnderstandingGuide } from './SelfUnderstandingGuide';
import { ReadinessCheck } from './ReadinessCheck';

const CHOICE_LABEL = { keep: 'أتقبّله وأُبقيه', change: 'أتقبّله وأغيّره' } as const;

export function StepPage() {
  const repo = useRepo();
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
        <p>هذه الخطوة غير موجودة</p>
        <Link to="/journey" className="flex min-h-11 items-center font-semibold text-teal">
          العودة إلى الرحلة
        </Link>
      </div>
    );
  }

  const decision = progress?.decision;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Link to="/journey" className="flex min-h-11 items-center text-[15px] font-semibold text-teal">
          ‹ الرحلة
        </Link>
        <span className="text-[13px] text-muted">{`الخطوة ${toArabicDigits(step.id)} من ${toArabicDigits(10)}`}</span>
      </div>

      <h1 className="text-[28px] font-bold leading-snug">{step.title}</h1>

      {step.id === 4 && (
        <Link to="/triggers" aria-label="محفزاتي" className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line bg-card p-4">
          <span className="text-[15px] font-semibold text-teal-ink">محفزاتي</span>
          <span className="text-[13px] text-muted">سجلاتي المحفوظة ‹</span>
        </Link>
      )}

      {step.id === 4 ? (
        <SelfUnderstandingGuide question={step.coreQuestion} lesson={step.lesson} />
      ) : (
        <>
      <section className="rounded-2xl bg-teal-soft p-4">
        <div className="mb-1 text-xs font-semibold text-teal-ink">السؤال الأساسي</div>
        <p className="text-[17px] font-semibold leading-8">{step.coreQuestion}</p>
      </section>

      <p className="text-[15px] leading-8">{step.lesson}</p>
        </>
      )}

      {decision && (
        <section className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-4">
          <div className="text-xs font-semibold text-muted">قرارك</div>
          <div className="text-base font-bold">{CHOICE_LABEL[decision.acceptanceChoice]}</div>
          <ul className="m-0 list-disc ps-5 text-sm leading-7">
            {decision.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="mt-1 text-base font-bold">تمارين الخطوة</h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {practicesForStep(step.id).map((p) => (
          <li key={p.id}>
            <Link
              to={`/practice/${p.id}`}
              className="flex min-h-14 items-center rounded-2xl border border-line bg-card px-4 text-[15px] font-semibold"
            >
              {p.title}
            </Link>
          </li>
        ))}
      </ul>

      <ReadinessCheck key={step.id} stepId={step.id} />

      <p className="text-[13px] leading-7 text-muted">
        كل ما أكتبه في التمارين خاص بي، ولا يظهر في ملخّص معالجي إلا إذا اخترتُ مشاركته.
      </p>
    </div>
  );
}
