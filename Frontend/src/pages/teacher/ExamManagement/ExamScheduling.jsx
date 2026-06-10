import { useState, useEffect, useCallback } from 'react'
import TeacherShell, { Icon, StatCard } from '../../../components/TeacherShell.jsx'
import { examService } from '../../../services/examService.js'

export default function ExamScheduling({ page, setPage }) {
  const [view, setView] = useState('Week')
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

  const thisWeek = exams.filter(e => {
    const d = new Date(e.start_time)
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return d >= weekStart && d <= weekEnd
  })

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <TeacherShell page={page} setPage={setPage} title="Exam Scheduling">
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h1 className="text-4xl font-extrabold text-primary">Exam Scheduling</h1>
          <p className="text-on-surface-variant">Plan exam dates, assign batches, and avoid timetable conflicts.</p>
        </div>
        <div className="flex gap-xs bg-surface-container-low p-xs rounded-lg border border-outline-variant">
          {['Day', 'Week', 'Month'].map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-md py-xs rounded ${view === v ? 'bg-primary text-white' : 'text-on-surface-variant'}`}>{v}</button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-gutter mb-lg">
        <StatCard label="Total Exams" value={exams.length.toString()} icon="event" />
        <StatCard label="This Week" value={thisWeek.length.toString()} icon="date_range" />
        <StatCard label="Drafts" value={exams.filter(e => e.status === 'draft').length.toString()} icon="edit_note" />
      </div>

      <div className="bento-grid">
        <section className="col-span-8 card p-md">
          <div className="flex justify-between mb-md">
            <h2 className="text-xl font-bold text-primary">{view} Schedule</h2>
            <button onClick={() => setPage('createExam')} className="btn-secondary px-md py-sm flex gap-xs">
              <Icon>add</Icon>New Exam
            </button>
          </div>

          {loading ? (
            <p className="text-center text-on-surface-variant py-xl">Loading...</p>
          ) : (
            <div className="grid md:grid-cols-5 gap-sm">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d, di) => {
                const dayExams = exams.filter(e => {
                  const date = new Date(e.start_time)
                  return date.getDay() === di + 1
                })
                return (
                  <div key={d} className="min-h-80 bg-surface-container-low rounded-xl p-sm">
                    <p className="font-bold text-primary mb-sm">{d}</p>
                    {dayExams.map(e => (
                      <div key={e.id} className="p-sm mb-sm bg-white border border-outline-variant rounded-lg">
                        <p className="font-bold text-sm text-primary truncate">{e.title}</p>
                        <p className="text-xs text-on-surface-variant">{new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {e.duration_minutes}min</p>
                        <span className={`text-[10px] font-bold ${e.status === 'scheduled' ? 'text-secondary' : e.status === 'active' ? 'text-error' : 'text-on-surface-variant'}`}>
                          {e.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="col-span-4 card p-md">
          <h2 className="text-xl font-bold text-primary mb-md">Upcoming Exams</h2>
          {loading ? (
            <p className="text-on-surface-variant text-sm">Loading...</p>
          ) : exams.filter(e => e.status !== 'draft').length === 0 ? (
            <p className="text-on-surface-variant text-sm">No exams scheduled.</p>
          ) : (
            <div className="space-y-sm">
              {exams.filter(e => e.status !== 'draft').map(e => (
                  <div key={e.id} className="p-sm border border-outline-variant rounded-lg">
                    <p className="font-bold text-sm text-primary">{e.title}</p>
                    <p className="text-xs text-on-surface-variant">{e.subject}</p>
                    <p className="text-xs text-on-surface-variant">{new Date(e.start_time).toLocaleString()}</p>
                    <button onClick={() => setPage('assignStudents', e.id)} className="mt-xs text-xs font-bold text-secondary hover:underline">Assign Students</button>
                  </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </TeacherShell>
  )
}
