import { useState, useEffect, useCallback } from 'react'
import TeacherShell, { Icon, StatCard } from '../../../components/TeacherShell.jsx'
import { examService } from '../../../services/examService.js'

export default function TeacherDashboard({ page, setPage }) {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchExams = useCallback(async () => {
    setLoading(true)
    try {
      const data = await examService.list()
      setExams(data)
    } catch {
      setExams([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchExams() }, [fetchExams])

  const scheduled = exams.filter(e => e.status === 'scheduled')
  const active = exams.filter(e => e.status === 'active')
  const today = exams.filter(e => new Date(e.start_time).toDateString() === new Date().toDateString())
  const upcoming = exams.filter(e => e.status !== 'draft' && new Date(e.start_time) > new Date())

  return (
    <TeacherShell page={page} setPage={setPage} title="Teacher Dashboard">
      <section className="mb-lg">
        <span className="pill bg-secondary-fixed text-secondary">Academic Control Room</span>
        <h1 className="text-4xl font-extrabold text-primary mt-sm">Good morning, Professor</h1>
        <p className="text-on-surface-variant">Monitor exams, review suspicious activity, and manage assessments from one dashboard.</p>
      </section>

      <div className="grid md:grid-cols-4 gap-gutter mb-lg">
        <StatCard label="Total Exams" value={loading ? '—' : exams.length.toString()} icon="event" />
        <StatCard label="Active Exams" value={loading ? '—' : active.length.toString()} icon="assignment" />
        <StatCard label="Scheduled" value={loading ? '—' : scheduled.length.toString()} icon="schedule" />
        <StatCard label="Drafts" value={loading ? '—' : exams.filter(e => e.status === 'draft').length.toString()} icon="edit_note" />
      </div>

      <div className="bento-grid">
        <section className="col-span-8 card overflow-hidden">
          <div className="p-md border-b border-outline-variant flex justify-between">
            <h2 className="text-xl font-bold text-primary">Today's Assessment Queue</h2>
            <button onClick={() => setPage('createExam')} className="btn-secondary px-md py-sm">Create Exam</button>
          </div>
          <div className="p-md">
            {loading ? (
              <p className="text-center text-on-surface-variant py-xl">Loading...</p>
            ) : today.length === 0 ? (
              <p className="text-center text-on-surface-variant py-xl">No exams scheduled today.</p>
            ) : (
              <div className="divide-y divide-outline-variant">
                {today.map(e => (
                  <div key={e.id} className="py-sm flex items-center justify-between">
                    <div>
                      <p className="font-bold text-primary">{e.title}</p>
                      <p className="text-xs text-on-surface-variant">{e.subject} • {new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({e.duration_minutes}min)</p>
                    </div>
                    <span className={`pill text-xs capitalize ${e.status === 'active' ? 'bg-error text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>{e.status === 'scheduled' ? 'upcoming' : e.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="col-span-4 p-md bg-primary-container text-white rounded-xl border border-outline-variant shadow-lg">
          <h2 className="text-xl font-bold mb-md">AI Integrity Summary</h2>
          <p className="text-sm opacity-70">Integrity data will appear once exams are conducted.</p>
          <button onClick={() => setPage('alerts')} className="mt-md w-full py-sm bg-white/10 rounded-lg hover:bg-white/20">Open Alerts</button>
        </section>

        <section className="col-span-12 card p-md">
          <h2 className="text-xl font-bold text-primary mb-md">Upcoming Exams</h2>
          {loading ? (
            <p className="text-on-surface-variant text-sm">Loading...</p>
          ) : upcoming.length === 0 ? (
            <p className="text-on-surface-variant text-sm">No upcoming exams.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-md">
              {upcoming.slice(0, 6).map(e => (
                <div key={e.id} className="border border-outline-variant rounded-lg p-md">
                  <p className="font-bold text-primary text-sm">{e.title}</p>
                  <p className="text-xs text-on-surface-variant">{e.subject}</p>
                  <p className="text-xs text-on-surface-variant mt-xs">{new Date(e.start_time).toLocaleString()} • {e.duration_minutes} min</p>
                  <span className={`inline-block mt-xs text-xs font-bold ${e.status === 'active' ? 'text-error' : 'text-secondary'}`}>{e.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="col-span-12 card p-md">
          <h2 className="text-xl font-bold text-primary mb-md">Quick Actions</h2>
          <div className="grid md:grid-cols-6 gap-sm">
            {[
              ['Create Exam', 'add', 'createExam'],
              ['Schedule', 'event', 'scheduling'],
              ['Assign Students', 'group_add', 'assignStudents'],
              ['Question Bank', 'database', 'questionBank'],
              ['Reports', 'analytics', 'reports'],
              ['Live Room', 'videocam', 'liveRoom'],
            ].map(([label, icon, target]) => (
              <button key={label} onClick={() => setPage(target)} className="p-md border border-outline-variant rounded-xl hover:border-secondary-container hover:bg-secondary-container/10 text-left">
                <Icon className="text-primary">{icon}</Icon>
                <p className="font-bold mt-sm">{label}</p>
              </button>
            ))}
          </div>
        </section>
      </div>
    </TeacherShell>
  )
}
