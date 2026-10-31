import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Chip } from '../../components/Chip';
import { IntensitySlider } from '../../components/IntensitySlider';
import { emotionLabel } from '../../content';
import { useRepo } from '../../db/RepoContext';
import { saveCheckin } from './saveCheckin';

const QUICK_EMOTIONS = ['sadness', 'anxiety', 'exhaustion', 'shame', 'grateful', 'relaxed'];

export function QuickCheckin() {
  const repo = useRepo();
  const [emotion, setEmotion] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!emotion) return;
    await saveCheckin(repo, { emotions: [emotion], intensity });
    setEmotion(null);
    setIntensity(5);
    setSaved(true);
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">تسجيل سريع</h2>
        <Link to="/checkin" className="flex min-h-11 items-center text-sm font-semibold text-teal">
          تفصيل أكثر ‹
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_EMOTIONS.map((id) => (
          <Chip
            key={id}
            label={emotionLabel(id)}
            selected={emotion === id}
            onToggle={() => {
              setSaved(false);
              setEmotion(emotion === id ? null : id);
            }}
          />
        ))}
      </div>
      <IntensitySlider label="وما شدّة هذا الشعور؟" value={intensity} onChange={setIntensity} />
      {emotion && (
        <button
          type="button"
          onClick={save}
          className="min-h-12 rounded-full bg-teal px-6 text-[15px] font-bold text-card"
        >
          حفظ
        </button>
      )}
      {saved && (
        <p role="status" className="text-sm font-semibold text-teal-ink">
          تم الحفظ
        </p>
      )}
    </section>
  );
}
