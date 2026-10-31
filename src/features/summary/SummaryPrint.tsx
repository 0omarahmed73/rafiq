import type { ReactNode } from 'react';
import { emotionLabel } from '../../content';
import { practiceById } from '../../content/practices';
import type { Checkin, PracticeRecord } from '../../db/schema';
import { dayKey, formatArabicDate, formatArabicFullDate, formatArabicTime } from '../../lib/dates';
import { toArabicDigits } from '../../lib/digits';
import { IntensityCurve } from '../tracker/IntensityCurve';
import type { SummaryModel, SummarySwitches } from './buildSummary';
import { formatAnswer } from './formatAnswer';

const TREND = { up: 'ارتفاع', flat: 'استقرار', down: 'انخفاض' } as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="border-b border-line pb-1 text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

function CheckinLine({ c }: { c: Checkin }) {
  return (
    <li className="flex flex-col gap-0.5 text-sm leading-7">
      <span className="font-semibold">
        {`${formatArabicDate(c.day)} ${formatArabicTime(c.at)} · ${c.emotions.map(emotionLabel).join('، ')} · ${toArabicDigits(c.intensity)} / ${toArabicDigits(10)}`}
      </span>
      {c.note && <span className="text-muted">{c.note}</span>}
    </li>
  );
}

function PracticeBlock({ p }: { p: PracticeRecord }) {
  const def = practiceById(p.practiceId);
  const day = dayKey(new Date(p.completedAt ?? p.startedAt));
  return (
    <li className="flex flex-col gap-1 text-sm leading-7">
      <span className="font-semibold">{`${def?.title ?? p.practiceId} · ${formatArabicDate(day)}`}</span>
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

/** The page the therapist receives. Only what the user switched on, and only what they flagged or shared. */
export function SummaryPrint({ model, switches }: { model: SummaryModel; switches: SummarySwitches }) {
  const { totals } = model;
  const anySwitch = Object.values(switches).some(Boolean);
  // A curve needs two points to be a curve; with fewer, the section is left out of the page.
  const showCurve = model.curve.length >= 2;
  const hasContent =
    model.checkins.length +
      (showCurve ? 1 : 0) +
      model.weeklyReviews.length +
      model.practices.length +
      model.tagged.length >
    0;

  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">ملخّص رفيق</h1>
        <p className="text-sm text-muted">{`${formatArabicFullDate(model.range.from)} – ${formatArabicFullDate(model.range.to)}`}</p>
      </header>

      <dl className="m-0 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex gap-1">
          <dt className="text-muted">أيام التسجيل:</dt>
          <dd className="m-0 font-bold">{toArabicDigits(totals.daysLogged)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-muted">أكثر شعور:</dt>
          <dd className="m-0 font-bold">{totals.topEmotion ? emotionLabel(totals.topEmotion) : '—'}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-muted">الخطوة الحالية:</dt>
          <dd className="m-0 font-bold">{toArabicDigits(totals.currentStep)}</dd>
        </div>
      </dl>

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

      {model.tagged.length > 0 && (
        <Section title="للنقاش في الجلسة">
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {model.tagged.map((item) =>
              'practiceId' in item ? <PracticeBlock key={item.id} p={item} /> : <CheckinLine key={item.id} c={item} />,
            )}
          </ul>
        </Section>
      )}
    </article>
  );
}
