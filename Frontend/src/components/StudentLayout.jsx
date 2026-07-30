import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import NotificationPanel from './NotificationPanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { authService } from '../services/authService.js';

const links = [
  { to: '/student/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/student/profile', label: 'My Profile', icon: 'person' },
  { to: '/student/exams', label: 'Exams', icon: 'assignment' },
  { to: '/student/classes', label: 'Classes', icon: 'groups' },
  { to: '/student/analytics/performance', label: 'Performance', icon: 'leaderboard' },
  { to: '/student/settings', label: 'Settings', icon: 'settings' }
];

export default function StudentLayout({ title = 'Candidate Overview', children }) {
  const { user, logout } = useAuth();
  const [completion, setCompletion] = useState(null);
  const displayName = user?.name || 'Student';
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'ST';

  useEffect(() => {
    authService.getProfileCompletion()
      .then(setCompletion)
      .catch(() => setCompletion(null));
  }, []);

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <aside className="hidden lg:flex h-screen w-64 fixed left-0 top-0 bg-surface-container-low flex-col py-base border-r border-outline-variant">
        <div className="px-gutter py-md">
          <h1 className="text-headline-md font-bold text-primary">Skillo</h1>
          <p className="text-label-md text-on-surface-variant">Academic Portal</p>
        </div>
        {completion && (
          <Link to="/student/profile" className="mx-gutter mb-md p-sm rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors block">
            <div className="flex items-center justify-between mb-xs">
              <span className="text-label-xs text-on-surface-variant font-bold">Profile</span>
              <span className={`text-label-xs font-bold ${completion.is_complete ? 'text-tertiary' : 'text-secondary'}`}>
                {completion.percentage}%
              </span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${completion.is_complete ? 'bg-tertiary' : 'bg-secondary'}`}
                style={{ width: `${completion.percentage}%` }}
              />
            </div>
          </Link>
        )}
        <nav className="flex-1 mt-md">
          <ul className="space-y-xs">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  aria-label={link.label}
                  className={({ isActive }) =>
                    `flex items-center px-gutter py-sm transition-colors focus-visible:outline-2 focus-visible:outline-secondary focus-visible:outline-offset-[-2px] ${
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
        <div className="px-gutter py-md mt-auto space-y-xs">
          <button
            onClick={() => { logout(); window.location.href = '/'; }}
            aria-label="Logout"
            className="w-full py-sm px-md bg-error-container text-error rounded-lg text-label-md hover:opacity-90 focus-visible:outline-2 focus-visible:outline-error flex items-center justify-center gap-xs"
          >
            <Icon name="logout" /> Logout
          </button>
        </div>
      </aside>

      <main className="lg:ml-64 min-h-screen">
        <header className="flex justify-between items-center w-full px-gutter h-16 bg-surface border-b border-outline-variant sticky top-0 z-10">
          <h2 className="text-headline-sm font-bold text-primary">{title}</h2>
          <div className="flex items-center gap-md">
            <div className="relative">
              <NotificationPanel />
            </div>
            <button aria-label="Help" className="rounded-full p-1 text-on-surface-variant hover:bg-surface-container-highest transition-colors">
              <Icon name="help_outline" ariaHidden={false} />
            </button>
            <div className="flex items-center gap-sm bg-surface-container px-sm py-xs rounded-full">
              <Icon name="account_circle" />
              <span className="text-label-md">{displayName}</span>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
