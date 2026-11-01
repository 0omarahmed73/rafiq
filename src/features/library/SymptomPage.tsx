import { Link, Navigate, useParams } from 'react-router-dom';
import { symptomById } from '../../content/library';
import { BackLink, DraftBadge, Footer, Sources, card } from './parts';

/** One symptom: how it can feel, the need behind it, sentences to choose from, and a tool to open. */
export function SymptomPage() {
  const { id = '' } = useParams();
  const s = symptomById(id);
  if (!s) return <Navigate to="/library/symptoms" replace />;

  return (
    <article className="flex min-w-0 flex-col gap-5">
      <BackLink to="/library/symptoms">الأعراض</BackLink>

      {s.safety && (
        <section
          aria-label="مساعدة فورية"
          role="region"
          className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-teal bg-teal-soft p-4"
        >
          <p className="m-0 text-[16px] font-semibold leading-8 text-teal-ink">
            إن كنتُ أفكّر في إيذاء نفسي الآن، أحتاج إلى مساعدة فورية قبل أن أقرأ أي شيء.
          </p>
          <Link to="/calm" className="flex min-h-12 items-center justify-center rounded-full bg-teal px-5 text-[15px] font-bold text-card">
            أحتاج مساعدة الآن
          </Link>
        </section>
      )}

      <header className="flex flex-col gap-3">
        <h1 className="text-[26px] font-bold leading-snug">{s.title}</h1>
        <DraftBadge status={s.status} />
        <p className="m-0 text-[15px] leading-8 text-muted">{s.summary}</p>
      </header>

      <section aria-labelledby="feels" className={card}>
        <h2 id="feels" className="text-[17px] font-bold text-teal-ink">
          كيف قد أشعر به
        </h2>
        <p className="m-0 text-[16px] leading-8 text-ink">{s.feels}</p>
      </section>

      <section aria-labelledby="need" className="flex flex-col gap-3 rounded-2xl bg-teal-soft p-4">
        <h2 id="need" className="text-[17px] font-bold text-teal-ink">
          ما الحاجة خلفه
        </h2>
        <p className="m-0 text-[16px] leading-8 text-teal-ink">{s.need}</p>
      </section>

      <section aria-labelledby="sentences" className="flex flex-col gap-3">
        <h2 id="sentences" className="text-[17px] font-bold text-teal-ink">
          جمل أستطيع أن أقولها لنفسي
        </h2>
        <p className="m-0 text-[14px] leading-7 text-muted">أختار ما يناسبني أو لا أختار شيئًا. لا شيء منها مطلوب.</p>
        <ul aria-label="جمل أقولها لنفسي" className="m-0 flex list-none flex-col gap-2.5 p-0">
          {s.selfSentences.map((text) => (
            <li key={text} className="rounded-xl border border-line border-s-4 border-s-teal bg-card p-4 text-[16px] leading-8 text-ink">
              {text}
            </li>
          ))}
        </ul>
      </section>

      {s.note && <p className="m-0 rounded-2xl border border-dashed border-line bg-card p-4 text-[14px] leading-7 text-muted">{s.note}</p>}

      <Link
        to={s.tool.to}
        className="flex min-h-14 items-center justify-center rounded-full bg-teal px-6 text-[16px] font-bold text-card"
      >
        {s.tool.label}
      </Link>

      <Sources ids={s.sourceIds} />
      <Footer />
    </article>
  );
}
