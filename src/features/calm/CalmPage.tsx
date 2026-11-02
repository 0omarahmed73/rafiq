import { useEffect, useState } from 'react';
import { BackLink } from '../../components/BackLink';
import { useRepo } from '../../db/RepoContext';
import { countryLabel } from '../../content/countries';
import { EGYPT_SUPPORT, SUPPORT_DIRECTORY, supportForCountry } from '../../content/supportContacts';
import { type Bi } from '../../i18n';
import { useI18n } from '../../i18n/LanguageProvider';

const GROUNDING: Bi[] = [
  { ar: '٥ أشياء أراها حولي', en: '5 things I can see around me' },
  { ar: '٤ أشياء ألمسها', en: '4 things I can touch' },
  { ar: '٣ أشياء أسمعها', en: '3 things I can hear' },
  { ar: 'شيئان أشمّهما', en: 'two things I can smell' },
  { ar: 'شيء واحد أتذوّقه', en: 'one thing I can taste' },
];

const card = 'flex flex-col gap-2 rounded-2xl border border-line bg-card p-4';

/** Always reachable. Contact numbers are bundled and appear only for their verified country. */
export function CalmPage() {
  const repo = useRepo();
  const { t, digits } = useI18n();
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
      <BackLink fallback="/">{t({ ar: 'الرجوع', en: 'Back' })}</BackLink>
      <h1 className="text-[28px] font-bold leading-snug">{t({ ar: 'أحتاج تهدئة', en: 'I need calm' })}</h1>
      <p className="text-[15px] leading-8 text-muted">
        {t({
          ar: 'أتمهّل. لا شيء مطلوب مني الآن سوى أن أتنفّس وأنتبه لما حولي.',
          en: 'I slow down. Right now, nothing is required of me except to breathe and notice what is around me.',
        })}
      </p>

      <section aria-label={t({ ar: 'تنفّس هادئ', en: 'Slow breathing' })} className={card}>
        <h2 className="text-base font-bold">{t({ ar: 'تنفّس هادئ', en: 'Slow breathing' })}</h2>
        <p className="text-[15px] leading-8">
          {t({
            ar: 'شهيق بطيء عبر الأنف أربع ثوانٍ، ثم زفير أطول عبر الفم ست ثوانٍ.',
            en: 'Breathe in slowly through your nose for four seconds, then breathe out for longer, through your mouth, for six seconds.',
          })}
        </p>
        <p className="text-sm leading-7 text-muted">
          {t({
            ar: 'أكرّر ذلك خمس مرات، وأترك كتفيّ ترتخيان مع كل مرة.',
            en: 'I repeat this five times, and let my shoulders relax a little each time.',
          })}
        </p>
      </section>

      <section className={card}>
        <h2 className="text-base font-bold">{t({ ar: 'التأريض بالحواس', en: 'Grounding with my senses' })}</h2>
        <ol
          aria-label={t({ ar: 'تمرين التأريض', en: 'Grounding exercise' })}
          className="m-0 flex list-decimal flex-col gap-1 ps-5 text-[15px] leading-8"
        >
          {GROUNDING.map((item) => (
            <li key={item.ar}>{t(item)}</li>
          ))}
        </ol>
      </section>

      <p className="rounded-2xl bg-teal-soft p-4 text-[15px] font-semibold leading-8 text-teal-ink">
        {t({
          ar: 'إن شعرتُ بأنني قد أكون في خطر، أتواصل الآن مع خدمات الطوارئ في بلدي أو مع شخص أثق به.',
          en: 'If I feel I might be in danger, I contact the emergency services in my country, or someone I trust, now.',
        })}
      </p>

      <section className={card} aria-labelledby="urgent-help-title">
        <h2 id="urgent-help-title" className="text-base font-bold">
          {t({ ar: 'مساعدة عاجلة', en: 'Urgent help' })}
        </h2>
        {!settingsLoaded ? (
          <p role="status" className="text-sm leading-7 text-muted">
            {t({ ar: 'أحمّل معلومات الدعم المحفوظة على جهازي.', en: 'I am loading the support information saved on my device.' })}
          </p>
        ) : support ? (
          <>
            <p className="text-sm leading-7 text-muted">
              {countryCode
                ? t(
                    { ar: 'أرقام الدعم المتحقَّق منها في {country}.', en: 'Support numbers checked for {country}.' },
                    { country: t(EGYPT_SUPPORT.countryName) },
                  )
                : t({
                    ar: 'لم أحدد بلدي؛ أعرض أرقام مصر كخيار احتياطي محفوظ على جهازي ويعمل دون إنترنت.',
                    en: 'I have not chosen my country, so I show Egypt\'s numbers as a backup option saved on my device that works without internet.',
                  })}
            </p>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {support.contacts.map((contact) => (
                <li key={contact.kind} className="flex flex-col gap-1 rounded-xl border border-line p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h3 className="text-sm font-bold">{t(contact.label)}</h3>
                    <a
                      href={`tel:${contact.number}`}
                      className="min-h-11 rounded-lg bg-teal-soft px-3 py-1 text-lg font-bold text-teal-ink"
                      aria-label={t(
                        { ar: 'اتصال: {label} {number}', en: 'Call: {label} {number}' },
                        { label: t(contact.label), number: digits(contact.number) },
                      )}
                      dir="ltr"
                    >
                      {digits(contact.number)}
                    </a>
                  </div>
                  <p className="text-sm leading-7 text-muted">{t(contact.note)}</p>
                  <a
                    href={contact.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-11 self-start py-2 text-xs font-semibold text-teal-ink underline"
                  >
                    {t({ ar: 'المصدر: ', en: 'Source: ' })}
                    {t(contact.source)}
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-xs leading-6 text-muted">
              {t({
                ar: 'تحققتُ من هذه المعلومات في ١ نوفمبر ٢٠٢٦، وهي تخص مصر فقط.',
                en: 'I checked this information on 1 November 2026. It applies to Egypt only.',
              })}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm leading-7 text-muted">
              {t({
                ar: 'لم أتحقّق بعد من أرقام دعم في {country}. لا أعرض أرقام مصر على أنها تعمل خارجها. إذا كان الخطر مباشرًا، أتصل بخدمات الطوارئ المحلية أو بشخص أثق به.',
                en: 'I have not yet checked support numbers in {country}. I do not show Egypt\'s numbers as if they work outside Egypt. If the danger is immediate, I call the local emergency services or someone I trust.',
              }, { country: countryLabel(countryCode ?? '') })}
            </p>
            <a
              href={SUPPORT_DIRECTORY.url}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center self-start rounded-full bg-teal-soft px-4 text-sm font-semibold text-teal-ink underline"
            >
              {t(SUPPORT_DIRECTORY.label)}
            </a>
            <p className="text-xs leading-6 text-muted">
              {t({
                ar: 'يفتح هذا الدليل عند توفر الإنترنت. أرقام مصر الاحتياطية مخصّصة لمن يوجد في مصر.',
                en: 'This directory opens when the internet is available. Egypt\'s backup numbers are for people who are in Egypt.',
              })}
            </p>
          </>
        )}
      </section>
    </div>
  );
}
