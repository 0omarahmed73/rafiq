import type { ReactNode } from 'react';

const icon = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const ROWS: { label: string; address: string; glyph: ReactNode }[] = [
  {
    label: 'جيت هب',
    address: 'github.com/0omarahmed73',
    glyph: (
      <svg {...icon}>
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="6" cy="18" r="2.5" />
        <circle cx="18" cy="9" r="2.5" />
        <path d="M6 8.5v7M18 11.5c0 3-3 3.5-7 3.5H8.5" />
      </svg>
    ),
  },
  {
    label: 'لينكد إن',
    address: 'linkedin.com/in/0omarahmed73',
    glyph: (
      <svg {...icon}>
        <rect x="3" y="7" width="18" height="13" rx="2.5" />
        <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 13h18" />
      </svg>
    ),
  },
  {
    label: 'الموقع الشخصي',
    address: 'omarasaeed.dev',
    glyph: (
      <svg {...icon}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z" />
      </svg>
    ),
  },
];

/** Static attribution. Plain text only: no links, images or requests, and nothing here is stored or exported. */
export function DeveloperInfo({ className }: { className: string }) {
  return (
    <section className={className} aria-labelledby="developer-title">
      <h2 id="developer-title" className="text-base font-bold">
        عن المطوّر
      </h2>
      <div className="flex items-center gap-3.5">
        <div
          aria-hidden="true"
          className="grid h-12 w-12 flex-none place-items-center rounded-full bg-teal text-base font-bold text-card"
        >
          <bdi dir="ltr">OS</bdi>
        </div>
        <div className="min-w-0">
          <p className="text-[17px] font-bold leading-snug">
            <bdi dir="ltr">Omar A. Saeed</bdi>
          </p>
          <p className="text-sm font-medium text-muted">
            <bdi dir="ltr">Full Stack Developer</bdi>
          </p>
        </div>
      </div>
      <ul aria-label="عناوين المطوّر" className="m-0 flex list-none flex-col p-0">
        {ROWS.map((row) => (
          <li key={row.address} className="flex min-h-12 items-center gap-3 border-t border-line py-2">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-teal-soft text-teal-ink"
            >
              {row.glyph}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-xs font-semibold text-muted">{row.label}</span>
              <span className="select-text break-all text-sm">
                <bdi dir="ltr">{row.address}</bdi>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
