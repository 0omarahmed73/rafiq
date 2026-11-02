import { Link } from 'react-router-dom';
import { symptoms } from '../../content/library';
import { BackLink, DraftBadge, Footer } from './parts';
import { digits, t } from '../../i18n';

/** The nine features as gentle cards. It is reading, never a test: nothing is scored or saved. */
export function SymptomsPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <BackLink to="/library">{t({ ar: 'مكتبتي', en: 'My library' })}</BackLink>
      <header className="flex flex-col gap-3">
        <h1 className="text-[28px] font-bold leading-snug">{t({ ar: 'الأعراض بكلمات رحيمة', en: 'Symptoms in gentle words' })}</h1>
        <DraftBadge status="draft" />
        <p className="m-0 text-[15px] leading-8 text-muted">
          {t({ ar: 'كل بطاقة تصف شعورًا قد يمرّ به الإنسان، وما الحاجة التي خلفه. لا اختبار ولا نتيجة هنا، ولا أحد يحكم عليّ. أقرأ ما أريد، وأتوقف حين أشاء.', en: 'Each card describes a feeling a person may go through, and the need behind it. There is no test and no result here, and nobody judges me. I read what I want, and I stop when I like.' })}
        </p>
      </header>

      <ul aria-label={t({ ar: 'الأعراض', en: 'Symptoms' })} className="m-0 flex list-none flex-col gap-2.5 p-0">
        {symptoms.map((s, i) => (
          <li key={s.id}>
            <Link
              to={`/library/symptoms/${s.id}`}
              className="flex min-h-20 items-center gap-3 rounded-2xl border border-line bg-card p-4 active:bg-teal-soft"
            >
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-soft text-[15px] font-bold text-teal-ink">
                {digits(i + 1)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[16px] font-bold leading-snug text-ink">{t(s.title)}</span>
                <span className="text-[13.5px] leading-6 text-muted">{t(s.summary)}</span>
              </span>
              <span aria-hidden="true" className="text-xl text-teal">
                ‹
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Footer />
    </div>
  );
}
