import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export function StepCompletion({ stepId, animate }: { stepId: number; animate: boolean }) {
  const next = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (animate) next.current?.focus({ preventScroll: true });
  }, [animate]);
  const last = stepId === 10;
  return (
    <div data-animate={animate || undefined} className="step-completion flex flex-col items-center gap-3 rounded-2xl border border-teal bg-teal-soft p-5 text-center">
      <svg aria-hidden="true" viewBox="0 0 48 48" className="h-12 w-12 fill-none text-teal" stroke="currentColor" strokeWidth="2.5">
        <circle cx="24" cy="24" r="20" opacity="0.25" />
        <path className="completion-check" pathLength="1" d="m14 24 7 7 13-15" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p role="status" className="m-0 text-base font-semibold leading-7 text-teal-ink">أقدّر ما أنجزتُه في هذه الخطوة.</p>
      <p className="m-0 text-sm leading-7 text-teal-ink">{last ? 'يمكنني العودة إلى ما أحتاجه من رحلتي في أي وقت.' : 'أتابع رحلتي في الوقت الذي يناسبني.'}</p>
      <Link ref={next} to={last ? '/journey' : `/step/${stepId + 1}`} className="flex min-h-12 w-full items-center justify-center rounded-full bg-teal px-5 text-[15px] font-bold text-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal">
        {last ? 'أعود إلى رحلتي' : 'أنتقل إلى الخطوة التالية'}
      </Link>
    </div>
  );
}
