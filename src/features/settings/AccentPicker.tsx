import { useEffect, useState } from 'react';
import { useRepo } from '../../db/RepoContext';
import { ACCENTS, ACCENT_IDS, applyAccent, normalizeAccent, type AccentId } from '../../lib/accents';
import { useI18n } from '../../i18n/LanguageProvider';

/** Six swatches; the choice is applied at once and saved in the settings. */
export function AccentPicker() {
  const repo = useRepo();
  const { t } = useI18n();
  const [accent, setAccent] = useState<AccentId>('teal');

  useEffect(() => {
    let alive = true;
    void repo.getSettings().then((s) => alive && setAccent(normalizeAccent(s.accent)));
    return () => {
      alive = false;
    };
  }, [repo]);

  async function choose(id: AccentId) {
    setAccent(id);
    applyAccent(id);
    const settings = await repo.getSettings();
    await repo.saveSettings({ ...settings, accent: id });
  }

  return (
    <fieldset role="radiogroup" aria-label={t({ ar: 'اللون المفضّل', en: 'Favourite colour' })} className="m-0 flex flex-wrap gap-2 border-0 p-0">
      {ACCENT_IDS.map((id) => {
        const selected = accent === id;
        return (
          <label
            key={id}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-3.5 text-sm font-semibold ${
              selected ? 'border-teal bg-teal-soft text-teal-ink' : 'border-line bg-card text-ink'
            }`}
          >
            <input
              type="radio"
              name="accent"
              aria-label={t(ACCENTS[id].label)}
              checked={selected}
              onChange={() => void choose(id)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className="inline-block h-5 w-5 rounded-full border border-line"
              style={{ background: ACCENTS[id].light.teal }}
            />
            {t(ACCENTS[id].label)}
          </label>
        );
      })}
    </fieldset>
  );
}
