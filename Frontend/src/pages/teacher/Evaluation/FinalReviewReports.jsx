import { useState, useEffect } from 'react'
import TeacherShell, { Icon } from '../../../components/TeacherShell.jsx'
import { evaluationService } from '../../../services/evaluationService.js'

export default function FinalReviewReports({ page, setPage }) {
  const [examId, setExamId] = useState(null)
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState(null)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    const id = localStorage.getItem('active_exam_id')
    if (id) setExamId(parseInt(id))
  }, [])

  useEffect(() => {
    if (!examId) return
    setLoading(true)
    setError(null)
    evaluationService.getFullReport(examId)
      .then(setReport)
      .catch(err => setError(err?.detail || 'Failed to load report'))
      .finally(() => setLoading(false))
  }, [examId])

  const handlePublish = async () => {
    if (!examId || !report?.summary) return
    setPublishing(true)
    try {
      const result = await evaluationService.publishResults(examId, true)
      setPublishSuccess(true)
      setShowConfirm(false)
      setReport({
        ...report,
        summary: { ...report.summary, results_published: true, published_at: result.published_at },
      })
    } catch (err) {
      setError(err?.detail || 'Failed to publish results')
    } finally {
      setPublishing(false)
    }
  }

  const summary = report?.summary
  const scoreDist = report?.score_distribution
  const questionAnalytics = report?.question_analytics || []
  const topicAnalytics = report?.topic_analytics || []
  const difficultyAnalytics = report?.difficulty_analytics || []
  const bloomsAnalytics = report?.blooms_analytics || []

  const maxDistValue = scoreDist ? Math.max(
    scoreDist.range_0_20, scoreDist.range_21_40, scoreDist.range_41_60,
    scoreDist.range_61_80, scoreDist.range_81_100, 1
  ) : 1

  const maxQuestionPct = Math.max(...questionAnalytics.map(q => q.correct_pct), 1)

  if (error) {
    return <TeacherShell page={page} setPage={setPage} title="Final Review & Reports">
      <div className="max-w-3xl mx-auto py-xxl text-center">
        <Icon className="text-5xl text-error mb-md">error</Icon>
        <p className="text-xl font-bold text-error mb-sm">{error}</p>
        <button onClick={() => setPage('evaluationDashboard')} className="btn-primary px-md py-sm mt-md">Back to Dashboard</button>
      </div>
    </TeacherShell>
  }

  if (loading) {
    return <TeacherShell page={page} setPage={setPage} title="Final Review & Reports">
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    </TeacherShell>
  }

  return <TeacherShell page={page} setPage={setPage} title="Final Review & Reports">
    <div className="max-w-[1280px] w-full mx-auto">
      <section className="relative rounded-xl overflow-hidden mb-xl h-40 flex items-center bg-gradient-to-r from-primary to-primary/80">
        <div className="relative z-10 px-xl flex flex-col gap-base">
          <div className="flex items-center gap-sm text-primary-fixed">
            <Icon className="text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>stars</Icon>
            <span className="text-label-sm font-bold tracking-widest uppercase">
              {summary?.results_published ? 'Results Published' : 'System Finalized'}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-on-primary-container">Evaluation Complete</h2>
          <p className="text-body-sm text-primary-fixed opacity-90 max-w-2xl">
            {summary?.results_published
              ? `Results were published on ${summary.published_at ? new Date(summary.published_at).toLocaleString() : 'recently'}.`
              : `The summary report for ${summary?.exam_title || 'this exam'} has been generated. Review the metrics below before publishing.`}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-lg mb-xl">
        <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant shadow-sm">
          <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-sm">Avg Score</p>
          <h3 className="text-3xl md:text-4xl font-bold text-primary">{summary?.avg_score || 0}</h3>
          <div className="flex items-center gap-xs text-green-600 mt-md">
            <Icon className="text-sm">trending_up</Icon>
            <span className="text-label-sm font-medium">Overall performance</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant shadow-sm">
          <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-md">Score Range</p>
          <div className="flex justify-between items-center mb-sm">
            <span className="text-label-md text-on-surface-variant">Highest</span>
            <span className="text-xl font-bold text-on-surface">{summary?.highest_score || 0}</span>
          </div>
          <div className="h-1.5 bg-surface-variant rounded-full relative mb-sm">
            <div className="absolute h-full bg-primary rounded-full" style={{ left: `${summary?.lowest_score || 0}%`, right: `${100 - (summary?.highest_score || 100)}%` }}></div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-label-md text-on-surface-variant">Lowest</span>
            <span className="text-xl font-bold text-on-surface">{summary?.lowest_score || 0}</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant shadow-sm border-l-4 border-l-secondary">
          <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-sm">AI Assisted</p>
          <div className="flex items-baseline gap-sm">
            <h3 className="text-3xl md:text-4xl font-bold text-on-surface">{summary?.ai_assisted_count || 0}</h3>
            <span className="text-body-md text-on-surface-variant">questions</span>
          </div>
          <div className="mt-md px-sm py-xs bg-secondary-container/30 rounded-lg inline-flex items-center gap-xs">
            <Icon className="text-sm text-secondary">auto_awesome</Icon>
            <span className="text-label-sm font-medium text-on-secondary-container">Automated Grading</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant shadow-sm border-l-4 border-l-error">
          <p className="text-label-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-sm">Flagged Items</p>
          <div className="flex items-baseline gap-sm">
            <h3 className="text-3xl md:text-4xl font-bold text-error">{summary?.flagged_count || 0}</h3>
            <span className="text-body-md text-error opacity-70">Requires review</span>
          </div>
          <p className="text-label-sm text-on-surface-variant mt-md italic">
            {summary?.flagged_count > 0 ? 'Unresolved items prevent instant publishing.' : 'No flagged items.'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg mb-xl">
        <div className="lg:col-span-7 bg-surface-container-lowest p-xl rounded-xl border border-outline-variant shadow-sm">
          <div className="flex justify-between items-center mb-xl">
            <div>
              <h4 className="text-xl font-bold text-on-surface">Class Performance</h4>
              <p className="text-body-sm text-on-surface-variant">Distribution of scores across current cohort.</p>
            </div>
            <div className="text-right">
              <span className="text-3xl md:text-4xl font-bold text-primary">{summary?.pass_rate || 0}%</span>
              <p className="text-label-sm font-semibold text-on-surface-variant uppercase">Pass Rate</p>
            </div>
          </div>
          {scoreDist && (
            <>
              <div className="flex items-end gap-md h-40 mt-xl">
                {[
                  { label: '0-20', value: scoreDist.range_0_20, color: 'bg-error' },
                  { label: '21-40', value: scoreDist.range_21_40, color: 'bg-tertiary' },
                  { label: '41-60', value: scoreDist.range_41_60, color: 'bg-primary' },
                  { label: '61-80', value: scoreDist.range_61_80, color: 'bg-primary' },
                  { label: '81-100', value: scoreDist.range_81_100, color: 'bg-green-500' },
                ].map((bucket, i) => {
                  const heightPct = Math.max((bucket.value / maxDistValue) * 100, 2)
                  return <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-xs group relative">
                    <span className="text-label-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">{bucket.value}</span>
                    <div className={`w-full rounded-t-lg transition-all hover:opacity-80 ${bucket.color}`} style={{ height: `${heightPct}%` }}></div>
                  </div>
                })}
              </div>
              <div className="flex justify-between mt-sm border-t border-outline-variant pt-sm">
                <span className="text-label-sm text-on-surface-variant">0-20</span>
                <span className="text-label-sm text-on-surface-variant">21-40</span>
                <span className="text-label-sm text-on-surface-variant">41-60</span>
                <span className="text-label-sm text-on-surface-variant">61-80</span>
                <span className="text-label-sm text-on-surface-variant">81-100</span>
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-5 bg-surface-container-lowest p-xl rounded-xl border border-outline-variant shadow-sm">
          <h4 className="text-xl font-bold text-on-surface mb-xl">Question Performance</h4>
          {questionAnalytics.length === 0 ? (
            <p className="text-on-surface-variant text-sm italic">No question data available.</p>
          ) : (
            <div className="space-y-lg">
              {questionAnalytics.slice(0, 6).map(q => (
                <div key={q.question_id}>
                  <div className="flex justify-between mb-xs">
                    <span className="text-label-md font-medium text-on-surface truncate mr-sm">Q{q.order_index}: {q.question_text?.slice(0, 30)}{q.question_text?.length > 30 ? '...' : ''}</span>
                    <span className={`text-label-md font-bold ${q.correct_pct < 50 ? 'text-error' : 'text-primary'}`}>{q.correct_pct}%</span>
                  </div>
                  <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${q.correct_pct < 50 ? 'bg-error' : 'bg-primary'}`} style={{ width: `${(q.correct_pct / maxQuestionPct) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {questionAnalytics.length > 0 && (
            <div className="mt-xl p-md bg-surface-container-low rounded-lg border border-outline-variant/50">
              <p className="text-body-sm text-on-surface-variant italic">
                {questionAnalytics.filter(q => q.correct_pct < 50).length > 0
                  ? `Tip: ${questionAnalytics.filter(q => q.correct_pct < 50).length} question(s) have performance below 50%. Consider reviewing question wording.`
                  : 'All questions performed well.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {bloomsAnalytics.length > 0 && (
        <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant shadow-sm mb-xl">
          <div className="flex justify-between items-end mb-xl">
            <div>
              <h4 className="text-xl font-bold text-on-surface">Bloom's Taxonomy Distribution</h4>
              <p className="text-body-sm text-on-surface-variant">Cognitive level breakdown of assessment items.</p>
            </div>
            <div className="flex gap-lg">
              <div className="flex items-center gap-xs">
                <div className="w-3 h-3 bg-primary-container rounded-full"></div>
                <span className="text-label-sm">High Cognitive</span>
              </div>
              <div className="flex items-center gap-xs">
                <div className="w-3 h-3 bg-secondary-container rounded-full"></div>
                <span className="text-label-sm">Standard</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-lg">
            {bloomsAnalytics.map((b, i) => (
              <div key={b.level} className="p-lg bg-surface-container-lowest border border-outline-variant rounded-xl flex flex-col items-center text-center gap-md hover:border-primary transition-colors cursor-default">
                <span className="text-label-md font-bold text-primary">{b.level}</span>
                <div className={`w-24 h-24 rounded-full border-8 flex items-center justify-center ${i === 0 ? 'border-primary-fixed' : i === 1 ? 'border-primary' : i === 2 ? 'border-secondary' : 'border-tertiary-container'}`}>
                  <span className="text-xl font-bold">{b.performance_pct}%</span>
                </div>
                <p className="text-body-sm text-on-surface-variant">{b.question_count} question(s)</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-xl">
        {topicAnalytics.length > 0 && (
          <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant shadow-sm">
            <h4 className="text-xl font-bold text-on-surface mb-lg">Topic Performance</h4>
            <div className="space-y-md">
              {topicAnalytics.map(t => (
                <div key={t.topic}>
                  <div className="flex justify-between mb-xs">
                    <span className="text-label-md text-on-surface">{t.topic}</span>
                    <span className={`text-label-md font-bold ${t.performance_pct < 50 ? 'text-error' : 'text-primary'}`}>{t.performance_pct}%</span>
                  </div>
                  <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${t.performance_pct < 50 ? 'bg-error' : 'bg-primary'}`} style={{ width: `${t.performance_pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {difficultyAnalytics.length > 0 && (
          <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant shadow-sm">
            <h4 className="text-xl font-bold text-on-surface mb-lg">Difficulty Analysis</h4>
            <div className="space-y-md">
              {difficultyAnalytics.map(d => (
                <div key={d.difficulty}>
                  <div className="flex justify-between mb-xs">
                    <span className="text-label-md text-on-surface capitalize">{d.difficulty}</span>
                    <span className="text-label-md font-bold text-primary">{d.performance_pct}%</span>
                  </div>
                  <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${d.performance_pct}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="flex flex-col md:flex-row justify-end items-center gap-xl border-t border-outline-variant pt-xl">
        {summary?.flagged_count > 0 && (
          <div className="flex items-center gap-sm text-error">
            <Icon className="text-md">warning</Icon>
            <span className="text-label-md font-medium">{summary.flagged_count} flagged items require review before final submission</span>
          </div>
        )}
        {summary?.results_published ? (
          <div className="flex items-center gap-md text-green-600 bg-green-50 px-xl py-md rounded-xl">
            <Icon className="text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</Icon>
            <span className="font-bold">Results Published</span>
          </div>
        ) : showConfirm ? (
          <div className="flex items-center gap-md">
            <span className="text-label-md text-on-surface-variant">Publish results for all students?</span>
            <button onClick={handlePublish} disabled={publishing}
              className="bg-primary text-on-primary px-xl py-md rounded-xl font-bold shadow-lg hover:shadow-primary/20 transition-all active:scale-95 flex items-center gap-md disabled:opacity-50">
              {publishing ? 'Publishing...' : 'Confirm Publish'}
              <Icon>send</Icon>
            </button>
            <button onClick={() => setShowConfirm(false)} className="text-on-surface-variant hover:text-on-surface font-label-md">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setShowConfirm(true)} disabled={summary?.flagged_count > 0}
            className={`bg-primary text-on-primary px-xl py-md rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center gap-md ${summary?.flagged_count > 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-primary/20'}`}>
            <span>Publish Results</span>
            <Icon>send</Icon>
          </button>
        )}
      </footer>
    </div>
  </TeacherShell>
}
