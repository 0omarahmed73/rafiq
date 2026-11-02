import { useEffect, useRef, useState } from 'react';
import { readinessQuestions } from '../../content/readiness';
import { useRepo } from '../../db/RepoContext';
import { type Bi } from '../../i18n';
import { useI18n } from '../../i18n/LanguageProvider';
import { readinessMessage } from '../../lib/readiness';
import { StepCompletion } from './StepCompletion';

const MESSAGE: Record<'ready' | 'stay', Bi> = {
  ready: {
    ar: 'يبدو أن الوقت مناسب للانتقال إلى الخطوة التالية.',
    en: 'It looks like a good time to move on to the next step.',
  },
  stay: { ar: 'من الأفضل البقاء قليلًا في هذه الخطوة.', en: 'It is better to stay a little longer in this step.' },
};

/** A self-reflection, never a gate: the result is advice and nothing is locked or blocked. */
export function ReadinessCheck({ stepId }: { stepId: number }) {
  const repo = useRepo();
  const { t, digits } = useI18n();
  const questions = readinessQuestions[stepId];
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null]);
  const [saved, setSaved] = useState<number[] | null>(null);
  const [done, setDone] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);

  useEffect(() => {
    let alive = true;
    void repo.getStepProgress(stepId).then((p) => {
      if (!alive) return;
      setDone(p.status === 'done');
      setAnswers(p.readiness?.answers ?? [null, null, null]);
      setSaved(p.readiness?.answers ?? null);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [repo, stepId]);

  const complete = answers.every((a): a is number => a !== null);

  async function save() {
    if (!complete) return;
    const progress = await repo.getStepProgress(stepId);
    const values = answers as number[];
    await repo.saveStepProgress({
      ...progress,
      readiness: { answers: values, at: new Date().toISOString() },
    });
    setSaved(values);
  }

  async function finishStep() {
    if (busy.current || done || !loaded) return;
    busy.current = true;
    setFinishing(true);
    setError('');
    try {
      const progress = await repo.getStepProgress(stepId);
      await repo.saveStepProgress({ ...progress, status: 'done' });
      setJustCompleted(true);
      setDone(true);
    } catch {
      setError(t({ ar: 'أحتاج إلى المحاولة مرة أخرى لحفظ إتمام هذه الخطوة.', en: 'I need to try again to save finishing this step.' }));
    } finally {
      busy.current = false;
      setFinishing(false);
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-card p-4">
      <h2 className="text-base font-bold">{t({ ar: 'هل أنا جاهز للخطوة التالية؟', en: 'Am I ready for the next step?' })}</h2>
      <p className="text-[13px] leading-7 text-muted">
        {t({
          ar: 'هذه مراجعة لنفسي وليست اختبارًا. لا شيء يُغلق مهما كانت النتيجة.',
          en: 'This is a check-in with myself, not a test. Nothing is locked, whatever the result.',
        })}
      </p>

      {questions.map((q, qi) => (
        <fieldset key={q.ar} className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1 text-[15px] font-semibold leading-7">{t(q)}</legend>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <label
                key={n}
                className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border text-[15px] font-semibold ${
                  answers[qi] === n ? 'border-teal bg-teal-soft text-teal-ink' : 'border-line bg-bg'
                }`}
              >
                <input
                  type="radio"
                  name={`readiness-${stepId}-${qi}`}
                  checked={answers[qi] === n}
                  onChange={() => setAnswers((a) => a.map((x, i) => (i === qi ? n : x)))}
                  aria-label={digits(n)}
                  className="sr-only"
                />
                {digits(n)}
              </label>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted">
            <span>{t({ ar: 'لا ينطبق', en: 'Does not apply' })}</span>
            <span>{t({ ar: 'ينطبق تمامًا', en: 'Applies fully' })}</span>
          </div>
        </fieldset>
      ))}

      <button
        type="button"
        onClick={save}
        disabled={!complete}
        className="min-h-12 rounded-full bg-teal px-6 text-[15px] font-bold text-card disabled:opacity-50"
      >
        {t({ ar: 'حفظ الإجابات', en: 'Save answers' })}
      </button>

      {saved && (
        <p role="status" className="rounded-xl bg-teal-soft p-3 text-[15px] font-semibold leading-7 text-teal-ink">
          {t(MESSAGE[readinessMessage(saved)])}
        </p>
      )}
      {error && <p role="alert" className="text-sm leading-7 text-ink">{error}</p>}
      {done ? (
        <StepCompletion stepId={stepId} animate={justCompleted} />
      ) : (
        <button
          type="button"
          onClick={() => void finishStep()}
          disabled={!loaded || finishing}
          className="min-h-12 rounded-full border-[1.5px] border-teal bg-card px-6 text-[15px] font-bold text-teal-ink disabled:opacity-50"
        >
          {t({ ar: 'أنهيتُ هذه الخطوة', en: 'I have finished this step' })}
        </button>
      )}
    </section>
  );
}
