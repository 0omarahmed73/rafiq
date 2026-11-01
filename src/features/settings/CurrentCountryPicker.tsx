import { useEffect, useState } from 'react';
import { useRepo } from '../../db/RepoContext';
import { countryOptions } from '../../content/countries';

const options = countryOptions();

export function CurrentCountryPicker() {
  const repo = useRepo();
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
      <h2 id="country-title" className="text-base font-bold">بلدي الحالي</h2>
      <p className="text-sm leading-7 text-muted">
        أختار البلد الذي أقيم فيه الآن. لا يستخدم رفيق موقعي؛ وإذا لم أحدد بلدي، تظهر معلومات مصر كخيار احتياطي.
      </p>
      <label htmlFor="current-country" className="text-sm font-semibold">بلد أرقام الدعم</label>
      <select
        id="current-country"
        value={countryCode}
        disabled={!loaded || saving}
        onChange={(event) => void chooseCountry(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-line bg-card px-3 text-[15px] text-ink disabled:opacity-60"
      >
        <option value="">لم أحدد بلدي بعد</option>
        {options.map(({ code, label }) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>
      {status === 'saved' && <p role="status" className="text-sm text-teal-ink">حُفظ بلدي على هذا الجهاز.</p>}
      {status === 'error' && <p role="alert" className="text-sm text-warn-ink">تعذّر حفظ اختيار البلد. أحاول مرة أخرى.</p>}
    </section>
  );
}
