import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';

const links = [
  { to: '/student/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/student/exams', label: 'Exams', icon: 'assignment' },
  { to: '/student/analytics/performance', label: 'Performance', icon: 'leaderboard' },
  { to: '/student/settings', label: 'Settings', icon: 'settings' }
];

export default function StudentLayout({ title = 'Candidate Overview', children }) {
  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <aside className="hidden lg:flex h-screen w-64 fixed left-0 top-0 bg-surface-container-low flex-col py-base border-r border-outline-variant">
        <div className="px-gutter py-md">
          <h1 className="text-headline-md font-bold text-primary">Skillo</h1>
          <p className="text-label-md text-on-surface-variant">Academic Portal</p>
        </div>
        <nav className="flex-1 mt-md">
          <ul className="space-y-xs">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center px-gutter py-sm transition-colors ${
                      isActive
                        ? 'text-primary font-bold border-r-4 border-secondary bg-surface-container'
                        : 'text-on-surface-variant hover:bg-surface-container-highest'
                    }`
                  }
                >
                  <Icon name={link.icon} className="mr-sm" />
                  <span className="text-label-md">{link.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="px-gutter py-md mt-auto">
          <button className="w-full py-sm px-md bg-primary text-on-primary rounded-lg text-label-md hover:opacity-90">Support</button>
        </div>
      </aside>

      <main className="lg:ml-64 min-h-screen">
        <header className="flex justify-between items-center w-full px-gutter h-16 bg-surface border-b border-outline-variant sticky top-0 z-10">
          <h2 className="text-headline-sm font-bold text-primary">{title}</h2>
          <div className="flex items-center gap-md">
            <Icon name="notifications" className="text-on-surface-variant" />
            <Icon name="help_outline" className="text-on-surface-variant" />
            <div className="flex items-center gap-sm bg-surface-container px-sm py-xs rounded-full">
              <Icon name="account_circle" />
              <span className="text-label-md">Arjun Sharma</span>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
