import { useEffect, useState } from 'react';
import { useRepo } from '../../db/RepoContext';
import { countryOptions } from '../../content/countries';
import { useI18n } from '../../i18n/LanguageProvider';

export function CurrentCountryPicker() {
  const repo = useRepo();
  const { t } = useI18n();
  const options = countryOptions();
  const [countryCode, setCountryCode] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'saved' | 'error' | null>(null);

  useEffect(() => {
    let alive = true;
    void repo.getSettings().then((settings) => {
      if (!alive) return;
      setCountryCode(settings.currentCountryCode ?? '');
      setLoaded(true);
    }).catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [repo]);

  async function chooseCountry(code: string) {
    setSaving(true);
    setStatus(null);
    try {
      const settings = await repo.getSettings();
      await repo.saveSettings({ ...settings, currentCountryCode: code || undefined });
      setCountryCode(code);
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-4" aria-labelledby="country-title">
      <h2 id="country-title" className="text-base font-bold">{t({ ar: 'بلدي الحالي', en: 'My current country' })}</h2>
      <p className="text-sm leading-7 text-muted">
        {t({ ar: 'أختار البلد الذي أقيم فيه الآن. لا يستخدم رفيق موقعي؛ وإذا لم أحدد بلدي، تظهر معلومات مصر كخيار احتياطي.', en: 'I choose the country where I live now. Rafiq does not use my location. If I do not choose my country, Egypt\'s information is shown as a backup option.' })}
      </p>
      <label htmlFor="current-country" className="text-sm font-semibold">{t({ ar: 'بلد أرقام الدعم', en: 'Country for support numbers' })}</label>
      <select
        id="current-country"
        value={countryCode}
        disabled={!loaded || saving}
        onChange={(event) => void chooseCountry(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-line bg-card px-3 text-[15px] text-ink disabled:opacity-60"
      >
        <option value="">{t({ ar: 'لم أحدد بلدي بعد', en: 'I have not chosen my country yet' })}</option>
        {options.map(({ code, label }) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
      {status === 'saved' && <p role="status" className="text-sm text-teal-ink">{t({ ar: 'حُفظ بلدي على هذا الجهاز.', en: 'My country is saved on this device.' })}</p>}
      {status === 'error' && <p role="alert" className="text-sm text-warn-ink">{t({ ar: 'تعذّر حفظ اختيار البلد. أحاول مرة أخرى.', en: 'Could not save the country choice. I will try again.' })}</p>}
    </section>
  );
}
