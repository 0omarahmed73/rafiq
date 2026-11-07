import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackLink } from '../../components/BackLink';
import { Chip } from '../../components/Chip';
import { IntensitySlider } from '../../components/IntensitySlider';
import { emotionGroups } from '../../content';
import { useRepo } from '../../db/RepoContext';
import { type Bi } from '../../i18n';
import { useI18n } from '../../i18n/LanguageProvider';
import { saveCheckin, ValidationError } from './saveCheckin';

/** Stored as these values, so they stay the same in every language; only the labels are translated. */
const TAGS: { value: string; label: Bi }[] = [
  { value: 'النوم', label: { ar: 'النوم', en: 'Sleep' } },
  { value: 'العمل', label: { ar: 'العمل', en: 'Work' } },
  { value: 'العلاقات', label: { ar: 'العلاقات', en: 'Relationships' } },
  { value: 'الجسد', label: { ar: 'الجسد', en: 'Body' } },
  { value: 'الوحدة', label: { ar: 'الوحدة', en: 'Loneliness' } },
];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function CheckinPage() {
  const repo = useRepo();
  const navigate = useNavigate();
  const { t } = useI18n();
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
      <BackLink fallback="/">{t({ ar: 'الرجوع', en: 'Back' })}</BackLink>
      <h1 className="text-2xl font-bold">{t({ ar: 'ما الذي أشعر به الآن؟', en: 'What am I feeling right now?' })}</h1>
      <p className="text-sm leading-7 text-muted">
        {t({ ar: 'أختار كلمة أو أكثر. لا توجد مشاعر خاطئة.', en: 'I choose one or more words. There are no wrong feelings.' })}
      </p>

      {emotionGroups.map((group) => (
        <fieldset key={group.id} className="flex flex-col gap-2 border-0 p-0">
          <legend className="mb-2 text-[13px] font-semibold text-muted">{t(group.label)}</legend>
          <div className="flex flex-wrap gap-2">
            {group.words.map((w) => (
              <Chip
                key={w.id}
                label={t(w.label)}
                selected={emotions.includes(w.id)}
                onToggle={() => setEmotions(toggle(emotions, w.id))}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <IntensitySlider
        label={t({ ar: 'ما شدّة هذا الشعور؟', en: 'How strong is this feeling?' })}
        value={intensity}
        onChange={setIntensity}
      />

      <fieldset className="flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 text-[13px] font-semibold text-muted">
          {t({ ar: 'ما الذي حرّكه؟ (اختياري)', en: 'What set it off? (optional)' })}
        </legend>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <Chip
              key={tag.value}
              label={t(tag.label)}
              selected={tags.includes(tag.value)}
              onToggle={() => setTags(toggle(tags, tag.value))}
            />
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor="checkin-note" className="text-[13px] font-semibold text-muted">
          {t({ ar: 'ملاحظة قصيرة', en: 'Short note' })}
        </label>
        <textarea
          id="checkin-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t({ ar: 'ماذا حدث؟ وماذا أحتاج الآن؟', en: 'What happened? What do I need now?' })}
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
        {t({ ar: 'للنقاش في الجلسة القادمة', en: 'To discuss at the next session' })}
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
        {t({ ar: 'حفظ', en: 'Save' })}
      </button>
      <p className="text-center text-xs text-muted">{t({ ar: 'يُحفظ على جهازك فقط', en: 'Saved on this device only' })}</p>
    </div>
  );
}
