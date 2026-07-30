import { useState, memo } from 'react'
import { useAuth } from '../context/AuthContext.jsx';

export function Icon({ children, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{children}</span>
}

const nav = [
  ['dashboard', 'Dashboard', 'dashboard'],
  ['assignment', 'Assessments', 'createExam'],
  ['group', 'Classes', 'classes'],
  ['database', 'Question Bank', 'questionBank'],
  ['map', 'Curriculum', 'syllabus'],
  ['analytics', 'Reports', 'reports'],
  ['monitoring', 'Monitoring', 'liveRoom'],
  ['shield', 'Security Dashboard', 'securityDashboard'],
]

function Sidebar({ page, setPage, closeSidebar }) {
  const { logout, user } = useAuth();
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'TE';
  return <aside className="h-full w-64 bg-surface-container-low border-r border-outline-variant flex flex-col py-md">
    <div className="px-md mb-lg flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-extrabold text-primary">Skillo</h1>
        <p className="text-xs font-semibold text-on-surface-variant">Teacher Portal</p>
      </div>
      <button onClick={closeSidebar} aria-label="Close sidebar" className="lg:hidden p-xs hover:bg-surface-container-high rounded-full"><Icon className="text-primary">close</Icon></button>
    </div>
    <nav className="flex-1 px-sm space-y-xs">
      {nav.map(([icon, label, key]) => {
        const active = page === key || (key === 'createExam' && ['scheduling'].includes(page)) || (key === 'reports' && ['answerEvaluation', 'evaluationDashboard', 'evaluationWorkspace', 'finalReview'].includes(page)) || (key === 'classes' && ['manageClass'].includes(page))
        return <button key={key} onClick={() => { setPage(key); closeSidebar() }} className={`w-full flex items-center gap-sm px-md py-sm rounded-lg text-left transition-colors ${active ? 'text-on-primary-fixed font-bold border-r-4 border-secondary-container bg-surface-container-high' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}>
          <Icon>{icon}</Icon><span className="text-sm">{label}</span>
        </button>
      })}
    </nav>
    <div className="mt-auto px-sm border-t border-outline-variant pt-md space-y-xs">
      <button onClick={() => { setPage('createExam'); closeSidebar() }} className="w-full mb-md py-sm px-md btn-primary text-sm">Create Exam</button>
      <button onClick={() => { setPage('profile'); closeSidebar() }} className="w-full flex items-center gap-sm px-md py-sm rounded-lg text-on-surface-variant hover:bg-surface-container-highest"><Icon>account_circle</Icon><span className="text-sm">Profile</span></button>
      <button onClick={() => { setPage('settings'); closeSidebar() }} className="w-full flex items-center gap-sm px-md py-sm rounded-lg text-on-surface-variant hover:bg-surface-container-highest"><Icon>settings</Icon><span className="text-sm">Settings</span></button>
      <button onClick={() => { logout(); window.location.href = '/'; }} className="w-full flex items-center gap-sm px-md py-sm rounded-lg text-error hover:bg-error-container"><Icon>logout</Icon><span className="text-sm">Logout</span></button>
    </div>
  </aside>
}

export default function TeacherShell({ children, page, setPage, title = 'Teacher Portal', search = false, searchValue = '', onSearchChange }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'TE';
  return <div className="min-h-screen bg-background text-on-surface overflow-x-hidden">
    <aside className="teacher-sidebar h-screen w-64 fixed left-0 top-0 z-50 hidden lg:flex flex-col">
      <Sidebar page={page} setPage={setPage} closeSidebar={() => setSidebarOpen(false)} />
    </aside>

    {sidebarOpen && (
      <div className="fixed inset-0 z-50 lg:hidden">
        <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
        <div className="absolute left-0 top-0 h-full">
          <Sidebar page={page} setPage={setPage} closeSidebar={() => setSidebarOpen(false)} />
        </div>
      </div>
    )}

    <header className="teacher-top flex justify-between items-center lg:w-[calc(100%_-_16rem)] lg:ml-64 px-md lg:px-lg h-16 sticky top-0 bg-surface border-b border-outline-variant z-40 backdrop-blur-md bg-white/95">
      <div className="flex items-center gap-md flex-1 min-w-0">
        <button onClick={() => setSidebarOpen(true)} aria-label="Open navigation menu" className="lg:hidden p-xs hover:bg-surface-container-high rounded-full transition-colors"><Icon className="text-primary">menu</Icon></button>
        <button onClick={() => setPage('dashboard')} className="hidden lg:inline-flex p-xs hover:bg-surface-container-high rounded-full transition-colors"><Icon className="text-primary">arrow_back</Icon></button>
        <h2 className="text-xl font-bold text-primary whitespace-nowrap truncate">{title}</h2>
        {search && <div className="relative w-96 hidden lg:block ml-md">
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</Icon>
          <input value={searchValue} onChange={e => onSearchChange?.(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-full text-sm focus-ring" placeholder="Search questions, topics, students..." />
        </div>}
      </div>
      <div className="flex items-center gap-md shrink-0">
        <button aria-label="Notifications" className="relative text-on-surface-variant hover:text-secondary"><Icon>notifications</Icon><span className="absolute top-0 right-0 w-2 h-2 bg-secondary-container rounded-full border-2 border-surface" /></button>
        <button aria-label="AI History" className="text-on-surface-variant hover:text-secondary"><Icon>history_edu</Icon></button>
        <div className="h-8 w-8 rounded-full overflow-hidden border border-outline-variant bg-primary-container text-white grid place-items-center text-sm font-bold">
          {user?.profile_photo_url ? (
            <img src={user.profile_photo_url} alt={user.name} className="w-full h-full object-cover" role="img" aria-label={user.name} />
          ) : (
            initials
          )}
        </div>
      </div>
    </header>
    <main className="teacher-main lg:ml-64 min-h-screen p-md lg:p-lg max-w-[1500px]">{children}</main>
  </div>
}

export const StatCard = memo(function StatCard({ label, value, hint, icon }) {
  return <div className="card p-md"><div className="flex items-start justify-between"><div><p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-xs">{label}</p><h3 className="text-3xl font-bold text-primary">{value}</h3>{hint && <p className="text-xs text-on-surface-variant mt-xs">{hint}</p>}</div>{icon && <Icon className="text-secondary-container text-3xl">{icon}</Icon>}</div></div>
})