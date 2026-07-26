import { useState, useEffect, useCallback, useMemo } from 'react'
import TeacherShell, { Icon, StatCard } from '../../../components/TeacherShell.jsx'
import { useAuth } from '../../../context/AuthContext.jsx'
import { examService } from '../../../services/examService.js'
import { teacherService } from '../../../services/teacherService.js'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function TeacherDashboard({ page, setPage }) {
  const { user } = useAuth()
  const [exams, setExams] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [performance, setPerformance] = useState(null)
  const [pendingList, setPendingList] = useState(null)
  const [activities, setActivities] = useState(null)
  const [recentAlerts, setRecentAlerts] = useState(null)
  const [announcements, setAnnouncements] = useState(null)
  const [trends, setTrends] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [subjectFilter, setSubjectFilter] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [expandedSubject, setExpandedSubject] = useState(null)
  const [previousIntegrity, setPreviousIntegrity] = useState(null)

  const downloadCSV = (filename, headers, rows) => {
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const subjects = useMemo(() => {
    const s = new Set(exams.map(e => e.subject).filter(Boolean))
    return ['', ...Array.from(s).sort()]
  }, [exams])

  const getDateParams = (range) => {
    if (range === 'all') return {}
    const now = new Date()
    const from = new Date(now)
    if (range === '7d') from.setDate(now.getDate() - 7)
    else if (range === '30d') from.setDate(now.getDate() - 30)
    else if (range === '90d') from.setDate(now.getDate() - 90)
    return {
      date_from: from.toISOString().split('T')[0],
      date_to: now.toISOString().split('T')[0],
    }
  }

  const fetchExams = useCallback(async (filters) => {
    setLoading(true)
    setError(null)
    const sf = filters?.subject ?? subjectFilter
    const dr = filters?.dateRange ?? dateRange
    try {
      const dateParams = getDateParams(dr)
      const analyticsParams = { subject: sf || undefined, ...dateParams }
      const qp = new URLSearchParams()
      if (analyticsParams.subject) qp.set('subject', analyticsParams.subject)
      if (analyticsParams.date_from) qp.set('date_from', analyticsParams.date_from)
      if (analyticsParams.date_to) qp.set('date_to', analyticsParams.date_to)
      const qs = qp.toString()

      const prevDateParams = dr === '7d' || dr === 'all' ? { date_from: (d => { const n = new Date(); n.setDate(n.getDate() - 14); return n })(), date_to: (d => { const n = new Date(); n.setDate(n.getDate() - 7); return n })() } : dr === '30d' ? { date_from: (d => { const n = new Date(); n.setDate(n.getDate() - 60); return n })(), date_to: (d => { const n = new Date(); n.setDate(n.getDate() - 30); return n })() } : dr === '90d' ? { date_from: (d => { const n = new Date(); n.setDate(n.getDate() - 180); return n })(), date_to: (d => { const n = new Date(); n.setDate(n.getDate() - 90); return n })() } : null
      const prevQp = prevDateParams ? ((pqp) => { if (analyticsParams.subject) pqp.set('subject', analyticsParams.subject); if (prevDateParams.date_from) pqp.set('date_from', prevDateParams.date_from.toISOString().split('T')[0]); if (prevDateParams.date_to) pqp.set('date_to', prevDateParams.date_to.toISOString().split('T')[0]); return pqp })(new URLSearchParams()) : null
      const previousFetch = prevQp ? teacherService.getAnalytics(prevQp.toString()).catch(() => null) : Promise.resolve(null)

      const [examsData, dashData, perfData, pendingData, actData, alertData, annData, trendData, analyticsData, previousData] = await Promise.all([
        examService.list(),
        teacherService.getDashboard(),
        teacherService.getPerformance(),
        teacherService.getPendingEvaluations(),
        teacherService.getActivities(),
        teacherService.getRecentAlerts(),
        teacherService.getAnnouncements(),
        teacherService.getTrends(),
        qs ? teacherService.getAnalytics(qs) : teacherService.getAnalytics(),
        previousFetch,
      ])
      setExams(examsData)
      setDashboard(dashData)
      setPerformance(perfData)
      setPendingList(pendingData)
      setActivities(actData)
      setRecentAlerts(alertData)
      setAnnouncements(annData)
      setTrends(trendData)
      setAnalytics(analyticsData)
      setPreviousIntegrity(previousData?.overall_integrity_score ?? null)
    } catch {
      setExams([])
      setDashboard(null)
      setPerformance(null)
      setPendingList(null)
      setActivities(null)
      setRecentAlerts(null)
      setAnnouncements(null)
      setTrends(null)
      setAnalytics(null)
      setPreviousIntegrity(null)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [subjectFilter, dateRange])

  useEffect(() => { fetchExams() }, [fetchExams])

  const handleRefresh = useCallback(() => fetchExams(), [fetchExams])

  const handleFilterChange = useCallback((type, value) => {
    if (type === 'subject') setSubjectFilter(value)
    else setDateRange(value)
  }, [])

  const scheduled = exams.filter(e => e.status === 'scheduled')
  const active = exams.filter(e => e.status === 'active')
  const today = exams.filter(e => new Date(e.start_time).toDateString() === new Date().toDateString())
  const upcoming = exams.filter(e => e.status !== 'draft' && new Date(e.start_time) > new Date())

  const teacherInfo = [user?.department, user?.college].filter(Boolean).join(' — ')

  return (
    <TeacherShell page={page} setPage={setPage} title="Teacher Dashboard">
      <section className="mb-lg">
        <div className="flex items-center justify-between flex-wrap gap-sm">
          <div>
            <span className="pill bg-secondary-fixed text-secondary">Academic Control Room</span>
            <h1 className="text-4xl font-extrabold text-primary mt-sm">{getGreeting()}, {user?.name || 'Professor'}</h1>
            {teacherInfo && <p className="text-on-surface-variant text-sm mt-xs">{teacherInfo}</p>}
          </div>
          <div className="flex items-center gap-sm">
            <button onClick={() => handleFilterChange('dateRange', '7d')} className={`pill text-xs cursor-pointer ${dateRange === '7d' ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>7d</button>
            <button onClick={() => handleFilterChange('dateRange', '30d')} className={`pill text-xs cursor-pointer ${dateRange === '30d' ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>30d</button>
            <button onClick={() => handleFilterChange('dateRange', '90d')} className={`pill text-xs cursor-pointer ${dateRange === '90d' ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>90d</button>
            <button onClick={() => handleFilterChange('dateRange', 'all')} className={`pill text-xs cursor-pointer ${dateRange === 'all' ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'}`}>All</button>
            <select value={subjectFilter} onChange={e => handleFilterChange('subject', e.target.value)} className="text-xs border border-outline-variant rounded-lg px-sm py-xs bg-surface text-on-surface focus-ring">
              <option value="">All Subjects</option>
              {subjects.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={handleRefresh} disabled={loading} className="p-xs hover:bg-surface-container-high rounded-full transition-colors disabled:opacity-50" title="Refresh">
              <Icon className={`text-primary ${loading ? 'animate-spin' : ''}`}>refresh</Icon>
            </button>
            <button onClick={() => {
              if (!analytics) return
              const h = ['Subject', 'Avg Score', 'Students', 'Exams', 'Issues']
              const r = (analytics.subject_performance || []).map(s => [s.subject, s.average_score ?? '', s.total_students, s.total_exams, s.integrity_incidents])
              downloadCSV('analytics.csv', h, r)
            }} disabled={!analytics} className="p-xs hover:bg-surface-container-high rounded-full transition-colors disabled:opacity-50" title="Export CSV">
              <Icon className="text-primary">download</Icon>
            </button>
          </div>
        </div>
        <p className="text-on-surface-variant mt-xs">Monitor exams, review suspicious activity, and manage assessments from one dashboard.</p>
        {error && (
          <div className="mt-md p-sm bg-error-container text-error rounded-lg flex items-center gap-sm text-sm">
            <Icon className="text-error text-lg">error</Icon>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="p-xs hover:bg-white/10 rounded-full"><Icon className="text-lg">close</Icon></button>
          </div>
        )}
      </section>

      <div className="grid md:grid-cols-4 gap-gutter mb-lg">
        <StatCard label="Total Conducted" value={loading ? '—' : exams.filter(e => e.status === 'completed').length.toString()} icon="event" />
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
              <div className="space-y-md py-md">
                {[1,2,3].map(i => <div key={i} className="animate-pulse flex justify-between items-center"><div className="space-y-xs flex-1 mr-md"><div className="h-4 bg-surface-container-high rounded w-3/5" /><div className="h-3 bg-surface-container-high rounded w-2/5" /></div><div className="h-5 bg-surface-container-high rounded-full w-16" /></div>)}
              </div>
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
          <div className="text-center mb-md py-sm border-b border-white/10">
            <p className="text-xs opacity-70 uppercase tracking-wider">Overall Integrity</p>
            <p className="text-4xl font-extrabold">
              {loading ? '—' : analytics?.overall_integrity_score != null ? `${analytics.overall_integrity_score}%` : 'N/A'}
            </p>
            {previousIntegrity != null && analytics?.overall_integrity_score != null && (
              <p className={`text-xs mt-xs ${analytics.overall_integrity_score >= previousIntegrity ? 'text-success' : 'text-error'}`}>
                {analytics.overall_integrity_score >= previousIntegrity ? '▲' : '▼'} {Math.abs(Math.round(analytics.overall_integrity_score - previousIntegrity))}% vs previous period
              </p>
            )}
          </div>
          {dashboard?.recent_alerts ? (
            <div className="space-y-sm text-sm">
              <div className="flex justify-between items-center py-xs border-b border-white/10">
                <span className="opacity-80">Last 24h</span>
                <span className="font-bold text-lg">{dashboard.recent_alerts.total}</span>
              </div>
              {[
                ['Critical', dashboard.recent_alerts.critical, 'bg-error'],
                ['High', dashboard.recent_alerts.high, 'bg-error'],
                ['Medium', dashboard.recent_alerts.medium, 'bg-secondary'],
                ['Low', dashboard.recent_alerts.low, 'bg-tertiary-fixed'],
              ].map(([label, count, color]) => (
                <div key={label} className="flex justify-between items-center">
                  <div className="flex items-center gap-sm">
                    <span className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="opacity-70">{label}</span>
                  </div>
                  <span className="font-bold">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm opacity-70">No alerts in the last 24 hours.</p>
          )}
          <button onClick={() => setPage('alerts')} className="mt-md w-full py-sm bg-white/10 rounded-lg hover:bg-white/20">View All Alerts</button>
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

        <section className="col-span-12 card p-md">
          <h2 className="text-xl font-bold text-primary mb-md">Announcements</h2>
          {loading ? (
            <div className="grid md:grid-cols-2 gap-md">
              {[1,2].map(i => <div key={i} className="animate-pulse border border-outline-variant rounded-lg p-md"><div className="flex gap-sm mb-xs"><div className="h-4 bg-surface-container-high rounded-full w-16" /><div className="h-3 bg-surface-container-high rounded w-12" /></div><div className="h-5 bg-surface-container-high rounded w-3/4 mb-xs" /><div className="h-3 bg-surface-container-high rounded w-full" /><div className="h-3 bg-surface-container-high rounded w-4/5 mt-xs" /></div>)}
            </div>
          ) : announcements?.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-md">
              {announcements.map(a => (
                <div key={a.id} className="border border-outline-variant rounded-lg p-md">
                  <div className="flex items-center gap-sm mb-xs">
                    <span className="pill bg-secondary-fixed text-secondary text-xs capitalize">{a.category}</span>
                    <span className="text-xs text-on-surface-variant">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-bold text-primary">{a.title}</h3>
                  <p className="text-sm text-on-surface-variant mt-xs line-clamp-2">{a.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant py-md">No announcements.</p>
          )}
        </section>

        <section className="col-span-12 card p-md">
          <h2 className="text-xl font-bold text-primary mb-md">Upcoming Exams</h2>
          {loading ? (
            <div className="grid md:grid-cols-3 gap-md">
              {[1,2,3].map(i => <div key={i} className="animate-pulse border border-outline-variant rounded-lg p-md"><div className="h-4 bg-surface-container-high rounded w-3/4 mb-xs" /><div className="h-3 bg-surface-container-high rounded w-1/2 mb-xs" /><div className="h-3 bg-surface-container-high rounded w-2/3 mb-xs" /><div className="h-3 bg-surface-container-high rounded w-12" /></div>)}
            </div>
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
          <h2 className="text-xl font-bold text-primary mb-md">Integrity Trend (Weekly)</h2>
          {loading ? (
            <div className="flex items-end gap-sm h-32 py-md">
              {[1,2,3,4,5,6].map(i => <div key={i} className="animate-pulse flex-1 bg-surface-container-high rounded-t-md" style={{ height: `${30 + Math.random() * 60}%` }} />)}
            </div>
          ) : analytics?.integrity_trend?.length > 0 ? (
            <div>
              <div className="flex items-end gap-xs h-40 mb-sm">
                {analytics.integrity_trend.map(p => (
                  <div key={p.week} className="flex-1 flex flex-col items-center gap-xs group relative">
                    <div className="w-full bg-primary/20 rounded-t-md relative" style={{ height: `${p.score}%` }}>
                      <div className="w-full h-full bg-primary rounded-t-md transition-all duration-500" style={{ height: `${p.score}%` }} />
                    </div>
                    <span className="text-[10px] text-on-surface-variant text-center truncate w-full">{p.week.split('-').slice(1).join('/')}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-on-surface-variant px-xs">
                <span>Higher = Better Integrity</span>
                <span>Last {analytics.integrity_trend.length} week{(analytics.integrity_trend.length || 0) !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant py-md">No integrity trend data available yet.</p>
          )}
        </section>

        <section className="col-span-6 card p-md">
          <h2 className="text-xl font-bold text-primary mb-md">Performance Trend</h2>
          {loading ? (
            <div className="space-y-md py-md">
              {[1,2,3,4].map(i => <div key={i} className="animate-pulse"><div className="flex justify-between mb-xs"><div className="h-3 bg-surface-container-high rounded w-24" /><div className="h-3 bg-surface-container-high rounded w-8" /></div><div className="h-2 bg-surface-container-high rounded-full w-full" /></div>)}
            </div>
          ) : trends?.performance_trend?.length > 0 ? (
            <div className="space-y-md">
              {trends.performance_trend.map(d => (
                <div key={d.label}>
                  <div className="flex justify-between text-xs mb-xs">
                    <span className="text-on-surface-variant truncate">{d.label}</span>
                    <span className="font-bold text-primary">{d.value}%</span>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-2">
                    <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min(d.value, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant py-md">No performance data yet.</p>
          )}
        </section>

        <section className="col-span-6 card p-md">
          <h2 className="text-xl font-bold text-primary mb-md">Risk Distribution</h2>
          {loading ? (
            <div className="space-y-md py-md">
              {[1,2,3,4,5].map(i => <div key={i} className="animate-pulse"><div className="flex justify-between mb-xs"><div className="h-3 bg-surface-container-high rounded w-20" /><div className="h-3 bg-surface-container-high rounded w-6" /></div><div className="h-2 bg-surface-container-high rounded-full w-full" /></div>)}
            </div>
          ) : trends?.risk_distribution?.length > 0 ? (
            <div className="space-y-md">
              {trends.risk_distribution.map((d, i) => {
                const maxCount = Math.max(...trends.risk_distribution.map(r => r.value), 1)
                const colors = ['bg-success', 'bg-tertiary-fixed', 'bg-secondary', 'bg-error', 'bg-error']
                return (
                  <div key={d.label}>
                    <div className="flex justify-between text-xs mb-xs">
                      <span className="text-on-surface-variant">{d.label}</span>
                      <span className="font-bold text-primary">{d.value}</span>
                    </div>
                    <div className="w-full bg-surface-container-high rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all duration-500 ${colors[i] || 'bg-primary'}`} style={{ width: `${(d.value / maxCount) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant py-md">No risk data available.</p>
          )}
        </section>

        <section className="col-span-6 card p-md">
          <h2 className="text-xl font-bold text-primary mb-md">Most Cheated Subject</h2>
          {loading ? (
            <div className="animate-pulse space-y-md py-md">
              <div className="h-6 bg-surface-container-high rounded w-32 mx-auto" />
              <div className="flex gap-md"><div className="flex-1 h-16 bg-surface-container-high rounded-lg" /><div className="flex-1 h-16 bg-surface-container-high rounded-lg" /></div>
            </div>
          ) : analytics?.most_cheated_subject ? (
            <>
              <div className="text-center py-md border-b border-outline-variant mb-md">
                <p className="text-2xl font-extrabold text-primary">{analytics.most_cheated_subject.subject}</p>
                <p className="text-xs text-on-surface-variant">{analytics.most_cheated_subject.total_violations} high/critical violation{(analytics.most_cheated_subject.total_violations || 0) !== 1 ? 's' : ''}</p>
              </div>
              <div className="flex gap-md text-sm">
                <div className="flex-1 text-center p-md bg-error-container rounded-lg">
                  <p className="text-2xl font-bold text-error">{analytics.most_cheated_subject.critical_count}</p>
                  <p className="text-xs text-on-surface-variant">Critical</p>
                </div>
                <div className="flex-1 text-center p-md bg-error/10 rounded-lg">
                  <p className="text-2xl font-bold text-error">{analytics.most_cheated_subject.high_count}</p>
                  <p className="text-xs text-on-surface-variant">High</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-on-surface-variant py-md">No integrity violation data available.</p>
          )}
        </section>

        <section className="col-span-6 card p-md">
          <h2 className="text-xl font-bold text-primary mb-md">Weak Topics Analysis</h2>
          {loading ? (
            <div className="space-y-md py-md">
              {[1,2,3].map(i => <div key={i} className="animate-pulse"><div className="flex justify-between mb-xs"><div className="h-3 bg-surface-container-high rounded w-28" /><div className="h-3 bg-surface-container-high rounded w-8" /></div><div className="h-2 bg-surface-container-high rounded-full w-full" /><div className="h-2 bg-surface-container-high rounded w-20 mt-xs" /></div>)}
            </div>
          ) : analytics?.weak_topics?.length > 0 ? (
            <div className="space-y-md max-h-72 overflow-y-auto">
              {analytics.weak_topics.map(t => (
                <div key={t.topic}>
                  <div className="flex justify-between text-xs mb-xs">
                    <span className="text-on-surface-variant truncate">{t.topic}</span>
                    <span className="font-bold text-primary">{t.average_score}%</span>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-2">
                    <div className="h-2 rounded-full bg-error transition-all duration-500" style={{ width: `${Math.min(t.average_score, 100)}%` }} />
                  </div>
                  <p className="text-xs text-on-surface-variant mt-xs">{t.subject} • {t.total_questions} question{(t.total_questions || 0) !== 1 ? 's' : ''}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant py-md">No weak topics found — students are performing well!</p>
          )}
        </section>

        <section className="col-span-6 card p-md">
          <div className="flex justify-between items-center mb-md">
            <h2 className="text-xl font-bold text-primary">Live Exams</h2>
            {dashboard?.active_exams?.length > 0 && (
              <span className="pill bg-error text-white">LIVE</span>
            )}
          </div>
          {loading ? (
            <div className="space-y-md py-md">
              {[1,2].map(i => <div key={i} className="animate-pulse"><div className="flex justify-between"><div className="h-4 bg-surface-container-high rounded w-3/5" /><div className="h-3 bg-surface-container-high rounded w-1/5" /></div><div className="flex gap-md mt-xs"><div className="h-3 bg-surface-container-high rounded w-16" /><div className="h-3 bg-surface-container-high rounded w-16" /><div className="h-3 bg-surface-container-high rounded w-16" /></div></div>)}
            </div>
          ) : dashboard?.active_exams?.length > 0 ? (
            <div className="divide-y divide-outline-variant">
              {dashboard.active_exams.map(e => (
                <div key={e.id} className="py-sm">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-primary text-sm">{e.title}</p>
                    <span className="text-xs text-on-surface-variant">{e.subject}</span>
                  </div>
                  <div className="flex gap-md mt-xs text-xs text-on-surface-variant">
                    <span>Assigned: {e.total_assigned}</span>
                    <span>Started: {e.started_count}</span>
                    <span>Submitted: {e.submitted_count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant py-md">No live exams right now.</p>
          )}
        </section>

        <section className="col-span-6 card p-md">
          <div className="flex justify-between items-center mb-md">
            <h2 className="text-xl font-bold text-primary">Pending Evaluations</h2>
            {pendingList?.total > 0 && (
              <span className="pill bg-error-container text-error">{pendingList.total} pending</span>
            )}
          </div>
          {loading ? (
            <div className="space-y-md py-md">
              {[1,2].map(i => <div key={i} className="animate-pulse"><div className="flex justify-between"><div className="h-4 bg-surface-container-high rounded w-2/5" /><div className="h-3 bg-surface-container-high rounded w-1/4" /></div><div className="h-3 bg-surface-container-high rounded w-1/2 mt-xs" /></div>)}
            </div>
          ) : pendingList?.total > 0 ? (
            <>
              <div className="divide-y divide-outline-variant max-h-72 overflow-y-auto">
                {pendingList.submissions.map(s => (
                  <div key={s.assignment_id} className="py-sm">
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-sm text-primary">{s.student_name}</p>
                      <span className="text-xs text-on-surface-variant">{s.exam_title}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-xs">
                      {s.subject} • Submitted {new Date(s.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
              <button onClick={() => setPage('reports')} className="mt-md btn-secondary px-md py-sm w-full">
                Review All Submissions
              </button>
            </>
          ) : (
            <p className="text-sm text-on-surface-variant py-md">All caught up — no pending submissions.</p>
          )}
        </section>

        <section className="col-span-12 card p-md">
          <h2 className="text-xl font-bold text-primary mb-md">Student Performance Summary</h2>
          <div className="grid md:grid-cols-4 gap-gutter mb-md">
            <StatCard label="Total Students" value={performance ? performance.total_students.toString() : '—'} icon="people" />
            <StatCard label="Submissions" value={performance ? performance.total_submissions.toString() : '—'} icon="assignment_turned_in" />
            <StatCard label="Avg Score" value={performance?.average_score != null ? `${performance.average_score}%` : '—'} icon="trending_up" />
            <StatCard label="Pass Rate" value={performance?.pass_rate != null ? `${performance.pass_rate}%` : '—'} icon="verified" />
          </div>
          <div className="grid md:grid-cols-3 gap-gutter text-sm">
            <div className="p-md border border-outline-variant rounded-lg">
              <p className="text-on-surface-variant">Completed Evaluations</p>
              <p className="text-2xl font-bold text-primary">{performance?.completed_evaluations ?? '—'}</p>
            </div>
            <div className="p-md border border-outline-variant rounded-lg">
              <p className="text-on-surface-variant">Pending Review</p>
              <p className="text-2xl font-bold text-primary">{performance?.pending_evaluations ?? '—'}</p>
            </div>
            <div className="p-md border border-outline-variant rounded-lg">
              <p className="text-on-surface-variant">Pass Threshold</p>
              <p className="text-2xl font-bold text-primary">40%</p>
            </div>
          </div>
        </section>

        <section className="col-span-12 card p-md">
          <div className="flex items-center justify-between mb-md">
            <h2 className="text-xl font-bold text-primary">Subject Performance</h2>
            {expandedSubject && (
              <button onClick={() => setExpandedSubject(null)} className="text-xs text-secondary font-bold hover:underline">&larr; Back to all subjects</button>
            )}
          </div>
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-md">
              {[1,2,3].map(i => <div key={i} className="animate-pulse border border-outline-variant rounded-lg p-md"><div className="h-5 bg-surface-container-high rounded w-24 mb-sm" /><div className="flex justify-between mb-xs"><div className="h-3 bg-surface-container-high rounded w-16" /><div className="h-4 bg-surface-container-high rounded w-10" /></div><div className="h-2 bg-surface-container-high rounded-full mb-md" /><div className="grid grid-cols-3 gap-xs"><div className="h-6 bg-surface-container-high rounded" /><div className="h-6 bg-surface-container-high rounded" /><div className="h-6 bg-surface-container-high rounded" /></div></div>)}
            </div>
          ) : expandedSubject ? (
            (() => {
              const exams = (analytics?.exam_performance || []).filter(e => e.subject === expandedSubject)
              return exams.length > 0 ? (
                <div className="divide-y divide-outline-variant">
                  {exams.map(e => (
                    <div key={e.exam_id} className="py-sm flex items-center justify-between">
                      <div className="min-w-0 flex-1 mr-md">
                        <p className="font-bold text-primary text-sm">{e.title}</p>
                        <p className="text-xs text-on-surface-variant">{e.student_count} student{(e.student_count || 0) !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-primary">{e.average_score != null ? `${e.average_score}%` : '—'}</p>
                        <div className="w-24 bg-surface-container-high rounded-full h-1.5 mt-xs ml-auto">
                          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(e.average_score ?? 0, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-on-surface-variant py-md">No exam data for {expandedSubject}.</p>
            })()
          ) : analytics?.subject_performance?.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-md">
              {analytics.subject_performance.map(s => (
                <button key={s.subject} onClick={() => setExpandedSubject(s.subject)} className="border border-outline-variant rounded-lg p-md text-left hover:border-secondary-container hover:bg-secondary-container/5 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between mb-sm">
                    <p className="font-bold text-primary">{s.subject}</p>
                    <Icon className="text-on-surface-variant text-sm">chevron_right</Icon>
                  </div>
                  <div className="flex justify-between items-center mb-xs">
                    <span className="text-xs text-on-surface-variant">Avg Score</span>
                    <span className="text-lg font-bold text-primary">{s.average_score != null ? `${s.average_score}%` : '—'}</span>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-2 mb-md">
                    <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min(s.average_score ?? 0, 100)}%` }} />
                  </div>
                  <div className="grid grid-cols-3 gap-xs text-xs text-center">
                    <div>
                      <p className="font-bold text-primary">{s.total_students}</p>
                      <p className="text-on-surface-variant">Students</p>
                    </div>
                    <div>
                      <p className="font-bold text-primary">{s.total_exams}</p>
                      <p className="text-on-surface-variant">Exams</p>
                    </div>
                    <div>
                      <p className={`font-bold ${s.integrity_incidents > 0 ? 'text-error' : 'text-success'}`}>{s.integrity_incidents}</p>
                      <p className="text-on-surface-variant">Issues</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant py-md">No subject performance data available yet.</p>
          )}
        </section>

        <section className="col-span-12 card p-md">
          <div className="flex items-center justify-between mb-md">
            <h2 className="text-xl font-bold text-primary">Student Ranking</h2>
            {analytics?.student_ranking?.length > 0 && (
              <button onClick={() => {
                const h = ['Rank', 'Student', 'Avg Score', 'Exams Taken', 'Integrity']
                const r = analytics.student_ranking.map((s, i) => [i + 1, s.student_name, s.average_score ?? '', s.exams_taken, s.integrity_level ?? '—'])
                downloadCSV('student_ranking.csv', h, r)
              }} className="text-xs text-secondary font-bold hover:underline" title="Export CSV">Export CSV</button>
            )}
          </div>
          {loading ? (
            <div className="space-y-sm">
              {[1,2,3,4,5].map(i => <div key={i} className="animate-pulse flex items-center gap-md"><div className="h-4 bg-surface-container-high rounded w-6 shrink-0" /><div className="h-4 bg-surface-container-high rounded w-48 flex-1" /><div className="h-4 bg-surface-container-high rounded w-16" /><div className="h-4 bg-surface-container-high rounded w-12" /><div className="h-4 bg-surface-container-high rounded w-20" /></div>)}
            </div>
          ) : analytics?.student_ranking?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="py-sm px-xs text-on-surface-variant font-semibold w-8">#</th>
                    <th className="py-sm px-xs text-on-surface-variant font-semibold">Student</th>
                    <th className="py-sm px-xs text-on-surface-variant font-semibold text-right">Avg Score</th>
                    <th className="py-sm px-xs text-on-surface-variant font-semibold text-right">Exams</th>
                    <th className="py-sm px-xs text-on-surface-variant font-semibold text-right">Integrity</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.student_ranking.slice(0, 20).map((s, i) => (
                    <tr key={s.student_id} className="border-b border-outline-variant/50 hover:bg-surface-container-low">
                      <td className="py-sm px-xs text-on-surface-variant">{i + 1}</td>
                      <td className="py-sm px-xs font-bold text-primary">{s.student_name}</td>
                      <td className="py-sm px-xs text-right">
                        <span className={s.average_score != null ? (s.average_score >= 60 ? 'text-success' : 'text-error') : 'text-on-surface-variant'}>
                          {s.average_score != null ? `${s.average_score}%` : '—'}
                        </span>
                      </td>
                      <td className="py-sm px-xs text-right text-on-surface-variant">{s.exams_taken}</td>
                      <td className="py-sm px-xs text-right">
                        {s.integrity_level ? (
                          <span className={`pill text-xs ${s.integrity_level === 'clean' || s.integrity_level === 'low' ? 'bg-success text-white' : s.integrity_level === 'medium' ? 'bg-secondary-fixed text-secondary' : 'bg-error text-white'}`}>
                            {s.integrity_level}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant py-md">No student ranking data available yet.</p>
          )}
        </section>

        <section className="col-span-6 card p-md">
          <div className="flex justify-between items-center mb-md">
            <h2 className="text-xl font-bold text-primary">Recent Alerts</h2>
            {recentAlerts?.length > 0 && (
              <button onClick={() => setPage('alerts')} className="text-secondary text-xs font-bold hover:underline">View All</button>
            )}
          </div>
          {loading ? (
            <div className="space-y-md py-md">
              {[1,2,3].map(i => <div key={i} className="animate-pulse flex items-center gap-sm"><div className="w-2 h-2 bg-surface-container-high rounded-full shrink-0" /><div className="flex-1 space-y-xs"><div className="h-4 bg-surface-container-high rounded w-2/5" /><div className="h-3 bg-surface-container-high rounded w-3/5" /></div><div className="h-5 bg-surface-container-high rounded-full w-14" /></div>)}
            </div>
          ) : recentAlerts?.length > 0 ? (
            <div className="divide-y divide-outline-variant max-h-72 overflow-y-auto">
              {recentAlerts.map(a => (
                <div key={a.id} className="py-sm flex items-center gap-sm">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${a.severity === 'critical' || a.severity === 'high' ? 'bg-error' : a.severity === 'medium' ? 'bg-secondary' : 'bg-tertiary-fixed'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-primary truncate">{a.student_name}</p>
                    <p className="text-xs text-on-surface-variant">{a.event_type.replace(/_/g, ' ')} • {a.exam_title}</p>
                  </div>
                  <span className={`pill text-xs shrink-0 ${a.severity === 'critical' ? 'bg-error text-white' : a.severity === 'high' ? 'bg-error-container text-error' : a.severity === 'medium' ? 'bg-secondary-fixed text-secondary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                    {a.severity}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant py-md">No recent alerts.</p>
          )}
        </section>

        <section className="col-span-6 card p-md">
          <h2 className="text-xl font-bold text-primary mb-md">Recent Activity</h2>
          {loading ? (
            <div className="space-y-md py-md">
              {[1,2,3].map(i => <div key={i} className="animate-pulse flex items-center gap-sm"><div className="w-8 h-8 bg-surface-container-high rounded-lg shrink-0" /><div className="flex-1 space-y-xs"><div className="h-4 bg-surface-container-high rounded w-2/5" /><div className="h-3 bg-surface-container-high rounded w-1/3" /></div></div>)}
            </div>
          ) : activities?.length > 0 ? (
            <div className="divide-y divide-outline-variant max-h-72 overflow-y-auto">
              {activities.map(a => (
                <div key={a.id} className="py-sm flex items-center gap-sm">
                  <div className="w-8 h-8 rounded-lg bg-surface-container-high grid place-items-center shrink-0">
                    <Icon className="text-sm text-on-surface-variant">{a.action === 'login' ? 'login' : a.action === 'logout' ? 'logout' : a.action === 'signup' ? 'person_add' : a.action === 'created' ? 'add' : a.action === 'update' ? 'edit' : 'history'}</Icon>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-primary capitalize">{a.action.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-on-surface-variant">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant py-md">No recent activity.</p>
          )}
        </section>
      </div>
    </TeacherShell>
  )
}
