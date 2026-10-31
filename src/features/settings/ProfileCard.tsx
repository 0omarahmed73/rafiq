import { useEffect, useState } from 'react';
import { useRepo } from '../../db/RepoContext';

const FIELDS = [
  { key: 'displayName', label: 'اسمي', type: 'text' },
  { key: 'therapistName', label: 'اسم معالجي', type: 'text' },
  { key: 'trustedName', label: 'شخص أثق به', type: 'text' },
  { key: 'trustedPhone', label: 'رقم هاتفه', type: 'tel' },
] as const;

type Key = (typeof FIELDS)[number]['key'];
type Values = Record<Key, string>;
const EMPTY: Values = { displayName: '', therapistName: '', trustedName: '', trustedPhone: '' };

const input = 'min-h-12 rounded-2xl border border-line bg-card px-3.5 text-base text-ink';

export function ProfileCard() {
  const repo = useRepo();
  const [values, setValues] = useState<Values>(EMPTY);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    void repo.getSettings().then((s) => {
      if (!alive) return;
      setValues({
        displayName: s.displayName ?? '',
        therapistName: s.therapistName ?? '',
        trustedName: s.trustedName ?? '',
        trustedPhone: s.trustedPhone ?? '',
      });
    });
    return () => {
      alive = false;
    };
  }, [repo]);

  async function save() {
    const { updatedAt: _u, ...current } = await repo.getSettings();
    const next = { ...current } as Record<string, unknown>;
    for (const { key } of FIELDS) {
      const v = values[key].trim();
      if (v) next[key] = v;
      else delete next[key];
    }
    await repo.saveSettings(next as typeof current);
    setSaved(true);
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4" aria-labelledby="profile-title">
      <h2 id="profile-title" className="text-base font-bold">
        معلوماتي
      </h2>
      <p className="text-sm leading-7 text-muted">
        تبقى على جهازي. اسمي واسم معالجي يظهران في أعلى الملخّص الذي أعطيه لمعالجي إن كتبتهما.
      </p>
      {FIELDS.map((f) => (
        <label key={f.key} className="flex flex-col gap-1.5 text-[13px] font-semibold text-muted">
          {f.label}
          <input
            type={f.type}
            value={values[f.key]}
            onChange={(e) => {
              setSaved(false);
              setValues((v) => ({ ...v, [f.key]: e.target.value }));
            }}
            className={input}
          />
        </label>
      ))}
      <button
        type="button"
        onClick={() => void save()}
        className="min-h-12 rounded-full bg-teal px-6 text-[15px] font-bold text-card"
      >
        حفظ معلوماتي
      </button>
      {saved && (
        <p role="status" className="text-sm font-semibold text-teal-ink">
          تم الحفظ
        </p>
      )}
    </section>
  );
}
