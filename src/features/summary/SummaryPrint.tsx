import type { ReactNode } from 'react';
import { emotionLabel } from '../../content';
import { practiceById } from '../../content/practices';
import type { Checkin, Homework, Note, PracticeRecord } from '../../db/schema';
import { dayKey, formatArabicDate, formatArabicFullDate, formatArabicTime } from '../../lib/dates';
import { toArabicDigits } from '../../lib/digits';
import { IntensityCurve } from '../tracker/IntensityCurve';
import type { SummaryModel, SummarySwitches } from './buildSummary';
import { formatAnswer } from './formatAnswer';

const TREND = { up: 'ارتفاع', flat: 'استقرار', down: 'انخفاض' } as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="break-after-avoid border-b-2 border-teal pb-1.5 text-lg font-bold text-teal-ink">{title}</h2>
      {children}
    </section>
  );
}

function IntensityBar({ value }: { value: number }) {
  return (
    <span aria-hidden="true" className="flex gap-px">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={`h-2 w-1.5 border border-teal ${i < value ? 'bg-teal' : 'bg-transparent'}`} />
      ))}
    </span>
  );
}

function CheckinLine({ c }: { c: Checkin }) {
  return (
    <li className="break-inside-avoid border-b border-line py-2 last:border-b-0 text-sm leading-7">
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <span className="font-bold">{`${formatArabicDate(c.day)} · ${formatArabicTime(c.at)}`}</span>
        <span className="flex items-center gap-2">
          <IntensityBar value={c.intensity} />
          <span className="font-bold">{`${toArabicDigits(c.intensity)} / ${toArabicDigits(10)}`}</span>
        </span>
      </div>
      <div>{c.emotions.map(emotionLabel).join('، ')}</div>
      {c.note && <div className="text-muted">{c.note}</div>}
    </li>
  );
}

function PracticeBlock({ p }: { p: PracticeRecord }) {
  const def = practiceById(p.practiceId);
  const day = dayKey(new Date(p.completedAt ?? p.startedAt));
  return (
    <li className="flex break-inside-avoid flex-col gap-1 border-b border-line pb-3 last:border-b-0 text-sm leading-7">
      <span className="font-bold">{`${def?.title ?? p.practiceId} · ${formatArabicDate(day)}`}</span>
      {def?.prompts.map((prompt) => {
        const text = formatAnswer(prompt, p.answers[prompt.id]);
        return text ? (
          <span key={prompt.id} className="whitespace-pre-line">
            <span className="text-muted">{prompt.label}: </span>
            {text}
          </span>
        ) : null;
      })}
    </li>
  );
}

function HomeworkBlock({ h }: { h: Homework }) {
  return (
    <li className="flex break-inside-avoid flex-col gap-1 border-b border-line pb-3 last:border-b-0 text-sm leading-7">
      <span className="flex flex-wrap items-baseline justify-between gap-x-4">
        <span className="font-bold">{`${h.text} · ${formatArabicDate(dayKey(new Date(h.createdAt)))}`}</span>
        <span className="text-muted">{h.done ? 'أنجزتُه' : 'لم أنجزه'}</span>
      </span>
      {h.answer ? <span className="whitespace-pre-line">{h.answer}</span> : <span className="text-muted">لم أكتب إجابة</span>}
    </li>
  );
}

function NoteBlock({ n }: { n: Note }) {
  return (
    <li className="flex break-inside-avoid flex-col gap-0.5 border-b border-line pb-2 last:border-b-0 text-sm leading-7">
      <span className="font-bold">{`${formatArabicDate(dayKey(new Date(n.createdAt)))} · ${formatArabicTime(n.createdAt)}`}</span>
      <span className="whitespace-pre-line">{n.text}</span>
    </li>
  );
}

/** The page the therapist receives. Only what the user switched on, and only what they flagged or shared. */
export function SummaryPrint({
  model,
  switches,
  profile,
  generatedOn,
}: {
  model: SummaryModel;
  switches: SummarySwitches;
  profile?: { displayName?: string; therapistName?: string };
  /** Day the page was made, `YYYY-MM-DD`. */
  generatedOn?: string;
}) {
  const { totals } = model;
  const anySwitch = Object.values(switches).some(Boolean);
  // A curve needs two points to be a curve; with fewer, the section is left out of the page.
  const showCurve = model.curve.length >= 2;
  const hasContent =
    model.checkins.length +
      (showCurve ? 1 : 0) +
      model.weeklyReviews.length +
      model.practices.length +
      model.homework.length +
      model.notes.length +
      model.tagged.length >
    0;

  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 border-b-4 border-teal pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-bold text-teal-ink">ملخّص رفيق</h1>
          <span className="text-xs font-semibold text-muted">للمعالج</span>
        </div>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
          {profile?.displayName && (
            <>
              <dt className="text-muted">الاسم:</dt>
              <dd className="m-0 font-bold">{profile.displayName}</dd>
            </>
          )}
          {profile?.therapistName && (
            <>
              <dt className="text-muted">المعالج:</dt>
              <dd className="m-0 font-bold">{profile.therapistName}</dd>
            </>
          )}
          <dt className="text-muted">الفترة:</dt>
          <dd className="m-0 font-bold">{`${formatArabicFullDate(model.range.from)} – ${formatArabicFullDate(model.range.to)}`}</dd>
        </dl>
      </header>

      {anySwitch && (
        <dl className="m-0 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border-[1.5px] border-teal bg-teal-soft p-2">
            <dd className="m-0 text-xl font-bold">{toArabicDigits(totals.daysLogged)}</dd>
            <dt className="text-xs text-muted">أيام التسجيل</dt>
          </div>
          <div className="rounded-lg border-[1.5px] border-teal bg-teal-soft p-2">
            <dd className="m-0 text-xl font-bold">{totals.topEmotion ? emotionLabel(totals.topEmotion) : '—'}</dd>
            <dt className="text-xs text-muted">أكثر شعور</dt>
          </div>
          <div className="rounded-lg border-[1.5px] border-teal bg-teal-soft p-2">
            <dd className="m-0 text-xl font-bold">{toArabicDigits(totals.currentStep)}</dd>
            <dt className="text-xs text-muted">الخطوة الحالية</dt>
          </div>
        </dl>
      )}

      {!anySwitch && <p className="text-sm text-muted">لم أختر ما يدخل في الملخّص.</p>}
      {anySwitch && !hasContent && <p className="text-sm text-muted">لا توجد بيانات في هذه الفترة.</p>}

      {model.checkins.length > 0 && (
        <Section title="تسجيلات المشاعر">
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {model.checkins.map((c) => (
              <CheckinLine key={c.id} c={c} />
            ))}
          </ul>
        </Section>
      )}

      {showCurve && (
        <Section title="منحنى الشدّة">
          <IntensityCurve values={model.curve.map((d) => d.max)} />
        </Section>
      )}

      {model.weeklyReviews.length > 0 && (
        <Section title="مراجعات الأسبوع">
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {model.weeklyReviews.map((r) => (
              <li key={r.id} className="flex flex-col gap-0.5 text-sm leading-7">
                <span className="font-semibold">{`أسبوع ${formatArabicDate(r.weekStart)}`}</span>
                <span>{`أكثر المشاعر: ${r.summary.topEmotions.map((e) => emotionLabel(e.id)).join('، ') || '—'} · الشدّة: ${TREND[r.summary.trend]}`}</span>
                <span className="text-muted">{r.summary.question}</span>
                {r.answer && <span>{r.answer}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {model.practices.length > 0 && (
        <Section title="الممارسات الموجّهة">
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {model.practices.map((p) => (
              <PracticeBlock key={p.id} p={p} />
            ))}
          </ul>
        </Section>
      )}

      {model.homework.length > 0 && (
        <Section title="إجابات الواجبات">
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {model.homework.map((h) => (
              <HomeworkBlock key={h.id} h={h} />
            ))}
          </ul>
        </Section>
      )}

      {model.notes.length > 0 && (
        <Section title="ملاحظاتي">
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {model.notes.map((n) => (
              <NoteBlock key={n.id} n={n} />
            ))}
          </ul>
        </Section>
      )}

      {model.tagged.length > 0 && (
        <Section title="للنقاش في الجلسة">
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {model.tagged.map((item) =>
              'practiceId' in item ? <PracticeBlock key={item.id} p={item} /> : <CheckinLine key={item.id} c={item} />,
            )}
          </ul>
        </Section>
      )}
      <footer className="mt-2 flex flex-col gap-0.5 border-t border-line pt-2 text-xs leading-6 text-muted">
        <span>هذا الملخّص من تسجيلاتي الشخصية وليس تشخيصًا.</span>
        {generatedOn && <span>{`أُنشئ في ${formatArabicFullDate(generatedOn)}`}</span>}
      </footer>
    </article>
  );
}
