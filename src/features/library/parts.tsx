import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BackLink as SharedBackLink } from '../../components/BackLink';
import { Collapsible } from '../../components/Collapsible';
import { sourceById, type ReviewStatus } from '../../content/library';
import { toArabicDigits } from '../../lib/digits';

/** Goes back to where the reader came from; `to` is only the fallback. */
export const BackLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <SharedBackLink fallback={to}>{children}</SharedBackLink>
);

/** Shown on every text until the therapist has approved it. */
export function DraftBadge({ status }: { status: ReviewStatus }) {
  if (status !== 'draft') return null;
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-dashed border-teal bg-teal-soft px-3 py-1 text-[13px] font-semibold text-teal-ink">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />
      </svg>
      مسودة للمراجعة
    </span>
  );
}

/** The sources of a text, behind a button, written as plain selectable text with each source's honest limit. */
export function Sources({ ids }: { ids: string[] }) {
  const list = ids.map((id) => sourceById(id)).filter((s) => s !== undefined);
  return (
    <Collapsible title={`المصادر (${toArabicDigits(list.length)})`}>
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {list.map((s) => (
          <li key={s.id} className="flex min-w-0 flex-col gap-1">
            <span dir="ltr" lang="en" className="break-words text-start text-[14px] font-semibold leading-6 text-ink">
              {s.title}
            </span>
            <span className="text-[14px] leading-7 text-muted">{s.about}</span>
            {s.address && (
              <span dir="ltr" className="select-all break-all text-start text-[13px] leading-6 text-teal-ink">
                {s.address}
              </span>
            )}
            {s.limit && <span className="text-[13px] leading-7 text-muted">{`حدّ هذا المصدر: ${s.limit}`}</span>}
          </li>
        ))}
      </ul>
    </Collapsible>
  );
}

/** The closing lines of every library page: not a diagnosis, and the crisis page one tap away. */
export function Footer() {
  return (
    <footer className="flex flex-col gap-3 border-t border-line pt-4">
      <p className="m-0 text-[14px] leading-7 text-muted">
        هذا ليس تشخيصًا، وهو لا يغني عن مختص. وإن كنتُ في ضيق شديد أو في خطر فلا أنتظر.
      </p>
      <Link
        to="/calm"
        className="flex min-h-12 items-center justify-center rounded-full bg-teal-soft px-5 text-[15px] font-bold text-teal-ink"
      >
        أحتاج تهدئة
      </Link>
    </footer>
  );
}

export const card = 'flex flex-col gap-3 rounded-2xl border border-line bg-card p-4';
