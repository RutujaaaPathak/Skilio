import { useState, useEffect, useCallback } from 'react'
import TeacherShell, { Icon, StatCard } from '../../../components/TeacherShell.jsx'
import { examService } from '../../../services/examService.js'
import { teacherProctorService } from '../../../services/teacherProctorService.js'

export default function LiveExamControlRoom({ page, setPage, pageRef }) {
  const [exams, setExams] = useState([])
  const [selectedExamId, setSelectedExamId] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lockdown, setLockdown] = useState(true)

  const fetchExams = useCallback(async () => {
    try {
      const data = await examService.list()
      setExams(data)
      if (data.length > 0 && !selectedExamId) {
        setSelectedExamId(data[0].id)
      }
    } catch { setExams([]) }
  }, [selectedExamId])

  const fetchReports = useCallback(async () => {
    if (!selectedExamId) return
    setLoading(true)
    setError(null)
    try {
      const data = await teacherProctorService.getExamRiskReports(selectedExamId)
      setReports(data)
    } catch (e) {
      setError(e.message)
      setReports([])
    } finally { setLoading(false) }
  }, [selectedExamId])

  useEffect(() => { fetchExams() }, [])
  useEffect(() => { fetchReports() }, [fetchReports])

  useEffect(() => {
    if (!selectedExamId) return
    const interval = setInterval(() => { fetchReports() }, 5000)
    return () => clearInterval(interval)
  }, [selectedExamId, fetchReports])

  const highRisk = reports.filter(r => r.risk_level === 'high' || r.risk_level === 'critical')
  const totalEvents = reports.reduce((s, r) => s + r.total_events, 0)

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

  return (
    <TeacherShell page={page} setPage={setPage} title="Live Exam Control Room">
      <div className="mb-lg flex justify-between items-end">
        <div>
          <span className="pill bg-tertiary-fixed text-on-tertiary-container">CONTROL ROOM ACTIVE</span>
          <h1 className="text-4xl font-extrabold text-primary mt-sm">Live Exam Control</h1>
          <p className="text-on-surface-variant">Monitor active exams, risk scores, and proctor events in real time.</p>
        </div>
        <div className="flex gap-sm items-center">
          {exams.length > 0 && (
            <select
              value={selectedExamId || ''}
              onChange={e => setSelectedExamId(Number(e.target.value))}
              className="px-md py-sm border border-outline-variant rounded-lg bg-surface"
            >
              {exams.map(e => (
                <option key={e.id} value={e.id}>{e.title} (ID: {e.id})</option>
              ))}
            </select>
          )}
          <button onClick={() => setLockdown(!lockdown)} className={`${lockdown ? 'btn-secondary' : 'btn-primary'} px-lg py-sm flex gap-xs`}>
            <Icon>{lockdown ? 'lock' : 'lock_open'}</Icon>{lockdown ? 'Lockdown ON' : 'Lockdown OFF'}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-gutter mb-lg">
        <StatCard label="Students" value={reports.length.toString()} />
        <StatCard label="Total Events" value={totalEvents.toString()} />
        <StatCard label="Flagged" value={highRisk.length.toString()} />
        <StatCard label="Active Exams" value={exams.length.toString()} />
        <StatCard label="Auto Refresh" value="5s" />
      </div>

      {error && <div className="mb-lg p-md bg-error-container text-error rounded-lg">{error}</div>}

      <div className="bento-grid">
        <section className="col-span-12 card p-md">
          <div className="flex justify-between mb-md">
            <h2 className="text-xl font-bold text-primary">
              {selectedExamId ? `Risk Reports — Exam #${selectedExamId}` : 'Risk Reports'}
            </h2>
            <div className="flex gap-sm">
              <button onClick={fetchReports} className="btn-secondary px-md py-sm text-sm flex gap-xs items-center">
                <Icon>refresh</Icon> Refresh
              </button>
              <button onClick={() => setPage('alerts')} className="text-secondary font-bold px-md py-sm">
                View Alerts <Icon className="text-sm align-middle">arrow_forward</Icon>
              </button>
            </div>
          </div>

          {loading && reports.length === 0 ? (
            <p className="text-center text-on-surface-variant py-xl">Loading risk reports...</p>
          ) : reports.length === 0 ? (
            <p className="text-center text-on-surface-variant py-xl">
              {selectedExamId
                ? 'No risk reports yet. Ask students to start the exam and trigger proctor events.'
                : exams.length === 0
                  ? 'No active exams. Start an exam to begin monitoring.'
                  : 'Select an active exam above.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                    <th className="pb-sm font-bold">Student</th>
                    <th className="pb-sm font-bold">Email</th>
                    <th className="pb-sm font-bold text-center">Risk Score</th>
                    <th className="pb-sm font-bold text-center">Level</th>
                    <th className="pb-sm font-bold text-center">Events</th>
                    <th className="pb-sm font-bold text-center">L|M|H|C</th>
                    <th className="pb-sm font-bold">Summary</th>
                    <th className="pb-sm font-bold text-right">Last Updated</th>
                    <th className="pb-sm font-bold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => (
                    <tr key={r.id} className="border-b border-outline-variant hover:bg-surface-container-low">
                      <td className="py-sm font-bold text-primary">{r.student_name}</td>
                      <td className="py-sm text-on-surface-variant">{r.student_email}</td>
                      <td className="py-sm text-center font-bold">{r.risk_score.toFixed(1)}</td>
                      <td className="py-sm text-center">
                        <span className={`pill text-xs ${riskColor(r.risk_level)}`}>
                          {r.risk_level}
                        </span>
                      </td>
                      <td className="py-sm text-center">{r.total_events}</td>
                      <td className="py-sm text-center text-xs text-on-surface-variant">
                        {r.low_count}|{r.medium_count}|{r.high_count}|{r.critical_count}
                      </td>
                      <td className="py-sm text-on-surface-variant max-w-xs truncate">{r.summary}</td>
                      <td className="py-sm text-right text-on-surface-variant text-xs">
                        {new Date(r.updated_at).toLocaleTimeString()}
                      </td>
                      <td className="py-sm text-center">
                        <button
                          onClick={() => setPage('monitoring', { examId: selectedExamId, studentId: r.student_id, studentName: r.student_name })}
                          className="text-secondary text-xs font-bold hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="col-span-12 card p-md">
          <h2 className="text-xl font-bold text-primary mb-md">Live Activity Feed</h2>
          {reports.length === 0 ? (
            <p className="text-on-surface-variant">No activity yet. Events will appear here in real time.</p>
          ) : (
            <div className="space-y-xs max-h-80 overflow-y-auto">
              {reports.slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center gap-sm p-sm bg-surface-container-low rounded-lg">
                  <span className={`w-2 h-2 rounded-full ${r.risk_level === 'critical' || r.risk_level === 'high' ? 'bg-error' : 'bg-secondary'}`} />
                  <span className="font-bold text-sm text-primary">{r.student_name}</span>
                  <span className="text-xs text-on-surface-variant">score {r.risk_score.toFixed(1)} ({r.risk_level})</span>
                  <span className="text-xs text-on-surface-variant ml-auto">{r.total_events} events</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </TeacherShell>
  )
}
