import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chip } from '../../components/Chip';
import { IntensitySlider } from '../../components/IntensitySlider';
import { emotionGroups } from '../../content';
import { useRepo } from '../../db/RepoContext';
import { saveCheckin, ValidationError } from './saveCheckin';

const TAGS = ['النوم', 'العمل', 'العلاقات', 'الجسد', 'الوحدة'];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function CheckinPage() {
  const repo = useRepo();
  const navigate = useNavigate();
  const [emotions, setEmotions] = useState<string[]>([]);
  const [intensity, setIntensity] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [forNextSession, setForNextSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    try {
      await saveCheckin(repo, { emotions, intensity, tags, note, forNextSession });
      navigate('/');
    } catch (e) {
      if (e instanceof ValidationError) setError(e.message);
      else throw e;
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      <h1 className="text-2xl font-bold">كيف تشعر الآن؟</h1>
      <p className="text-sm leading-7 text-muted">اختر كلمة أو أكثر. لا توجد مشاعر خاطئة.</p>

      {emotionGroups.map((group) => (
        <fieldset key={group.id} className="flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-[13px] font-semibold text-muted">{group.label}</legend>
          <div className="flex flex-wrap gap-2">
            {group.words.map((w) => (
              <Chip
                key={w.id}
                label={w.label}
                selected={emotions.includes(w.id)}
                onToggle={() => setEmotions(toggle(emotions, w.id))}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <IntensitySlider label="ما شدّة هذا الشعور؟" value={intensity} onChange={setIntensity} />

      <fieldset className="flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 text-[13px] font-semibold text-muted">ما الذي حرّكه؟ (اختياري)</legend>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((t) => (
            <Chip key={t} label={t} selected={tags.includes(t)} onToggle={() => setTags(toggle(tags, t))} />
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor="checkin-note" className="text-[13px] font-semibold text-muted">
          ملاحظة قصيرة
        </label>
        <textarea
          id="checkin-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="ماذا حدث؟ وماذا تحتاج الآن؟"
          className="rounded-2xl border border-line bg-card p-3 text-base leading-7"
        />
      </div>

      <label className="flex min-h-11 items-center gap-2.5 text-[15px] font-medium">
        <input
          type="checkbox"
          checked={forNextSession}
          onChange={(e) => setForNextSession(e.target.checked)}
          className="h-[22px] w-[22px] accent-teal"
        />
        للنقاش في الجلسة القادمة
      </label>

      {error && (
        <p role="alert" className="text-sm font-semibold text-teal-ink">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        className="min-h-12 rounded-full bg-teal px-6 text-base font-bold text-card"
      >
        حفظ
      </button>
      <p className="text-center text-xs text-muted">يُحفظ على جهازك فقط</p>
    </div>
  );
}
