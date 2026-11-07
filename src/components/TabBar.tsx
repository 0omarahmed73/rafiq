import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { type Bi } from '../i18n';
import { useI18n } from '../i18n/LanguageProvider';

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

const tabs: { to: string; label: Bi; end: boolean; icon: ReactNode }[] = [
  {
    to: '/',
    label: { ar: 'الرئيسية', en: 'Home' },
    end: true,
    // a house
    icon: icon(<path d="M3 11l9-8 9 8M5 10v10h14V10M10 20v-5h4v5" />),
  },
  {
    to: '/journey',
    label: { ar: 'الرحلة', en: 'Journey' },
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
    label: { ar: 'التتبّع', en: 'Tracker' },
    end: false,
    // a line chart
    icon: icon(<path d="M3 3v18h18M7 15l4-5 3 3 5-7" />),
  },
  {
    to: '/therapist',
    label: { ar: 'لمعالجي', en: 'My therapist' },
    end: false,
    // a clipboard
    icon: icon(
      <>
        <path d="M9 4h6v3H9zM7 5.5H5.5V20h13V5.5H17" />
        <path d="M9 12h6M9 16h4" />
      </>,
    ),
  },
  {
    to: '/library',
    label: { ar: 'مكتبتي', en: 'My library' },
    end: false,
    // an open book
    icon: icon(<path d="M12 7c-1.5-1.2-3.5-2-7-2v13c3.5 0 5.5.8 7 2 1.5-1.2 3.5-2 7-2V5c-3.5 0-5.5.8-7 2zM12 7v13" />),
  },
];

export function TabBar() {
  const { t } = useI18n();
  return (
    <nav
      aria-label={t({ ar: 'التنقّل', en: 'Navigation' })}
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
          {t(tab.label)}
        </NavLink>
      ))}
    </nav>
  );
}
