import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/admin/dashboard' },
  { key: 'analytics', label: 'Analytics', icon: 'monitoring', path: '/admin/analytics' },
  { key: 'institution', label: 'Institutions', icon: 'account_balance', path: '/admin/institution' },
  { key: 'department', label: 'Departments', icon: 'domain', path: '/admin/department' },
  { key: 'batch', label: 'Batch / Classes', icon: 'class', path: '/admin/batch' },
  { key: 'student', label: 'Students', icon: 'group', path: '/admin/student' },
  { key: 'teacher', label: 'Teachers', icon: 'school', path: '/admin/teacher' },
  { key: 'policies', label: 'Exam Policies', icon: 'policy', path: '/admin/policies' },
  { key: 'subscription', label: 'Subscription', icon: 'payments', path: '/admin/subscription' },
];

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export function AdminLayout({ title, subtitle, searchPlaceholder = 'Global system search...', children, actionLabel = 'Create New' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const activePage = navItems.find(item => location.pathname.startsWith(item.path))?.key || 'dashboard';

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-outline-variant bg-surface">
        <div className="p-md">
          <h1 className="text-2xl font-extrabold tracking-tight text-primary">Sentinel Admin</h1>
          <p className="text-sm font-medium text-on-surface-variant">Enterprise Security</p>
        </div>
        <nav className="custom-scrollbar mt-md flex-1 space-y-1 overflow-y-auto px-sm">
          {navItems.map((item) => {
            const active = item.key === activePage;
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className={`flex w-full items-center gap-sm rounded px-md py-sm text-left transition-all active:scale-95 ${active ? 'border-r-4 border-secondary bg-primary-container text-white' : 'text-on-surface-variant hover:bg-surface-variant'}`}
              >
                <Icon name={item.icon} />
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-outline-variant p-md">
          <button className="w-full rounded-lg bg-secondary px-md py-sm text-sm font-bold text-white transition-all hover:bg-secondary-container hover:text-black active:scale-95">
            Generate Report
          </button>
          <div className="mt-md space-y-1">
            <button className="flex w-full items-center gap-sm px-md py-xs text-sm font-medium text-on-surface-variant hover:text-on-surface"><Icon name="help" /> Help Center</button>
            <button className="flex w-full items-center gap-sm px-md py-xs text-sm font-medium text-on-surface-variant hover:text-on-surface"><Icon name="logout" /> Logout</button>
          </div>
        </div>
      </aside>

      <div className="ml-64 min-h-screen">
        <header className="fixed right-0 top-0 z-40 flex h-16 w-[calc(100%-16rem)] items-center justify-between border-b border-outline-variant bg-surface-bright px-md shadow-sm">
          <div className="flex items-center gap-md">
            <div className="relative rounded-lg focus-within:ring-2 focus-within:ring-secondary">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input className="w-72 rounded-lg border-none bg-surface-container py-2 pl-10 pr-4 text-sm outline-none focus:ring-0" placeholder={searchPlaceholder} />
            </div>
            <nav className="hidden gap-md md:flex">
              <a className="text-sm font-semibold text-on-surface-variant hover:text-on-surface" href="#">Directives</a>
              <a className="text-sm font-semibold text-on-surface-variant hover:text-on-surface" href="#">Audit Log</a>
            </nav>
          </div>
          <div className="flex items-center gap-md">
            <button className="rounded-lg bg-primary px-md py-2 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95">{actionLabel}</button>
            <button className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-highest"><Icon name="notifications" /></button>
            <button className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-highest"><Icon name="apps" /></button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-primary-container text-sm font-bold text-white">AR</div>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-lg pb-12 pt-24">
          {(title || subtitle) && (
            <div className="mb-lg flex items-end justify-between gap-md">
              <div>
                <h2 className="text-4xl font-extrabold leading-tight text-primary">{title}</h2>
                {subtitle && <p className="mt-xs text-lg text-on-surface-variant">{subtitle}</p>}
              </div>
              <div className="hidden items-center gap-xs rounded-lg border border-outline-variant bg-white px-md py-2 text-sm font-semibold md:flex">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
                System: Operational
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

export function StatCard({ label, value, icon, tone = 'primary', sub }) {
  return (
    <div className="bento-card flex min-h-36 flex-col justify-between p-md">
      <div>
        <div className="mb-sm flex items-center justify-between">
          <span className="text-sm font-semibold text-on-surface-variant">{label}</span>
          <Icon name={icon} className={tone === 'secondary' ? 'text-secondary' : tone === 'error' ? 'text-error' : 'text-primary'} />
        </div>
        <div className="text-3xl font-extrabold text-primary">{value}</div>
      </div>
      {sub && <div className={`mt-md flex items-center text-xs font-bold ${tone === 'error' ? 'text-error' : tone === 'secondary' ? 'text-secondary' : 'text-emerald-600'}`}>{sub}</div>}
    </div>
  );
}

export function DataTable({ columns, rows, renderRow }) {
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low">
              {columns.map((c) => <th key={c} className="px-md py-md text-xs font-extrabold uppercase tracking-wider text-on-surface-variant">{c}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">{rows.map(renderRow)}</tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-outline-variant bg-surface-container-low px-md py-sm">
        <p className="text-xs text-on-surface-variant">Showing {rows.length} active records</p>
        <div className="flex gap-xs"><button className="rounded bg-primary px-sm py-xs text-xs text-white">1</button><button className="rounded px-sm py-xs text-xs hover:bg-surface-variant">2</button><button className="rounded px-sm py-xs text-xs hover:bg-surface-variant">3</button></div>
      </div>
    </div>
  );
}

export { Icon };
