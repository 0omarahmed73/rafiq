import type { ReactNode } from 'react';

export function Banner({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="rounded-xl bg-teal-soft px-4 py-3 text-sm leading-7 text-teal-ink">
      {children}
    </div>
  );
}
