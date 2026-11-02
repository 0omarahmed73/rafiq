import { useI18n } from '../../i18n/LanguageProvider';

const pad = (n: number) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));
const select =
  'min-h-12 w-full rounded-2xl border border-line bg-card px-3.5 text-base text-ink';

/**
 * Hour and minute selects in the app's own field style. The value is `HH:MM` (ASCII) or '' when no time is set;
 * the numbers are shown in Arabic-Indic digits. The row is left-to-right so the time reads hour then minute.
 */
export function ReminderTimePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t, digits } = useI18n();
  const [hour = '', minute = ''] = /^\d\d:\d\d$/.test(value) ? value.split(':') : [];

  return (
    <div role="group" aria-label={t({ ar: 'وقت التذكير اليومي', en: 'Daily reminder time' })} className="flex flex-col gap-1.5">
      <span aria-hidden="true" className="text-[13px] font-semibold text-muted">
        {t({ ar: 'وقت التذكير اليومي', en: 'Daily reminder time' })}
      </span>
      <div dir="ltr" className="flex items-end gap-2">
        <div dir="rtl" className="flex flex-1 flex-col gap-1">
          <label htmlFor="reminder-hour" className="text-xs font-semibold text-muted">
            {t({ ar: 'الساعة', en: 'Hour' })}
          </label>
          <select
            id="reminder-hour"
            value={hour}
            onChange={(e) => onChange(`${e.target.value}:${minute || '00'}`)}
            className={select}
          >
            <option value="">—</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {digits(h)}
              </option>
            ))}
          </select>
        </div>
        <span aria-hidden="true" className="pb-3 text-lg font-bold text-muted">
          :
        </span>
        <div dir="rtl" className="flex flex-1 flex-col gap-1">
          <label htmlFor="reminder-minute" className="text-xs font-semibold text-muted">
            {t({ ar: 'الدقيقة', en: 'Minute' })}
          </label>
          <select
            id="reminder-minute"
            value={minute}
            onChange={(e) => onChange(`${hour || '08'}:${e.target.value}`)}
            className={select}
          >
            <option value="">—</option>
            {MINUTES.map((m) => (
              <option key={m} value={m}>
                {digits(m)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
