import { Link } from 'react-router-dom';
import { symptoms } from '../../content/library';
import { toArabicDigits } from '../../lib/digits';
import { BackLink, DraftBadge, Footer } from './parts';

/** The nine features as gentle cards. It is reading, never a test: nothing is scored or saved. */
export function SymptomsPage() {
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <BackLink to="/library">مكتبتي</BackLink>
      <header className="flex flex-col gap-3">
        <h1 className="text-[28px] font-bold leading-snug">الأعراض بكلمات رحيمة</h1>
        <DraftBadge status="draft" />
        <p className="m-0 text-[15px] leading-8 text-muted">
          كل بطاقة تصف شعورًا قد يمرّ به الإنسان، وما الحاجة التي خلفه. لا اختبار ولا نتيجة هنا، ولا أحد يحكم عليّ. أقرأ ما أريد، وأتوقف حين أشاء.
        </p>
      </header>

      <ul aria-label="الأعراض" className="m-0 flex list-none flex-col gap-2.5 p-0">
        {symptoms.map((s, i) => (
          <li key={s.id}>
            <Link
              to={`/library/symptoms/${s.id}`}
              className="flex min-h-20 items-center gap-3 rounded-2xl border border-line bg-card p-4 active:bg-teal-soft"
            >
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-soft text-[15px] font-bold text-teal-ink">
                {toArabicDigits(i + 1)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[16px] font-bold leading-snug text-ink">{s.title}</span>
                <span className="text-[13.5px] leading-6 text-muted">{s.summary}</span>
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
