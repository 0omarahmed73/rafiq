import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRepo } from '../../db/RepoContext';
import { countryLabel } from '../../content/countries';
import { EGYPT_SUPPORT, SUPPORT_DIRECTORY, supportForCountry } from '../../content/supportContacts';
import { toArabicDigits } from '../../lib/digits';

const GROUNDING = [
  '٥ أشياء أراها حولي',
  '٤ أشياء ألمسها',
  '٣ أشياء أسمعها',
  'شيئان أشمّهما',
  'شيء واحد أتذوّقه',
];

const card = 'flex flex-col gap-2 rounded-2xl border border-line bg-card p-4';

/** Always reachable. Contact numbers are bundled and appear only for their verified country. */
export function CalmPage() {
  const repo = useRepo();
  const [countryCode, setCountryCode] = useState<string | undefined>();
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    void repo.getSettings().then((settings) => {
      if (!alive) return;
      setCountryCode(settings.currentCountryCode);
      setSettingsLoaded(true);
    }).catch(() => alive && setSettingsLoaded(true));
    return () => {
      alive = false;
    };
  }, [repo]);

  const support = settingsLoaded ? supportForCountry(countryCode) : undefined;

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

      <section className={card} aria-labelledby="urgent-help-title">
        <h2 id="urgent-help-title" className="text-base font-bold">مساعدة عاجلة</h2>
        {!settingsLoaded ? (
          <p role="status" className="text-sm leading-7 text-muted">أحمّل معلومات الدعم المحفوظة على جهازي.</p>
        ) : support ? (
          <>
            <p className="text-sm leading-7 text-muted">
              {countryCode
                ? `أرقام الدعم المتحقَّق منها في ${EGYPT_SUPPORT.countryName}.`
                : 'لم أحدد بلدي؛ أعرض أرقام مصر كخيار احتياطي محفوظ على جهازي ويعمل دون إنترنت.'}
            </p>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {support.contacts.map((contact) => (
                <li key={contact.kind} className="flex flex-col gap-1 rounded-xl border border-line p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h3 className="text-sm font-bold">{contact.label}</h3>
                    <a
                      href={`tel:${contact.number}`}
                      className="min-h-11 rounded-lg bg-teal-soft px-3 py-1 text-lg font-bold text-teal-ink"
                      aria-label={`اتصال: ${contact.label} ${toArabicDigits(contact.number)}`}
                      dir="ltr"
                    >
                      {toArabicDigits(contact.number)}
                    </a>
                  </div>
                  <p className="text-sm leading-7 text-muted">{contact.note}</p>
                  <a
                    href={contact.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-11 self-start py-2 text-xs font-semibold text-teal-ink underline"
                  >
                    المصدر: {contact.source}
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-xs leading-6 text-muted">
              تحققتُ من هذه المعلومات في {toArabicDigits('1 نوفمبر 2026')}، وهي تخص مصر فقط.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm leading-7 text-muted">
              لم أتحقّق بعد من أرقام دعم في {countryLabel(countryCode ?? '')}. لا أعرض أرقام مصر على أنها تعمل خارجها.
              إذا كان الخطر مباشرًا، أتصل بخدمات الطوارئ المحلية أو بشخص أثق به.
            </p>
            <a
              href={SUPPORT_DIRECTORY.url}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center self-start rounded-full bg-teal-soft px-4 text-sm font-semibold text-teal-ink underline"
            >
              {SUPPORT_DIRECTORY.label}
            </a>
            <p className="text-xs leading-6 text-muted">
              يفتح هذا الدليل عند توفر الإنترنت. أرقام مصر الاحتياطية مخصّصة لمن يوجد في مصر.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
