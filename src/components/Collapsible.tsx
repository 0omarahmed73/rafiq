import { useId, useState, type ReactNode } from 'react';

/** A calm disclosure: the height and the arrow animate, and nothing moves for people who ask for reduced motion. */
export function Collapsible({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <button
        type="button"
        id={`${id}-toggle`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-start text-[15px] font-bold text-ink"
      >
        <span className="min-w-0 flex-1">{title}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className={`h-5 w-5 shrink-0 fill-none stroke-teal stroke-2 transition-transform duration-300 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div
        className={`grid transition-[grid-template-rows,visibility] duration-300 ease-out motion-reduce:transition-none ${
          open ? 'visible grid-rows-[1fr]' : 'invisible grid-rows-[0fr]'
        }`}
      >
        <div id={id} role="region" aria-labelledby={`${id}-toggle`} aria-hidden={!open} className="min-h-0 overflow-hidden">
          <div
            className={`border-t border-line px-4 py-4 transition-opacity duration-300 motion-reduce:transition-none ${
              open ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
