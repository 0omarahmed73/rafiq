import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

/**
 * «‹ …»: goes back to the page the reader came from. When there is nothing to go back to (the page was opened
 * directly, or after a reload) it goes to `fallback`, which is also the link's address.
 */
export function BackLink({ fallback, children }: { fallback: string; children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const cameFromInsideTheApp = location.key !== 'default';
  return (
    <Link
      to={fallback}
      onClick={(event) => {
        if (!cameFromInsideTheApp) return;
        event.preventDefault();
        navigate(-1);
      }}
      className="flex min-h-11 items-center text-[15px] font-semibold text-teal"
    >
      ‹ {children}
    </Link>
  );
}
