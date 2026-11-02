import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { symptoms } from '../../content/library';
import { type Bi, t } from '../../i18n';

const icon = (paths: ReactNode) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {paths}
  </svg>
);

const sections: { to: string; title: Bi; body: Bi; meta: Bi; metaCount?: number; icon: ReactNode }[] = [
  {
    to: '/library/about',
    title: { ar: 'ما هو اضطراب الشخصية الحدّية؟', en: 'What is borderline personality disorder?' } satisfies Bi,
    body: {
      ar: 'شرح هادئ بكلمات بسيطة: ما هو، ومن أين يأتي، ومن يشخّصه، وهل له علاج.',
      en: 'A calm explanation in simple words: what it is, where it comes from, who diagnoses it, and whether it can be treated.',
    } satisfies Bi,
    meta: { ar: 'قراءة قصيرة', en: 'Short reading' } satisfies Bi,
    // an open book
    icon: icon(<path d="M12 7c-1.5-1.2-3.5-2-7-2v13c3.5 0 5.5.8 7 2 1.5-1.2 3.5-2 7-2V5c-3.5 0-5.5.8-7 2zM12 7v13" />),
  },
  {
    to: '/library/symptoms',
    title: { ar: 'الأعراض بكلمات رحيمة', en: 'Symptoms in gentle words' } satisfies Bi,
    body: {
      ar: 'كل عَرَض كيف قد يكون شعورًا من الداخل، وما الحاجة خلفه، وجمل لطيفة أختار منها.',
      en: 'Each symptom, how it may feel from the inside, the need behind it, and gentle sentences I can choose from.',
    } satisfies Bi,
    meta: { ar: '{count} بطاقات', en: '{count} cards' } satisfies Bi,
    metaCount: symptoms.length,
    // a heart
    icon: icon(<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />),
  },
  {
    to: '/library/hope',
    title: { ar: 'الأمل والتعافي', en: 'Hope and recovery' } satisfies Bi,
    body: {
      ar: 'ما تقوله الأبحاث بصدق، وكيف يصف المتعافون طريقهم، وماذا عن الانتكاسة.',
      en: 'What the research honestly says, how people in recovery describe their way, and what to know about setbacks.',
    } satisfies Bi,
    meta: { ar: 'مع حدود الأدلة', en: 'With the limits of the evidence' } satisfies Bi,
    // a sprout
    icon: icon(<path d="M12 21v-9M12 12c0-3.5-2.5-6-6-6 0 3.5 2.5 6 6 6zm0 0c0-3 2.2-5 5.5-5 0 3-2.2 5-5.5 5z" />),
  },
];

/** «مكتبتي»: calm, sourced reading about borderline personality disorder. */
export function LibraryPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold leading-snug">{t({ ar: 'مكتبتي', en: 'My library' })}</h1>
        <p className="m-0 text-[15px] leading-8 text-muted">
          {t({ ar: 'أقرأ هنا عن اضطراب الشخصية الحدّية بهدوء، من مصادر موثوقة، وبكلمات لا تؤذيني. القراءة ليست تشخيصًا.', en: 'I read here about borderline personality disorder calmly, from trusted sources, in words that do not hurt me. Reading is not a diagnosis.' })}
        </p>
      </header>

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {sections.map((s) => (
          <li key={s.to}>
            <Link
              to={s.to}
              className="flex min-h-24 items-center gap-4 rounded-2xl border border-line bg-card p-4 active:bg-teal-soft"
            >
              <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-soft text-teal-ink">
                {s.icon}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-[17px] font-bold leading-snug text-ink">{t(s.title)}</span>
                <span className="text-[14px] leading-7 text-muted">{t(s.body)}</span>
                <span className="text-[13px] font-semibold text-teal-ink">
                  {t(s.meta, s.metaCount === undefined ? undefined : { count: s.metaCount })}
                </span>
              </span>
              <span aria-hidden="true" className="text-xl text-teal">
                {t({ ar: '‹', en: '›' })}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <aside className="flex flex-col gap-1 rounded-2xl bg-teal-soft p-4 text-[14px] leading-7 text-teal-ink">
        <strong>{t({ ar: 'هذه النصوص مسودة للمراجعة', en: 'These texts are drafts for review' })}</strong>
        <span>{t({ ar: 'كتبتُها من مصادر موثوقة تجدها في آخر كل صفحة، وسيراجعها معالج مختص قبل اعتمادها.', en: 'I wrote them from trusted sources, listed at the end of each page. A qualified therapist will review them before they are approved.' })}</span>
      </aside>

      <Link
        to="/calm"
        className="flex min-h-12 items-center justify-center rounded-full border-[1.5px] border-teal bg-card px-5 text-[15px] font-bold text-teal-ink"
      >
        {t({ ar: 'أحتاج تهدئة', en: 'I need calm' })}
      </Link>
    </div>
  );
}
