import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

const icon = (paths: ReactNode) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="h-6 w-6 fill-none stroke-current"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {paths}
  </svg>
);

const tabs = [
  {
    to: '/',
    label: 'الرئيسية',
    end: true,
    // a house
    icon: icon(<path d="M3 11l9-8 9 8M5 10v10h14V10M10 20v-5h4v5" />),
  },
  {
    to: '/journey',
    label: 'الرحلة',
    end: false,
    // a winding path between two points
    icon: icon(
      <>
        <circle cx="6" cy="18" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <path d="M8.5 18H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6" />
      </>,
    ),
  },
  {
    to: '/tracker',
    label: 'التتبّع',
    end: false,
    // a line chart
    icon: icon(<path d="M3 3v18h18M7 15l4-5 3 3 5-7" />),
  },
  {
    to: '/therapist',
    label: 'لمعالجي',
    end: false,
    // a clipboard
    icon: icon(
      <>
        <path d="M9 4h6v3H9zM7 5.5H5.5V20h13V5.5H17" />
        <path d="M9 12h6M9 16h4" />
      </>,
    ),
  },
] as const;

export function TabBar() {
  return (
    <nav
      aria-label="التنقّل"
      className="app-tab-bar fixed inset-x-0 bottom-0 mx-auto flex max-w-xl border-t border-line bg-card px-2 print:hidden"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium ${
              isActive ? 'font-bold text-teal' : 'text-muted'
            }`
          }
        >
          {tab.icon}
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
