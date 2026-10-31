import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/', label: 'الرئيسية', end: true },
  { to: '/journey', label: 'الرحلة', end: false },
  { to: '/tracker', label: 'التتبّع', end: false },
  { to: '/therapist', label: 'لمعالجي', end: false },
] as const;

export function TabBar() {
  return (
    <nav
      aria-label="التنقّل"
      className="fixed inset-x-0 bottom-0 flex border-t border-line bg-card px-2 print:hidden"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `flex min-h-14 flex-1 items-center justify-center text-xs font-medium ${
              isActive ? 'font-bold text-teal' : 'text-muted'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
