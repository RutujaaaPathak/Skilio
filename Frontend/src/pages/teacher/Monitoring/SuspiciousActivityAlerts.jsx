import { useState, useEffect, useCallback } from 'react'
import TeacherShell, { Icon, StatCard } from '../../../components/TeacherShell.jsx'
import { examService } from '../../../services/examService.js'
import { teacherProctorService } from '../../../services/teacherProctorService.js'

export default function SuspiciousActivityAlerts({ page, setPage }) {
  const [exams, setExams] = useState([])
  const [selectedExamId, setSelectedExamId] = useState(null)
  const [events, setEvents] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchExams = useCallback(async () => {
    try {
      const data = await examService.list()
      setExams(data)
      if (data.length > 0 && !selectedExamId) {
        setSelectedExamId(data[0].id)
      }
    } catch { setExams([]) }
  }, [selectedExamId])

  const fetchEvents = useCallback(async () => {
    if (!selectedExamId) return
    setLoading(true)
    setError(null)
    try {
      const data = await teacherProctorService.getExamProctorEvents(selectedExamId)
      setEvents(data)
    } catch (e) {
      setError(e.message)
      setEvents([])
    } finally { setLoading(false) }
  }, [selectedExamId])

  useEffect(() => { fetchExams() }, [])
  useEffect(() => { fetchEvents() }, [fetchEvents])

  useEffect(() => {
    if (!selectedExamId) return
    const interval = setInterval(fetchEvents, 5000)
    return () => clearInterval(interval)
  }, [selectedExamId, fetchEvents])

  const shown = filter === 'All' ? events : events.filter(e => e.severity === filter.toLowerCase())
  const highCount = events.filter(e => e.severity === 'high' || e.severity === 'critical').length
  const resolved = 0
  const pending = events.length

  const severityColor = (sev) => {
    switch (sev) {
      case 'critical': return { bg: 'bg-error text-white', dot: 'bg-error', icon: 'bg-error-container text-error' }
      case 'high': return { bg: 'bg-error-container text-error', dot: 'bg-error-container', icon: 'bg-error-container text-error' }
      case 'medium': return { bg: 'bg-secondary-fixed text-secondary', dot: 'bg-secondary', icon: 'bg-secondary-fixed text-secondary' }
      case 'low': return { bg: 'bg-surface-container-high text-on-surface-variant', dot: 'bg-tertiary-fixed', icon: 'bg-surface-container-high text-on-surface-variant' }
      default: return { bg: 'bg-surface-container-high text-on-surface-variant', dot: 'bg-outline-variant', icon: 'bg-surface-container-high text-on-surface-variant' }
    }
  }

  const eventIcon = (type) => {
    const icons = {
      tab_switch: 'tab',
      fullscreen_exit: 'fullscreen_exit',
      devtools_opened: 'code',
      copy_paste: 'content_paste',
      right_click: 'mouse',
      phone_detected: 'smartphone',
      looking_away: 'visibility_off',
      no_face_detected: 'face_3',
      no_face: 'face_3',
      multiple_faces_detected: 'groups',
      multiple_faces: 'groups',
      camera_blocked: 'videocam_off',
      face_mismatch: 'face_4',
      suspicious_movement: 'warning',
      window_blur: 'blur_on',
      student_verified: 'verified',
    }
    return icons[type] || 'warning'
  }

  return (
    <TeacherShell page={page} setPage={setPage} title="Suspicious Activity Alerts">
      <div className="flex justify-between items-end mb-lg">
        <div>
          <h1 className="text-4xl font-extrabold text-primary">Suspicious Activity Alerts</h1>
          <p className="text-on-surface-variant">Review AI-generated integrity incidents from live and completed exams.</p>
        </div>
        <div className="flex gap-sm items-center">
          {exams.length > 0 && (
            <select
              value={selectedExamId || ''}
              onChange={e => setSelectedExamId(Number(e.target.value))}
              className="px-md py-sm border border-outline-variant rounded-lg bg-surface text-sm"
            >
              {exams.map(e => (
                <option key={e.id} value={e.id}>{e.title} (ID: {e.id})</option>
              ))}
            </select>
          )}
          <div className="flex gap-xs bg-surface-container-low p-xs rounded-lg border border-outline-variant">
            {['All', 'Critical', 'High', 'Medium', 'Low'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-md py-xs rounded text-sm ${filter === f ? 'bg-primary text-white' : 'text-on-surface-variant'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-gutter mb-lg">
        <StatCard label="Total Alerts" value={events.length.toString()} />
        <StatCard label="High Priority" value={highCount.toString()} />
        <StatCard label="Resolved" value={resolved.toString()} />
        <StatCard label="Pending" value={pending.toString()} />
      </div>

      {error && <div className="mb-lg p-md bg-error-container text-error rounded-lg">{error}</div>}

      <div className="grid lg:grid-cols-[1fr_360px] gap-gutter">
        <section className="card overflow-hidden">
          <div className="divide-y divide-outline-variant max-h-[600px] overflow-y-auto">
            {loading && shown.length === 0 ? (
              <p className="p-md text-center text-on-surface-variant">Loading alerts...</p>
            ) : shown.length === 0 ? (
              <p className="p-md text-center text-on-surface-variant">
                {selectedExamId ? 'No alerts match the current filter.' : 'Select an exam to view alerts.'}
              </p>
            ) : (
              shown.map((ev, i) => {
                const colors = severityColor(ev.severity)
                return (
                  <div key={ev.id || i} className="p-md hover:bg-surface-container-low flex items-center justify-between">
                    <div className="flex gap-md items-center min-w-0">
                      <div className={`w-10 h-10 rounded-lg grid place-items-center flex-shrink-0 ${colors.icon}`}>
                        <Icon>{eventIcon(ev.event_type)}</Icon>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-sm">
                          <h3 className="font-bold text-primary truncate">{ev.student_name || `Student #${ev.student_id}`}</h3>
                          <span className={`text-xs px-sm py-0.5 rounded font-bold ${colors.bg}`}>
                            {ev.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-on-surface-variant">
                          {ev.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          <span className="text-xs ml-sm">{new Date(ev.created_at).toLocaleTimeString()}</span>
                        </p>
                        {ev.description && (
                          <p className="text-xs text-on-surface-variant mt-xs truncate">{ev.description}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setPage('monitoring', { examId: selectedExamId, studentId: ev.student_id, studentName: ev.student_name })}
                      className="px-sm py-xs border border-outline-variant rounded-lg text-sm flex-shrink-0 hover:bg-surface-container-high"
                    >
                      Review
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <aside className="card p-md">
          <h2 className="text-xl font-bold text-primary mb-md">Incident Policy</h2>
          <div className="space-y-sm text-sm text-on-surface-variant">
            <div className="p-sm bg-surface-container-low rounded-lg">
              <p className="font-bold text-primary mb-xs">Severity Levels</p>
              <ul className="space-y-xs">
                <li className="flex gap-xs items-center"><span className="w-2 h-2 rounded-full bg-error" /> Critical – Auto-notify</li>
                <li className="flex gap-xs items-center"><span className="w-2 h-2 rounded-full bg-error-container" /> High – Review required</li>
                <li className="flex gap-xs items-center"><span className="w-2 h-2 rounded-full bg-secondary" /> Medium – Flag for review</li>
                <li className="flex gap-xs items-center"><span className="w-2 h-2 rounded-full bg-tertiary-fixed" /> Low – Informational</li>
              </ul>
            </div>
            <p>Page auto-refreshes every 5 seconds to show the latest alerts.</p>
          </div>
        </aside>
      </div>
    </TeacherShell>
  )
}
