import { useState, useEffect } from 'react'
import TeacherShell, { Icon } from '../../../components/TeacherShell.jsx'
import { evaluationService } from '../../../services/evaluationService.js'

function DashboardCard({ icon, label, children, className = '' }) {
  return <div className={`bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm ${className}`}>
    {label && <div className="flex items-center gap-sm text-secondary mb-base"><Icon className="text-[20px]">{icon}</Icon><span className="text-label-sm font-semibold">{label}</span></div>}
    {children}
  </div>
}

function EmptyState({ message, action }) {
  return <div className="flex flex-col items-center justify-center py-xxl text-center">
    <Icon className="text-5xl text-outline mb-md">assignment</Icon>
    <p className="text-on-surface-variant text-body-sm mb-md">{message}</p>
    {action}
  </div>
}

export default function EvaluationDashboard({ page, setPage }) {
  const [examId, setExamId] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [queue, setQueue] = useState([])
  const [queueTotal, setQueueTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [queueLoading, setQueueLoading] = useState(true)
  const [queuePage, setQueuePage] = useState(1)
  const [queueSearch, setQueueSearch] = useState('')
  const [queueFilter, setQueueFilter] = useState('all')
  const [error, setError] = useState(null)

  useEffect(() => {
    const id = localStorage.getItem('active_exam_id')
    if (id) setExamId(parseInt(id))
  }, [])

  useEffect(() => {
    if (!examId) return
    setLoading(true)
    setError(null)
    evaluationService.getDashboard(examId)
      .then(setDashboard)
      .catch(err => setError(err?.detail || 'Failed to load evaluation dashboard'))
      .finally(() => setLoading(false))
  }, [examId])

  useEffect(() => {
    if (!examId) return
    setQueueLoading(true)
    const params = { page: queuePage, per_page: 20, status: queueFilter }
    if (queueSearch) params.search = queueSearch
    evaluationService.getQueue(examId, params)
      .then(data => { setQueue(data.items || []); setQueueTotal(data.total || 0) })
      .catch(() => setQueue([]))
      .finally(() => setQueueLoading(false))
  }, [examId, queuePage, queueFilter, queueSearch])

  const handleStudentClick = (studentId) => {
    localStorage.setItem('active_student_id', studentId)
    setPage('evaluationWorkspace')
  }

  const handleFinalReview = () => {
    setPage('finalReview')
  }

  const statusBadge = (status) => {
    if (status === 'evaluated') return <span className="px-sm py-xs bg-green-100 text-green-700 rounded-full text-label-sm font-bold flex items-center gap-xs w-fit"><Icon className="text-[14px]">check_circle</Icon> Complete</span>
    if (status === 'flagged') return <span className="px-sm py-xs bg-error-container text-on-error-container rounded-full text-label-sm font-bold flex items-center gap-xs w-fit"><Icon className="text-[14px]">flag</Icon> Flagged</span>
    if (status === 'in_progress') return <span className="px-sm py-xs bg-secondary-container text-secondary rounded-full text-label-sm font-bold flex items-center gap-xs w-fit"><Icon className="text-[14px]">edit</Icon> In Progress</span>
    if (status === 'not_submitted') return <span className="px-sm py-xs bg-surface-container-high text-outline rounded-full text-label-sm font-bold flex items-center gap-xs w-fit"><Icon className="text-[14px]">block</Icon> Not Submitted</span>
    return <span className="px-sm py-xs bg-surface-container-high text-on-surface-variant rounded-full text-label-sm font-bold flex items-center gap-xs w-fit"><Icon className="text-[14px]">schedule</Icon> Pending</span>
  }

  const totalPages = Math.ceil(queueTotal / 20)

  return <TeacherShell page={page} setPage={setPage} title="Evaluation Dashboard">
    <div className="max-w-[1280px] w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl">
        <div>
          <div className="flex items-center gap-sm text-label-sm text-on-surface-variant mb-xs">
            <button onClick={() => setPage('reports')} className="hover:text-primary transition-colors">Exams</button>
            <Icon className="text-[14px]">chevron_right</Icon>
            <span className="text-primary font-bold">{dashboard?.exam_title || 'Loading...'}</span>
          </div>
          <h3 className="text-3xl md:text-4xl font-bold text-on-surface leading-tight tracking-tight">
            {dashboard?.exam_title || 'Exam Evaluation'}
          </h3>
          <div className="flex items-center gap-md mt-sm text-on-surface-variant font-label-md flex-wrap">
            {dashboard?.subject && <span className="flex items-center gap-xs"><Icon className="text-[18px]">book</Icon> {dashboard.subject}</span>}
            {dashboard?.class_name && <span className="flex items-center gap-xs"><Icon className="text-[18px]">groups</Icon> {dashboard.class_name}</span>}
            <span className="flex items-center gap-xs"><Icon className="text-[18px]">person</Icon> {dashboard?.total_students || 0} Students</span>
            <span className="flex items-center gap-xs"><Icon className="text-[18px]">grade</Icon> {dashboard?.total_marks || 0} Marks</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm min-w-[200px]">
          <div className="flex justify-between items-center mb-sm">
            <span className="text-label-md font-bold text-on-surface">Evaluation Progress</span>
            <span className="text-label-md font-bold text-primary">{dashboard?.progress_pct || 0}%</span>
          </div>
          <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden mb-xs">
            <div className="h-full bg-primary transition-all duration-700 rounded-full" style={{ width: `${dashboard?.progress_pct || 0}%` }}></div>
          </div>
          <p className="text-label-sm text-on-surface-variant text-right">{dashboard?.evaluated_count || 0} of {dashboard?.submitted_count || 0} graded</p>
        </div>
      </div>

      {error ? (
        <div className="card p-xl text-center">
          <Icon className="text-4xl text-error mb-md">error</Icon>
          <p className="text-error font-bold mb-sm">Failed to load dashboard</p>
          <p className="text-on-surface-variant text-sm mb-md">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary px-md py-sm">Retry</button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md mb-xl">
          {[1, 2, 3, 4].map(i => <div key={i} className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant animate-pulse"><div className="h-4 bg-surface-container-high rounded w-1/2 mb-md"></div><div className="h-8 bg-surface-container-high rounded w-1/3 mb-md"></div><div className="h-4 bg-surface-container-high rounded w-3/4"></div></div>)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md mb-xl">
            <DashboardCard icon="send" label="Submissions">
              <p className="text-2xl font-bold text-on-surface">{dashboard?.submitted_count || 0}</p>
              <div className="mt-md pt-md border-t border-outline-variant flex justify-between">
                <div><p className="text-label-sm text-outline">Evaluated</p><p className="text-label-md font-bold text-on-surface">{dashboard?.evaluated_count || 0}</p></div>
                <div className="text-right"><p className="text-label-sm text-outline">Pending</p><p className="text-label-md font-bold text-error">{dashboard?.pending_count || 0}</p></div>
              </div>
            </DashboardCard>
            <DashboardCard icon="analytics" label="Performance Avg">
              <p className="text-2xl font-bold text-on-surface">{dashboard?.avg_score || 0} <span className="text-body-sm text-outline">/ 100</span></p>
              <div className="mt-md bg-primary/5 rounded-lg p-sm">
                <p className="text-label-sm text-on-primary-fixed-variant flex items-center gap-xs">
                  <Icon className="text-[14px]">trending_up</Icon>
                  Average score across submissions
                </p>
              </div>
            </DashboardCard>
            <DashboardCard icon="batch_prediction" label="Evaluation Method">
              <div className="space-y-md">
                <div><div className="flex justify-between text-label-sm mb-xs"><span>Auto-Graded</span><span className="font-bold">{dashboard?.auto_graded_pct || 0}%</span></div><div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${dashboard?.auto_graded_pct || 0}%` }}></div></div></div>
                <div><div className="flex justify-between text-label-sm mb-xs"><span>Manual</span><span className="font-bold">{dashboard?.manual_pct || 0}%</span></div><div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden"><div className="h-full bg-secondary rounded-full" style={{ width: `${dashboard?.manual_pct || 0}%` }}></div></div></div>
              </div>
            </DashboardCard>
            <DashboardCard icon="swap_vert" label="Score Range">
              <div className="flex items-center gap-lg">
                <div><p className="text-label-sm text-outline">Highest</p><p className="text-xl font-bold text-on-surface">{dashboard?.highest_score || 0}</p></div>
                <div className="h-10 w-px bg-outline-variant"></div>
                <div><p className="text-label-sm text-outline">Lowest</p><p className="text-xl font-bold text-error">{dashboard?.lowest_score || 0}</p></div>
              </div>
            </DashboardCard>
          </div>

          <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant overflow-hidden">
            <div className="p-lg border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-md">
              <div>
                <h4 className="text-xl font-bold text-on-surface">Evaluation Queue</h4>
                <p className="text-body-sm text-outline">Review and validate student submissions</p>
              </div>
              <div className="flex items-center gap-sm flex-wrap">
                <div className="flex bg-surface-container p-1 rounded-lg">
                  {['all', 'pending', 'evaluated', 'flagged'].map(f => (
                    <button key={f} onClick={() => { setQueueFilter(f); setQueuePage(1) }}
                      className={`px-md py-xs rounded-md text-label-sm font-medium transition-colors ${queueFilter === f ? 'bg-surface-container-lowest text-primary shadow-sm' : 'text-on-surface-variant hover:text-primary'}`}>
                      {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Icon className="absolute left-2 top-1/2 -translate-y-1/2 text-outline text-sm">search</Icon>
                  <input value={queueSearch} onChange={e => { setQueueSearch(e.target.value); setQueuePage(1) }}
                    className="pl-7 pr-sm py-1 border border-outline-variant rounded-lg text-sm bg-surface-container w-36 focus:ring-primary focus:border-primary" placeholder="Search..." />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container/50 border-b border-outline-variant">
                    <th className="px-lg py-md text-label-sm text-outline uppercase tracking-wider font-bold">Student Name</th>
                    <th className="px-lg py-md text-label-sm text-outline uppercase tracking-wider font-bold">Student ID</th>
                    <th className="px-lg py-md text-label-sm text-outline uppercase tracking-wider font-bold">Auto Score</th>
                    <th className="px-lg py-md text-label-sm text-outline uppercase tracking-wider font-bold">Manual Score</th>
                    <th className="px-lg py-md text-label-sm text-outline uppercase tracking-wider font-bold">Final Score</th>
                    <th className="px-lg py-md text-label-sm text-outline uppercase tracking-wider font-bold">Status</th>
                    <th className="px-lg py-md text-label-sm text-outline uppercase tracking-wider font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {queueLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 7 }).map((_, j) => <td key={j} className="px-lg py-md"><div className="h-4 bg-surface-container-high rounded animate-pulse w-3/4" /></td>)}</tr>
                    ))
                  ) : queue.length === 0 ? (
                    <tr><td colSpan={7} className="px-lg py-xxl text-center">
                      <EmptyState message={queueSearch ? 'No students match your search.' : 'No submissions to evaluate yet.'} />
                    </td></tr>
                  ) : queue.map(s => (
                    <tr key={s.student_id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="px-lg py-md">
                        <div className="flex items-center gap-sm">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-label-sm">
                            {s.student_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                          </div>
                          <span className="font-bold text-on-surface">{s.student_name}</span>
                        </div>
                      </td>
                      <td className="px-lg py-md text-on-surface-variant">{s.student_code}</td>
                      <td className="px-lg py-md">{s.auto_score != null ? `${s.auto_score} / ${s.total_marks}` : '—'}</td>
                      <td className="px-lg py-md">{s.manual_score != null ? `${s.manual_score} / ${s.total_marks}` : <span className="text-outline italic">Pending</span>}</td>
                      <td className="px-lg py-md"><span className="font-bold">{s.final_score != null ? s.final_score : <span className="text-outline">--</span>}</span></td>
                      <td className="px-lg py-md">{statusBadge(s.status)}</td>
                      <td className="px-lg py-md">
                        {s.status === 'not_submitted' ? (
                          <span className="text-label-sm text-outline italic">No submission</span>
                        ) : s.status === 'flagged' ? (
                          <button onClick={() => handleStudentClick(s.student_id)} className="text-error hover:underline font-label-md">Check Violation</button>
                        ) : s.evaluated_count > 0 ? (
                          <button onClick={() => handleStudentClick(s.student_id)} className="text-primary hover:underline font-label-md">Review</button>
                        ) : (
                          <button onClick={() => handleStudentClick(s.student_id)} className="bg-primary text-on-primary px-md py-xs rounded-lg text-label-sm hover:opacity-90">Grade Now</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-lg bg-surface-container-lowest border-t border-outline-variant flex items-center justify-between">
              <p className="text-body-sm text-outline">Showing {queue.length} of {queueTotal} student records</p>
              <div className="flex items-center gap-sm">
                <button disabled={queuePage <= 1} onClick={() => setQueuePage(p => p - 1)}
                  className="p-sm border border-outline-variant rounded-lg disabled:opacity-30 hover:bg-surface-container transition-colors">
                  <Icon>chevron_left</Icon>
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                  const pageNum = i + 1
                  return <button key={pageNum} onClick={() => setQueuePage(pageNum)}
                    className={`px-md py-sm rounded-lg text-label-md font-medium transition-colors ${queuePage === pageNum ? 'bg-surface-container font-bold' : 'hover:bg-surface-container'}`}>
                    {pageNum}
                  </button>
                })}
                {totalPages > 5 && <span className="text-outline">...</span>}
                <button disabled={queuePage >= totalPages} onClick={() => setQueuePage(p => p + 1)}
                  className="p-sm border border-outline-variant rounded-lg disabled:opacity-30 hover:bg-surface-container transition-colors">
                  <Icon>chevron_right</Icon>
                </button>
              </div>
            </div>
          </section>

          <div className="flex justify-end mt-lg">
            <button onClick={handleFinalReview}
              className="bg-primary text-on-primary px-xl py-md rounded-xl text-headline-sm font-bold shadow-lg hover:shadow-primary/20 transition-all active:scale-95 flex items-center gap-md">
              <Icon>analytics</Icon>
              Final Review & Reports
            </button>
          </div>
        </>
      )}
    </div>
  </TeacherShell>
}
