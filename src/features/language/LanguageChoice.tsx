import type { ReactNode } from 'react';
import type { Lang } from '../../i18n';

/** Each language is named in its own script, so a person can find theirs whatever language the screen is in. */
const OPTIONS: { lang: Lang; name: string }[] = [
  { lang: 'en', name: 'English' },
  { lang: 'ar', name: 'العربية' },
];

export function LanguageChoice({
  name,
  legend,
  value,
  onChange,
}: {
  name: string;
  legend: ReactNode;
  value: Lang;
  onChange: (lang: Lang) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 text-base font-semibold">{legend}</legend>
      {OPTIONS.map((option) => (
        <label
          key={option.lang}
          className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-line bg-card px-4 text-base"
        >
          <input
            type="radio"
            name={name}
            value={option.lang}
            checked={value === option.lang}
            onChange={() => onChange(option.lang)}
            className="h-5 w-5 accent-teal"
          />
          <span lang={option.lang}>{option.name}</span>
        </label>
      ))}
    </fieldset>
  );
}
