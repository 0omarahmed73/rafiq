import type { DayKey } from '../../lib/dates';
import { toArabicDigits } from '../../lib/digits';
import { shadeFor, type Shade } from '../../lib/shade';

const WEEKDAYS = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'];

const SHADE_CLASS: Record<Shade, string> = {
  light: 'bg-shade-light text-ink',
  mid: 'bg-shade-mid text-ink',
  strong: 'bg-shade-strong text-shade-strong-ink',
};

/**
 * Only days with a check-in are drawn; each is placed on the 7-column grid
 * by its weekday (the week starts on Saturday), so the columns stay aligned.
 * A day is a button: choosing it shows that day's check-ins.
 */
export function MonthCalendar({
  year,
  monthIndex,
  maxByDay,
  today,
  selected,
  onSelect,
}: {
  year: number;
  monthIndex: number;
  maxByDay: Map<DayKey, number>;
  today: DayKey;
  selected: DayKey | null;
  onSelect: (day: DayKey) => void;
}) {
  const first = new Date(year, monthIndex, 1);
  const offset = (first.getDay() + 1) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  const keyOf = (d: number): DayKey => `${year}-${pad(monthIndex + 1)}-${pad(d)}`;

  const logged: { day: number; key: DayKey; max: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const max = maxByDay.get(keyOf(d));
    if (max !== undefined) logged.push({ day: d, key: keyOf(d), max });
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {WEEKDAYS.map((w, i) => (
        <div
          key={w}
          aria-hidden="true"
          style={{ gridColumn: i + 1, gridRow: 1 }}
          className="pb-0.5 text-center text-xs font-semibold text-muted"
        >
          {w}
        </div>
      ))}
      <ul aria-label="أيام التسجيل" className="contents m-0 list-none p-0">
        {logged.map(({ day, key, max }) => {
          const slot = offset + day - 1;
          const isSelected = key === selected;
          return (
            <li
              key={key}
              style={{ gridColumn: (slot % 7) + 1, gridRow: Math.floor(slot / 7) + 2 }}
              className="flex"
            >
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(key)}
                className={`flex min-h-11 w-full items-center justify-center rounded-[10px] text-[13px] ${
                  SHADE_CLASS[shadeFor(max)]
                } ${key === today ? 'font-bold' : 'font-medium'} ${isSelected ? 'ring-2 ring-ink' : ''}`}
              >
                {toArabicDigits(day)}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
