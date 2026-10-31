import { useId } from 'react';
import { toArabicDigits } from '../lib/digits';

export function IntensitySlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-sm text-muted">
          {label}
        </label>
        <span className="text-lg font-bold text-teal-ink">{`${toArabicDigits(value)} / ${toArabicDigits(10)}`}</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={10}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-h-11 w-full accent-teal"
      />
    </div>
  );
}
