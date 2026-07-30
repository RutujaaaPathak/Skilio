import { useState, useEffect, useCallback, useMemo } from 'react'
import TeacherShell, { Icon, StatCard } from '../../../components/TeacherShell.jsx'
import { examService } from '../../../services/examService.js'
import { teacherService } from '../../../services/teacherService.js'

export default function Reports({ page, setPage }) {
  const [exams, setExams] = useState([])
  const [performance, setPerformance] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [trends, setTrends] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subjectFilter, setSubjectFilter] = useState('')

  const subjects = useMemo(() => {
    const s = new Set(exams.map(e => e.subject).filter(Boolean))
    return ['', ...Array.from(s).sort()]
  }, [exams])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const qs = subjectFilter ? `?subject=${encodeURIComponent(subjectFilter)}` : ''
      const [examsData, perfData, analyticsData, trendData] = await Promise.all([
        examService.list(),
        teacherService.getPerformance(),
        teacherService.getAnalytics(qs),
        teacherService.getTrends(),
      ])
      setExams(examsData)
      setPerformance(perfData)
      setAnalytics(analyticsData)
      setTrends(trendData)
    } catch {
      setExams([])
      setPerformance(null)
      setAnalytics(null)
      setTrends(null)
    } finally {
      setLoading(false)
    }
  }, [subjectFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const avgScore = performance?.average_score != null ? `${performance.average_score}%` : '—'
  const passRate = performance?.pass_rate != null ? `${performance.pass_rate}%` : '—'
  const integrityScore = analytics?.overall_integrity_score != null ? `${analytics.overall_integrity_score}%` : '—'
  const totalStudents = performance?.total_students ?? 0
  const atRisk = trends?.risk_distribution?.reduce((sum, r) =>
    ['high', 'critical'].includes(r.label.toLowerCase()) ? sum + r.value : sum, 0
  ) ?? '—'

  const selectedExam = (e) => {
    localStorage.setItem('active_exam_id', e.id)
    setPage('evaluationDashboard')
  }

  return (
    <TeacherShell page={page} setPage={setPage} title="Reports & Analytics">
      <div className="mb-lg">
        <span className="pill bg-secondary-fixed text-secondary">Batch Reports</span>
        <div className="flex items-center justify-between flex-wrap gap-sm">
          <div>
            <h1 className="text-4xl font-extrabold text-primary mt-sm">Performance Analytics</h1>
            <p className="text-on-surface-variant">Track batch outcomes, exam health, and AI-evaluated performance trends.</p>
          </div>
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="text-sm border border-outline-variant rounded-lg px-sm py-xs bg-surface text-on-surface focus-ring">
            <option value="">All Subjects</option>
            {subjects.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-gutter mb-lg">
        <StatCard label="Average Score" value={loading ? '—' : avgScore} icon="trending_up" />
        <StatCard label="Pass Rate" value={loading ? '—' : passRate} icon="verified" />
        <StatCard label="At Risk Students" value={loading ? '—' : String(atRisk)} icon="warning_amber" />
        <StatCard label="Integrity Score" value={loading ? '—' : integrityScore} icon="shield" />
      </div>

      <div className="bento-grid">
        <section className="col-span-8 card p-md">
          <h2 className="text-xl font-bold text-primary mb-md">Subject Performance</h2>
          {loading ? (
            <div className="grid md:grid-cols-2 gap-md">
              {[1,2,3].map(i => <div key={i} className="animate-pulse border border-outline-variant rounded-lg p-md"><div className="h-5 bg-surface-container-high rounded w-24 mb-sm" /><div className="flex justify-between mb-xs"><div className="h-3 bg-surface-container-high rounded w-16" /><div className="h-4 bg-surface-container-high rounded w-10" /></div><div className="h-2 bg-surface-container-high rounded-full mb-md" /></div>)}
            </div>
          ) : analytics?.subject_performance?.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-md">
              {analytics.subject_performance.map(s => (
                <div key={s.subject} className="border border-outline-variant rounded-lg p-md">
                  <div className="flex items-center justify-between mb-sm">
                    <p className="font-bold text-primary">{s.subject}</p>
                  </div>
                  <div className="flex justify-between items-center mb-xs">
                    <span className="text-xs text-on-surface-variant">Avg Score</span>
                    <span className="text-lg font-bold text-primary">{s.average_score != null ? `${s.average_score}%` : '—'}</span>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-2 mb-md">
                    <div className="h-2 rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min(s.average_score ?? 0, 100)}%` }} />
                  </div>
                  <div className="grid grid-cols-3 gap-xs text-xs text-center">
                    <div><p className="font-bold text-primary">{s.total_students}</p><p className="text-on-surface-variant">Students</p></div>
                    <div><p className="font-bold text-primary">{s.total_exams}</p><p className="text-on-surface-variant">Exams</p></div>
                    <div><p className={`font-bold ${s.integrity_incidents > 0 ? 'text-error' : 'text-success'}`}>{s.integrity_incidents}</p><p className="text-on-surface-variant">Issues</p></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-on-surface-variant text-sm">No subject performance data available yet.</p>
          )}
        </section>

        <section className="col-span-4 card p-md">
          <h2 className="text-xl font-bold text-primary mb-md">Export Reports</h2>
          {loading ? (
            <div className="space-y-sm">
              {[1,2,3].map(i => <div key={i} className="animate-pulse h-10 bg-surface-container-high rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-sm">
              <button onClick={() => {
                if (!analytics?.subject_performance) return
                const h = ['Subject', 'Avg Score', 'Students', 'Exams', 'Issues']
                const r = analytics.subject_performance.map(s => [s.subject, s.average_score ?? '', s.total_students, s.total_exams, s.integrity_incidents])
                const csv = [h.join(','), ...r.map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
                const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'subject_performance.csv'; a.click()
              }} disabled={!analytics?.subject_performance?.length} className="w-full p-md border border-outline-variant rounded-lg text-left hover:bg-surface-container-low disabled:opacity-40">
                <Icon className="text-primary">description</Icon>
                <p className="font-bold text-sm mt-xs">Subject Performance</p>
                <p className="text-xs text-on-surface-variant">CSV export</p>
              </button>
              <button onClick={() => {
                if (!analytics?.student_ranking?.length) return
                const h = ['Rank', 'Student', 'Avg Score', 'Exams Taken', 'Integrity']
                const r = analytics.student_ranking.map((s, i) => [i + 1, s.student_name, s.average_score ?? '', s.exams_taken, s.integrity_level ?? '—'])
                const csv = [h.join(','), ...r.map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
                const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'student_ranking.csv'; a.click()
              }} disabled={!analytics?.student_ranking?.length} className="w-full p-md border border-outline-variant rounded-lg text-left hover:bg-surface-container-low disabled:opacity-40">
                <Icon className="text-primary">leaderboard</Icon>
                <p className="font-bold text-sm mt-xs">Student Ranking</p>
                <p className="text-xs text-on-surface-variant">CSV export</p>
              </button>
            </div>
          )}
        </section>

        <section className="col-span-12 card overflow-hidden">
          <div className="flex items-center justify-between p-md border-b border-outline-variant">
            <h2 className="text-xl font-bold text-primary">Exam Results</h2>
            <span className="text-xs text-on-surface-variant">{exams.filter(e => e.status === 'completed').length} completed</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="table-th">Exam</th>
                  <th className="table-th">Subject</th>
                  <th className="table-th hidden md:table-cell">Date</th>
                  <th className="table-th">Students</th>
                  <th className="table-th hidden lg:table-cell">Submitted</th>
                  <th className="table-th">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="table-td"><div className="h-4 bg-surface-container-high rounded animate-pulse w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                ) : exams.filter(e => e.status === 'completed' || e.status === 'active').length === 0 ? (
                  <tr><td colSpan={6} className="table-td text-center text-on-surface-variant py-xl">No exam data available.</td></tr>
                ) : (
                  exams.filter(e => e.status === 'completed' || e.status === 'active').map(e => (
                    <tr key={e.id} className="hover:bg-surface-container-low border-b border-outline-variant/50">
                      <td className="table-td font-bold text-primary">{e.title}</td>
                      <td className="table-td text-on-surface-variant">{e.subject}</td>
                      <td className="table-td text-on-surface-variant hidden md:table-cell">{new Date(e.start_time).toLocaleDateString()}</td>
                      <td className="table-td">{e.total_assigned ?? '—'}</td>
                      <td className="table-td hidden lg:table-cell">{e.submitted_count ?? '—'}</td>
                      <td className="table-td">
                        <button onClick={() => selectedExam(e)} className="text-xs font-bold text-secondary hover:underline">View</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </TeacherShell>
  )
}
