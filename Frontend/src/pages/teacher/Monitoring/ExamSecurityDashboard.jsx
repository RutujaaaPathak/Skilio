import { useState, useEffect, useCallback } from 'react'
import TeacherShell, { Icon, StatCard } from '../../../components/TeacherShell.jsx'
import { examService } from '../../../services/examService.js'
import { teacherProctorService } from '../../../services/teacherProctorService.js'

function ToggleBadge({ label, enabled }) {
  return (
    <div className={`flex items-center gap-xs px-md py-xs rounded-full text-xs font-bold ${enabled ? 'bg-secondary-fixed text-secondary' : 'bg-surface-container-high text-on-surface-variant'}`}>
      <Icon className={`text-sm ${enabled ? 'text-secondary' : ''}`}>{enabled ? 'check_circle' : 'remove_circle_outline'}</Icon>
      {label}
    </div>
  )
}

function RiskBar({ distribution }) {
  const total = Object.values(distribution).reduce((a, b) => a + b, 0) || 1
  const colors = { clean: 'bg-success-container', low: 'bg-tertiary-fixed', medium: 'bg-secondary-fixed', high: 'bg-error-container', critical: 'bg-error' }
  return (
    <div className="flex h-3 rounded-full overflow-hidden">
      {Object.entries(distribution).map(([level, count]) =>
        count > 0 ? <div key={level} className={`${colors[level] || 'bg-outline-variant'}`} style={{ width: `${(count / total) * 100}%` }} title={`${level}: ${count}`} /> : null
      )}
    </div>
  )
}

export default function ExamSecurityDashboard({ page, setPage, pageRef }) {
  const [exams, setExams] = useState([])
  const [selectedExamId, setSelectedExamId] = useState(null)
  const [summary, setSummary] = useState(null)
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

  const fetchSummary = useCallback(async () => {
    if (!selectedExamId) return
    setLoading(true)
    setError(null)
    try {
      const data = await teacherProctorService.getExamSecuritySummary(selectedExamId)
      setSummary(data)
    } catch (e) {
      setError(e.message || 'Failed to load security summary')
      setSummary(null)
    } finally { setLoading(false) }
  }, [selectedExamId])

  useEffect(() => { fetchExams() }, [])
  useEffect(() => { fetchSummary() }, [fetchSummary])

  useEffect(() => {
    if (!selectedExamId) return
    const interval = setInterval(() => { fetchSummary() }, 10000)
    return () => clearInterval(interval)
  }, [selectedExamId, fetchSummary])

  const cfg = summary?.security_config
  const ps = summary?.proctoring_summary

  const securityRows = cfg ? [
    ['Fullscreen Required', cfg.fullscreen_required, 'fullscreen'],
    ['Camera Required', cfg.camera_required, 'videocam'],
    ['Microphone Required', cfg.microphone_required, 'mic'],
    ['Voice Verification', cfg.voice_verification_enabled, 'face'],
    ['Offline Mode', cfg.is_offline_enabled, 'wifi_off'],
    ['Registered Device Only', cfg.registered_device_only, 'phone_iphone'],
    ['Randomize Questions', cfg.randomize_questions, 'shuffle'],
    ['Shuffle Options', cfg.shuffle_options, 'more_horiz'],
    ['Negative Marking', cfg.negative_marking_enabled, 'remove_circle_outline'],
  ] : []

  return (
    <TeacherShell page={page} setPage={setPage} title="Exam Security Dashboard">
      <div className="mb-lg flex flex-col md:flex-row md:items-end md:justify-between gap-md">
        <div>
          <span className="pill bg-secondary-fixed text-secondary">SECURITY OVERVIEW</span>
          <h1 className="text-4xl font-extrabold text-primary mt-sm">Security Dashboard</h1>
          <p className="text-on-surface-variant">View per-exam security configuration, proctoring stats, and risk trends.</p>
        </div>
        <div className="flex gap-sm items-center">
          <select
            value={selectedExamId || ''}
            onChange={e => setSelectedExamId(Number(e.target.value))}
            className="px-md py-sm border border-outline-variant rounded-lg bg-surface min-w-[200px]"
          >
            {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="mb-md p-md bg-error-container text-error rounded-lg text-sm font-bold flex items-center gap-xs"><Icon className="text-base">error</Icon>{error}</div>}

      {loading && !summary && (
        <div className="flex items-center justify-center py-xl">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {summary && (
        <div className="space-y-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
            <StatCard icon="security" label="Status" value={summary.status || 'N/A'} />
            <StatCard icon="warning" label="Total Events" value={String(ps?.total_events || 0)} />
            <StatCard icon="flag" label="Flagged Students" value={String(ps?.flagged_students || 0)} />
            <StatCard icon="monitor_heart" label="AI Level" value={cfg?.ai_monitoring_level?.charAt(0).toUpperCase() + cfg?.ai_monitoring_level?.slice(1) || 'N/A'} />
          </div>

          <div className="card p-lg">
            <h2 className="text-lg font-bold text-primary mb-md flex items-center gap-xs"><Icon className="text-xl">security</Icon>Security Configuration</h2>
            <div className="flex flex-wrap gap-sm">
              {securityRows.map(([label, enabled, icon]) => (
                <ToggleBadge key={label} label={label} enabled={enabled} />
              ))}
            </div>
            <div className="mt-md grid md:grid-cols-3 gap-md text-sm">
              <div className="bg-surface-container-low rounded-lg p-md">
                <span className="text-on-surface-variant font-bold uppercase tracking-wider text-xs">Tab Switch Limit</span>
                <p className="text-primary font-bold mt-xs">{cfg?.tab_switch_limit}</p>
              </div>
              <div className="bg-surface-container-low rounded-lg p-md">
                <span className="text-on-surface-variant font-bold uppercase tracking-wider text-xs">Grace Period</span>
                <p className="text-primary font-bold mt-xs">{cfg?.grace_period_minutes} min</p>
              </div>
              <div className="bg-surface-container-low rounded-lg p-md">
                <span className="text-on-surface-variant font-bold uppercase tracking-wider text-xs">Late Entry</span>
                <p className="text-primary font-bold mt-xs">{cfg?.allow_late_entry ? `${cfg?.late_entry_cutoff_minutes > 0 ? `${cfg?.late_entry_cutoff_minutes} min cutoff` : 'Anytime'}` : 'Not allowed'}</p>
              </div>
              {cfg?.negative_marking_enabled && (
                <div className="bg-surface-container-low rounded-lg p-md">
                  <span className="text-on-surface-variant font-bold uppercase tracking-wider text-xs">Negative Marks / Wrong</span>
                  <p className="text-primary font-bold mt-xs">{cfg?.negative_marks_per_question}</p>
                </div>
              )}
            </div>
          </div>

          <div className="card p-lg">
            <h2 className="text-lg font-bold text-primary mb-md flex items-center gap-xs"><Icon className="text-xl">analytics</Icon>Proctoring Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-md mb-md text-center">
              {[
                ['Total', ps?.total_events, 'text-on-surface'],
                ['Critical', ps?.critical_count, 'text-error'],
                ['High', ps?.high_count, 'text-error'],
                ['Medium', ps?.medium_count, 'text-warning'],
                ['Low', ps?.low_count, 'text-on-surface-variant'],
              ].map(([label, count, color]) => (
                <div key={label} className="bg-surface-container-low rounded-lg p-md">
                  <p className={`text-2xl font-extrabold ${color}`}>{count}</p>
                  <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-md">
              <p className="text-sm font-bold text-on-surface-variant mb-xs">Risk Distribution</p>
              <RiskBar distribution={ps?.risk_distribution || {}} />
              <div className="flex flex-wrap gap-md mt-xs text-xs text-on-surface-variant">
                {Object.entries(ps?.risk_distribution || {}).map(([level, count]) => (
                  <span key={level} className="capitalize">{level}: {count}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-md flex-wrap">
            <button onClick={function() { pageRef.current = { liveRoom: { focusExamId: selectedExamId } }; setPage('liveRoom'); }} className="btn-secondary px-lg py-sm flex items-center gap-xs">
              <Icon className="text-lg">monitoring</Icon>Live Exam Control Room
            </button>
            <button onClick={function() { pageRef.current = { alerts: { focusExamId: selectedExamId } }; setPage('alerts'); }} className="btn-secondary px-lg py-sm flex items-center gap-xs">
              <Icon className="text-lg">warning</Icon>Suspicious Activity Alerts
            </button>
          </div>
        </div>
      )}

      {!loading && !summary && !error && exams.length > 0 && (
        <div className="text-center py-xl text-on-surface-variant flex flex-col items-center gap-md">
          <Icon className="text-6xl">shield</Icon>
          <p className="text-lg">Select an exam above to view its security configuration.</p>
        </div>
      )}

      {exams.length === 0 && !loading && (
        <div className="text-center py-xl text-on-surface-variant">No exams found. Create an exam first.</div>
      )}
    </TeacherShell>
  )
}
