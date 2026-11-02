import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Chip } from '../../components/Chip';
import { IntensitySlider } from '../../components/IntensitySlider';
import { emotionLabel } from '../../content';
import { useRepo } from '../../db/RepoContext';
import { useI18n } from '../../i18n/LanguageProvider';
import { saveCheckin } from './saveCheckin';

const QUICK_EMOTIONS = ['sadness', 'anxiety', 'exhaustion', 'shame', 'grateful', 'relaxed'];

export function QuickCheckin() {
  const repo = useRepo();
  const { t } = useI18n();
  const [emotions, setEmotions] = useState<string[]>([]);
  const [intensity, setIntensity] = useState(5);
  const [saved, setSaved] = useState(false);

  const toggle = (id: string) => {
    setSaved(false);
    setEmotions((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  };

  async function save() {
    if (emotions.length === 0) return;
    await saveCheckin(repo, { emotions, intensity });
    setEmotions([]);
    setIntensity(5);
    setSaved(true);
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{t({ ar: 'تسجيل سريع', en: 'Quick check-in' })}</h2>
        <Link to="/checkin" className="flex min-h-11 items-center text-sm font-semibold text-teal">
          {t({ ar: 'تفصيل أكثر ‹', en: 'More detail ›' })}
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_EMOTIONS.map((id) => (
          <Chip
            key={id}
            label={emotionLabel(id)}
            selected={emotions.includes(id)}
            onToggle={() => toggle(id)}
          />
        ))}
      </div>
      <IntensitySlider
        label={t({ ar: 'وما شدّة هذا الشعور؟', en: 'How strong is this feeling?' })}
        value={intensity}
        onChange={setIntensity}
      />
      {emotions.length > 0 && (
        <button
          type="button"
          onClick={save}
          className="min-h-12 rounded-full bg-teal px-6 text-[15px] font-bold text-card"
        >
          {t({ ar: 'حفظ', en: 'Save' })}
        </button>
      )}
      {saved && (
        <p role="status" className="text-sm font-semibold text-teal-ink">
          {t({ ar: 'تم الحفظ', en: 'Saved' })}
        </p>
      )}
    </section>
  );
}
