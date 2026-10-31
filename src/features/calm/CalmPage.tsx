import { Link } from 'react-router-dom';

const GROUNDING = [
  '٥ أشياء أراها حولي',
  '٤ أشياء ألمسها',
  '٣ أشياء أسمعها',
  'شيئان أشمّهما',
  'شيء واحد أتذوّقه',
];

const card = 'flex flex-col gap-2 rounded-2xl border border-line bg-card p-4';

/** Always reachable. Help-line numbers are added per country only after each one is verified. */
export function CalmPage() {
  return (
    <div className="flex flex-col gap-4">
      <Link to="/" className="flex min-h-11 items-center text-[15px] font-semibold text-teal">
        ‹ الرئيسية
      </Link>
      <h1 className="text-[28px] font-bold leading-snug">أحتاج تهدئة</h1>
      <p className="text-[15px] leading-8 text-muted">
        أتمهّل. لا شيء مطلوب مني الآن سوى أن أتنفّس وأنتبه لما حولي.
      </p>

      <section aria-label="تنفّس هادئ" className={card}>
        <h2 className="text-base font-bold">تنفّس هادئ</h2>
        <p className="text-[15px] leading-8">
          شهيق بطيء عبر الأنف أربع ثوانٍ، ثم زفير أطول عبر الفم ست ثوانٍ.
        </p>
        <p className="text-sm leading-7 text-muted">أكرّر ذلك خمس مرات، وأترك كتفيّ ترتخيان مع كل مرة.</p>
      </section>

      <section className={card}>
        <h2 className="text-base font-bold">التأريض بالحواس</h2>
        <ol aria-label="تمرين التأريض" className="m-0 flex list-decimal flex-col gap-1 ps-5 text-[15px] leading-8">
          {GROUNDING.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <p className="rounded-2xl bg-teal-soft p-4 text-[15px] font-semibold leading-8 text-teal-ink">
        إن شعرتُ بأنني قد أكون في خطر، أتواصل الآن مع خدمات الطوارئ في بلدي أو مع شخص أثق به.
      </p>
    </div>
  );
}
