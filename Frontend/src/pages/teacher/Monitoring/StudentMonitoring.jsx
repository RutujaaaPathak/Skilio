import { useState, useEffect, useCallback } from 'react'
import TeacherShell, { Icon, StatCard } from '../../../components/TeacherShell.jsx'
import { teacherProctorService } from '../../../services/teacherProctorService.js'

export default function StudentMonitoring({ page, setPage, pageRef }) {
  const params = pageRef?.current?.monitoring || {}
  const { examId, studentId, studentName } = params

  const [report, setReport] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!examId || !studentId) return
    setLoading(true)
    try {
      const [reportData, eventsData] = await Promise.all([
        teacherProctorService.getStudentRiskReport(examId, studentId).catch(() => null),
        teacherProctorService.getStudentProctorEvents(examId, studentId),
      ])
      setReport(reportData)
      setEvents(eventsData)
    } catch { } finally { setLoading(false) }
  }, [examId, studentId])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!examId || !studentId) return
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [examId, studentId, fetchData])

  const riskColor = (level) => {
    switch (level) {
      case 'clean': return 'bg-success-container text-success'
      case 'low': return 'bg-tertiary-fixed text-on-tertiary-container'
      case 'medium': return 'bg-secondary-fixed text-secondary'
      case 'high': return 'bg-error-container text-error'
      case 'critical': return 'bg-error text-white'
      default: return 'bg-surface-container-high text-on-surface-variant'
    }
  }

  const severityColor = (sev) => {
    switch (sev) {
      case 'critical': return 'text-error font-bold'
      case 'high': return 'text-error'
      case 'medium': return 'text-secondary'
      case 'low': return 'text-on-surface-variant'
      default: return ''
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

  if (!examId || !studentId) {
    return (
      <TeacherShell page={page} setPage={setPage} title="Student Monitoring">
        <div className="mb-lg">
          <span className="pill bg-tertiary-fixed text-on-tertiary-container">LIVE EXAM ACTIVE</span>
          <h1 className="text-4xl font-extrabold text-primary mt-sm">Student Monitoring</h1>
          <p className="text-on-surface-variant">Select a student from the Live Exam Control Room to view their monitoring details.</p>
        </div>
        <div className="card p-md text-center text-on-surface-variant py-xl">
          No student selected. Go to <button onClick={() => setPage('liveRoom')} className="text-secondary font-bold hover:underline">Live Exam Control Room</button> and click "View" on a student.
        </div>
      </TeacherShell>
    )
  }

  return (
    <TeacherShell page={page} setPage={setPage} title={`Monitoring — ${studentName || `Student #${studentId}`}`}>
      <div className="mb-lg flex justify-between items-end">
        <div>
          <span className="pill bg-tertiary-fixed text-on-tertiary-container">LIVE EXAM ACTIVE</span>
          <h1 className="text-4xl font-extrabold text-primary mt-sm">{studentName || `Student #${studentId}`}</h1>
          <p className="text-on-surface-variant">Real-time proctor events and risk analysis.</p>
        </div>
        <button onClick={() => setPage('liveRoom')} className="btn-secondary px-md py-sm flex gap-xs items-center">
          <Icon>arrow_back</Icon> Back to Control Room
        </button>
      </div>

      {loading && !report && events.length === 0 ? (
        <p className="text-center text-on-surface-variant py-xl">Loading monitoring data...</p>
      ) : (
        <>
          {report && (
            <div className="grid md:grid-cols-5 gap-gutter mb-lg">
              <StatCard label="Risk Score" value={report.risk_score.toFixed(1)} />
              <StatCard label="Risk Level" value={report.risk_level.toUpperCase()} />
              <StatCard label="Total Events" value={report.total_events.toString()} />
              <StatCard
                label="Breakdown"
                value={`${report.low_count}L / ${report.medium_count}M / ${report.high_count}H / ${report.critical_count}C`}
              />
              <StatCard label="Last Updated" value={new Date(report.updated_at).toLocaleTimeString()} />
            </div>
          )}

          {report?.summary && (
            <div className="mb-lg p-md bg-surface-container-low rounded-lg text-sm text-on-surface-variant">
              <span className="font-bold text-primary">Summary:</span> {report.summary}
            </div>
          )}

          <div className="bento-grid">
            <section className="col-span-12 card p-md">
              <h2 className="text-xl font-bold text-primary mb-md">Event Timeline</h2>

              {events.length === 0 ? (
                <p className="text-on-surface-variant">No proctor events recorded for this student.</p>
              ) : (
                <div className="relative pl-md">
                  <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-outline-variant" />
                  <div className="space-y-md">
                    {events.map((ev, i) => (
                      <div key={ev.id || i} className="relative flex gap-md items-start">
                        <div className={`absolute -left-[17px] w-3 h-3 rounded-full border-2 border-surface ${ev.severity === 'critical' ? 'bg-error' : ev.severity === 'high' ? 'bg-error-container' : ev.severity === 'medium' ? 'bg-secondary' : 'bg-tertiary-fixed'}`} />
                        <div className="flex-1 p-sm rounded-lg bg-surface-container-low">
                          <div className="flex items-center gap-sm">
                            <Icon className={`text-sm ${severityColor(ev.severity)}`}>{eventIcon(ev.event_type)}</Icon>
                            <span className="font-bold text-primary">{ev.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                            <span className={`px-sm py-0.5 rounded text-xs font-bold ${ev.severity === 'critical' ? 'bg-error text-white' : ev.severity === 'high' ? 'bg-error-container text-error' : ev.severity === 'medium' ? 'bg-secondary-fixed text-secondary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                              {ev.severity.toUpperCase()}
                            </span>
                            <span className="ml-auto text-xs text-on-surface-variant">
                              {new Date(ev.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          {ev.description && (
                            <p className="text-xs text-on-surface-variant mt-xs">{ev.description}</p>
                          )}
                          {ev.confidence_score != null && (
                            <p className="text-xs text-on-surface-variant mt-xs">Confidence: {(ev.confidence_score * 100).toFixed(0)}%</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </TeacherShell>
  )
}
