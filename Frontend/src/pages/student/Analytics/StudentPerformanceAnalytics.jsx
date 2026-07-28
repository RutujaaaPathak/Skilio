import { useState, useEffect, useMemo } from 'react';
import StudentLayout from '../../../components/StudentLayout.jsx';
import Icon from '../../../components/Icon.jsx';
import { examService } from '../../../services/examService.js';

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-surface-container-high rounded-xl ${className}`} />;
}

export default function StudentPerformanceAnalytics() {
  const [loading, setLoading] = useState(true);
  const [coreAnalytics, setCoreAnalytics] = useState(null);
  const [results, setResults] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [weeklyProgress, setWeeklyProgress] = useState(null);
  const [learningStreak, setLearningStreak] = useState(null);
  const [topicMastery, setTopicMastery] = useState(null);
  const [ranking, setRanking] = useState(null);
  const [integrity, setIntegrity] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      examService.getCoreAnalytics().catch(() => null),
      examService.getMyResults().catch(() => []),
      examService.getPracticeRecommendations().catch(() => null),
      examService.getAiInsights().catch(() => null),
      examService.getWeeklyProgress().catch(() => null),
      examService.getLearningStreak().catch(() => null),
      examService.getTopicMastery().catch(() => null),
      examService.getRanking().catch(() => null),
      examService.getIntegrityBreakdown().catch(() => null),
    ])
      .then(([core, res, rec, ai, wp, streak, tm, ranking, integrity]) => {
        if (cancelled) return;
        setCoreAnalytics(core);
        setResults(res || []);
        setRecommendations(rec);
        setAiInsights(ai);
        setWeeklyProgress(wp);
        setLearningStreak(streak);
        setTopicMastery(tm);
        setRanking(ranking);
        setIntegrity(integrity);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const subjectPerformance = useMemo(
    () => aiInsights?.subject_performance || recommendations?.recommendations || [],
    [aiInsights, recommendations]
  );

  const hasData = coreAnalytics?.total_exams_completed > 0;

  if (loading) {
    return (
      <StudentLayout title="Performance Analytics">
        <div className="p-gutter max-w-container-max mx-auto space-y-gutter">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
            <Skeleton className="h-24" /><Skeleton className="h-24" />
            <Skeleton className="h-24" /><Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="Performance Analytics">
      <div className="p-gutter max-w-container-max mx-auto space-y-gutter">
        <div className="bg-gradient-to-br from-primary to-primary-container rounded-2xl p-gutter text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <h1 className="text-headline-md font-bold mb-xs">Performance Analytics</h1>
            <p className="text-label-md text-white/80">
              {hasData
                ? `${coreAnalytics.total_exams_completed} exam(s) completed · ${coreAnalytics.total_time_spent_seconds > 0 ? `${Math.round(coreAnalytics.total_time_spent_seconds / 60)} min total` : 'No time data'}`
                : 'Complete exams to unlock performance insights'}
            </p>
            {learningStreak?.has_data && learningStreak.current_streak > 0 && (
              <div className="flex items-center gap-sm mt-md bg-white/10 rounded-lg px-sm py-xs w-fit">
                <Icon name="local_fire_department" className="text-secondary" />
                <span className="text-label-sm text-white font-bold">
                  {learningStreak.current_streak} day streak
                </span>
                <span className="text-label-xs text-white/60">
                  (Best: {learningStreak.longest_streak})
                </span>
              </div>
            )}
          </div>
        </div>

        {hasData ? (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md text-center">
                <Icon name="trending_up" className="text-tertiary text-2xl mb-xs" />
                <p className="text-label-sm text-on-surface-variant">Average Score</p>
                <p className={`text-headline-lg font-bold ${
                  coreAnalytics.overall_average_score >= 75 ? 'text-tertiary' :
                  coreAnalytics.overall_average_score >= 40 ? 'text-secondary' : 'text-error'
                }`}>
                  {Math.round(coreAnalytics.overall_average_score)}%
                </p>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md text-center">
                <Icon name="stats" className="text-tertiary text-2xl mb-xs" />
                <p className="text-label-sm text-on-surface-variant">Highest Score</p>
                <p className="text-headline-lg font-bold text-tertiary">
                  {Math.round(coreAnalytics.highest_score)}%
                </p>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md text-center">
                <Icon name="trending_down" className="text-error text-2xl mb-xs" />
                <p className="text-label-sm text-on-surface-variant">Lowest Score</p>
                <p className={`text-headline-lg font-bold ${
                  coreAnalytics.lowest_score >= 40 ? 'text-secondary' : 'text-error'
                }`}>
                  {Math.round(coreAnalytics.lowest_score)}%
                </p>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md text-center">
                <Icon name="check_circle" className="text-tertiary text-2xl mb-xs" />
                <p className="text-label-sm text-on-surface-variant">Pass Rate</p>
                <p className={`text-headline-lg font-bold ${
                  coreAnalytics.pass_percentage >= 75 ? 'text-tertiary' :
                  coreAnalytics.pass_percentage >= 50 ? 'text-secondary' : 'text-error'
                }`}>
                  {Math.round(coreAnalytics.pass_percentage)}%
                </p>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
                <div className="flex items-center gap-sm mb-md">
                  <Icon name="timer" className="text-secondary" />
                  <h3 className="text-label-md font-bold text-primary">Time Overview</h3>
                </div>
                <div className="grid grid-cols-2 gap-md">
                  <div className="text-center">
                    <p className="text-display text-primary font-bold">
                      {coreAnalytics.total_time_spent_seconds > 3600
                        ? `${(coreAnalytics.total_time_spent_seconds / 3600).toFixed(1)}h`
                        : `${Math.round(coreAnalytics.total_time_spent_seconds / 60)}m`}
                    </p>
                    <p className="text-label-sm text-on-surface-variant">Total Time</p>
                  </div>
                  <div className="text-center">
                    <p className="text-display text-primary font-bold">
                      {coreAnalytics.average_time_per_exam_seconds > 60
                        ? `${Math.round(coreAnalytics.average_time_per_exam_seconds / 60)}m`
                        : `${coreAnalytics.average_time_per_exam_seconds}s`}
                    </p>
                    <p className="text-label-sm text-on-surface-variant">Avg per Exam</p>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
                <div className="flex items-center gap-sm mb-md">
                  <Icon name="assignment" className="text-secondary" />
                  <h3 className="text-label-md font-bold text-primary">Exam Summary</h3>
                </div>
                <div className="grid grid-cols-2 gap-md">
                  <div className="text-center">
                    <p className="text-display text-primary font-bold">{coreAnalytics.total_exams_completed}</p>
                    <p className="text-label-sm text-on-surface-variant">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-display text-primary font-bold">{coreAnalytics.total_exams_attempted}</p>
                    <p className="text-label-sm text-on-surface-variant">Attempted</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter">
              <h2 className="text-headline-sm text-primary font-bold mb-md">Score Trend</h2>
              {results.length > 0 ? (
                <div className="flex items-end h-32 gap-1">
                  {results.slice(0, 10).reverse().map((r) => {
                    const pct = r.score_percentage || 0;
                    const h = Math.max(4, (pct / 100) * 100);
                    let color;
                    if (pct >= 75) color = 'bg-tertiary';
                    else if (pct >= 40) color = 'bg-secondary';
                    else color = 'bg-error';
                    return (
                      <div key={r.exam_id} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5">
                        <span className="text-label-xs text-on-surface-variant">{Math.round(pct)}</span>
                        <div className={`w-full rounded-t ${color} transition-all`} style={{ height: `${h}px` }} title={`${r.exam_title}: ${Math.round(pct)}%`} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-label-sm text-on-surface-variant text-center py-lg">No results yet</p>
              )}
            </section>

            {ranking?.has_data && (ranking.institution_rank || ranking.department_rank || ranking.batch_rank || ranking.overall_rank) && (
              <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter">
                <div className="flex items-center gap-sm mb-md">
                  <Icon name="emoji_events" className="text-secondary" />
                  <h2 className="text-headline-sm text-primary font-bold">My Rankings</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
                  {[
                    { key: 'institution_rank', label: 'Institution' },
                    { key: 'department_rank', label: 'Department' },
                    { key: 'batch_rank', label: 'Batch' },
                    { key: 'overall_rank', label: 'Overall' },
                  ].map(({ key, label }) => {
                    const r = ranking[key];
                    if (!r) return null;
                    const pct = r.total_students > 0 ? ((r.total_students - r.rank + 1) / r.total_students) * 100 : 0;
                    const isTop = r.rank <= Math.ceil(r.total_students * 0.25);
                    const isMid = r.rank <= Math.ceil(r.total_students * 0.5);
                    return (
                      <div key={key} className="bg-surface-container-low rounded-xl p-md text-center border border-outline-variant">
                        <p className="text-label-xs text-on-surface-variant mb-xs">{r.label || label}</p>
                        <p className={`text-headline-md font-bold ${isTop ? 'text-tertiary' : isMid ? 'text-secondary' : 'text-error'}`}>
                          #{r.rank}
                        </p>
                        <p className="text-label-xs text-on-surface-variant">of {r.total_students}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {weeklyProgress?.has_data && weeklyProgress.weekly_progress.length > 0 && (
              <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter">
                <h2 className="text-headline-sm text-primary font-bold mb-md">Weekly Progress</h2>
                <div className="flex items-end h-32 gap-1">
                  {weeklyProgress.weekly_progress.slice(-8).map((w) => {
                    const pct = w.average_score || 0;
                    const h = Math.max(4, (pct / 100) * 100);
                    let color;
                    if (pct >= 75) color = 'bg-tertiary';
                    else if (pct >= 40) color = 'bg-secondary';
                    else color = 'bg-error';
                    return (
                      <div key={w.week_start} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5">
                        <span className="text-label-xs text-on-surface-variant">{Math.round(pct)}</span>
                        <div className={`w-full rounded-t ${color} transition-all`} style={{ height: `${h}px` }} title={`Week of ${w.week_start}: ${Math.round(pct)}%`} />
                        <span className="text-label-xs text-on-surface-variant truncate w-full text-center">{w.week_start.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {topicMastery?.has_data && topicMastery.topics.length > 0 && (
              <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter">
                <h2 className="text-headline-sm text-primary font-bold mb-md">Topic Mastery</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  {topicMastery.topics.map((t) => {
                    let barColor;
                    if (t.status === 'strong') barColor = 'bg-tertiary';
                    else if (t.status === 'average') barColor = 'bg-secondary';
                    else barColor = 'bg-error';
                    return (
                      <div key={t.topic} className="bg-surface-container-low rounded-xl p-md border border-outline-variant">
                        <div className="flex justify-between items-center mb-xs">
                          <div>
                            <p className="font-bold text-primary text-sm truncate">{t.topic}</p>
                            <p className="text-label-xs text-on-surface-variant">{t.subject}</p>
                          </div>
                          <span className={`text-label-md font-bold ${
                            t.status === 'strong' ? 'text-tertiary' :
                            t.status === 'average' ? 'text-secondary' : 'text-error'
                          }`}>
                            {t.average_score != null ? `${Math.round(t.average_score)}%` : '—'}
                          </span>
                        </div>
                        <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor} transition-all`}
                            style={{ width: `${Math.min(t.average_score || 0, 100)}%` }} />
                        </div>
                        <p className="text-label-xs text-on-surface-variant mt-1">
                          {t.correct_count}/{t.total_questions} correct
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {integrity?.has_data && (
              <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter">
                <div className="flex items-center gap-sm mb-md">
                  <Icon name="verified" className="text-secondary" />
                  <h2 className="text-headline-sm text-primary font-bold">AI Integrity Score</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-md">
                  <div className="bg-surface-container-low rounded-xl p-md text-center border border-outline-variant">
                    <p className="text-label-sm text-on-surface-variant mb-xs">Overall Integrity</p>
                    <p className={`text-headline-lg font-bold ${
                      integrity.overall_integrity >= 80 ? 'text-tertiary' :
                      integrity.overall_integrity >= 50 ? 'text-secondary' : 'text-error'
                    }`}>
                      {integrity.overall_integrity != null ? `${Math.round(integrity.overall_integrity)}%` : '—'}
                    </p>
                  </div>
                  <div className="md:col-span-2 bg-surface-container-low rounded-xl p-md border border-outline-variant">
                    <p className="text-label-sm text-on-surface-variant mb-sm font-bold">Per-Exam Integrity</p>
                    <div className="space-y-sm">
                      {integrity.integrity_by_exam.slice(0, 5).map((ie) => (
                        <div key={ie.exam_id} className="flex items-center gap-sm">
                          <span className="text-label-sm text-on-surface truncate flex-1">{ie.exam_title}</span>
                          <div className="h-1.5 w-24 bg-surface-container-high rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${
                              ie.integrity_percentage >= 80 ? 'bg-tertiary' :
                              ie.integrity_percentage >= 50 ? 'bg-secondary' : 'bg-error'
                            }`} style={{ width: `${Math.min(ie.integrity_percentage || 0, 100)}%` }} />
                          </div>
                          <span className={`text-label-xs font-bold ${
                            ie.integrity_percentage >= 80 ? 'text-tertiary' :
                            ie.integrity_percentage >= 50 ? 'text-secondary' : 'text-error'
                          }`}>
                            {ie.integrity_percentage != null ? `${Math.round(ie.integrity_percentage)}%` : '—'}
                          </span>
                          {ie.total_events > 0 && (
                            <span className="text-label-xs text-on-surface-variant">({ie.total_events} events)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {integrity.event_breakdown.length > 0 && (
                  <div className="pt-md border-t border-outline-variant">
                    <p className="text-label-sm text-on-surface-variant mb-sm font-bold">Proctor Event Breakdown</p>
                    <div className="flex flex-wrap gap-1">
                      {integrity.event_breakdown.map((ev) => (
                        <span key={`${ev.event_type}-${ev.severity}`}
                          className={`text-label-xs px-xs py-0.5 rounded ${
                            ev.severity === 'critical' || ev.severity === 'high' ? 'bg-error-container text-error' :
                            ev.severity === 'medium' ? 'bg-secondary-container text-secondary' :
                            'bg-surface-container text-on-surface-variant'
                          }`}
                        >
                          {ev.event_type.replace(/_/g, ' ')}: {ev.count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {subjectPerformance.length > 0 && (
              <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter">
                <h2 className="text-headline-sm text-primary font-bold mb-md">Subject Performance</h2>
                <div className="space-y-md">
                  {subjectPerformance.map((s) => {
                    const score = s.average_score ?? s.average_score;
                    const status = s.status || (score >= 75 ? 'strong' : score >= 40 ? 'average' : 'weak');
                    let barColor;
                    if (status === 'strong') barColor = 'bg-tertiary';
                    else if (status === 'average') barColor = 'bg-secondary';
                    else barColor = 'bg-error';
                    return (
                      <div key={s.subject}>
                        <div className="flex justify-between text-label-md mb-xs">
                          <span className="font-bold text-primary">{s.subject}</span>
                          <span className={`font-bold ${barColor.replace('bg-', 'text-')}`}>
                            {score != null ? `${Math.round(score)}%` : '—%'}
                          </span>
                        </div>
                        <div className="h-3 bg-surface-container-high rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor} transition-all duration-700`}
                            style={{ width: `${Math.min(score || 0, 100)}%` }} />
                        </div>
                        <span className="text-label-xs text-on-surface-variant mt-0.5 block capitalize">
                          {status} · {s.total_exams || s.exams_taken || 0} exam(s)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {aiInsights?.has_data && aiInsights?.insights?.length > 0 && (
              <section className="bg-primary-container rounded-2xl p-gutter text-white">
                <div className="flex items-center gap-sm mb-md">
                  <Icon name="auto_awesome" className="text-secondary" />
                  <h2 className="text-headline-sm font-bold">AI Insights</h2>
                </div>
                {aiInsights.trend_analysis && (
                  <div className="flex flex-wrap gap-1 mb-md">
                    <span className={`text-label-xs px-xs py-0.5 rounded ${
                      aiInsights.trend_analysis.direction === 'up' ? 'bg-tertiary text-white' :
                      aiInsights.trend_analysis.direction === 'down' ? 'bg-error text-white' :
                      'bg-white/10 text-white/80'
                    }`}>
                      Trend: {aiInsights.trend_analysis.direction}
                    </span>
                    <span className="text-label-xs bg-white/10 text-white/80 px-xs py-0.5 rounded">
                      Volatility: {aiInsights.trend_analysis.volatility}
                    </span>
                    {aiInsights.trend_analysis.recent_improvement != null && (
                      <span className={`text-label-xs px-xs py-0.5 rounded ${
                        aiInsights.trend_analysis.recent_improvement >= 0 ? 'bg-tertiary text-white' : 'bg-error text-white'
                      }`}>
                        {aiInsights.trend_analysis.recent_improvement >= 0 ? '+' : ''}{aiInsights.trend_analysis.recent_improvement}% recent
                      </span>
                    )}
                    {aiInsights.performance_prediction?.estimated_next_score != null && (
                      <span className="text-label-xs bg-secondary text-white px-xs py-0.5 rounded">
                        Predicted next: ~{aiInsights.performance_prediction.estimated_next_score}%
                      </span>
                    )}
                  </div>
                )}
                <p className="text-label-md text-white/80 mb-md">{aiInsights.overall_assessment}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-md">
                  <div>
                    <p className="text-label-sm text-white/70 font-bold mb-sm">Key Insights</p>
                    <ul className="space-y-sm">
                      {aiInsights.insights.slice(0, 5).map((insight, i) => (
                        <li key={i} className="flex items-start gap-sm">
                          <span className={`shrink-0 mt-1 w-2 h-2 rounded-full ${
                            insight.severity === 'positive' ? 'bg-tertiary' :
                            insight.severity === 'warning' ? 'bg-error' : 'bg-white/50'
                          }`} />
                          <span className="text-label-sm text-white/80">{insight.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {aiInsights.time_analysis && (
                    <div>
                      <p className="text-label-sm text-white/70 font-bold mb-sm">Time Analysis</p>
                      <div className="bg-white/5 rounded-xl p-md">
                        <div className="grid grid-cols-2 gap-md">
                          <div className="text-center">
                            <p className="text-display text-white font-bold">{aiInsights.time_analysis.average_time_per_exam_minutes}m</p>
                            <p className="text-label-xs text-white/60">Avg per exam</p>
                          </div>
                          <div className="text-center">
                            <p className="text-display text-white font-bold capitalize">{aiInsights.time_analysis.time_efficiency}</p>
                            <p className="text-label-xs text-white/60">Pace</p>
                          </div>
                        </div>
                        <div className="mt-sm pt-sm border-t border-white/10">
                          <p className="text-label-xs text-white/60">
                            Total: {aiInsights.time_analysis.total_time_spent_minutes}m across all exams
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {aiInsights.topic_performance?.length > 0 && (
                  <div className="pt-md border-t border-white/10">
                    <p className="text-label-sm text-white/70 font-bold mb-sm">Topic Performance</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                      {aiInsights.topic_performance.slice(0, 6).map((tp) => (
                        <div key={tp.topic} className="bg-white/5 rounded-lg p-xs">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-label-xs text-white/80 truncate">{tp.topic}</span>
                            <span className={`text-label-xs font-bold ${
                              tp.status === 'strong' ? 'text-tertiary' :
                              tp.status === 'average' ? 'text-secondary' : 'text-error'
                            }`}>
                              {tp.average_score != null ? `${Math.round(tp.average_score)}%` : '—'}
                            </span>
                          </div>
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${
                              tp.status === 'strong' ? 'bg-tertiary' :
                              tp.status === 'average' ? 'bg-secondary' : 'bg-error'
                            }`} style={{ width: `${Math.min(tp.average_score || 0, 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {recommendations?.has_data && recommendations.recommendations.length > 0 && (
              <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter">
                <div className="flex items-center gap-sm mb-md">
                  <Icon name="school" className="text-secondary" />
                  <h2 className="text-headline-sm text-primary font-bold">Recommendations</h2>
                </div>
                {recommendations.weak_subjects.length > 0 && (
                  <div className="mb-md p-sm bg-error-container rounded-lg">
                    <p className="text-label-sm text-error font-bold">
                      Focus needed: {recommendations.weak_subjects.join(', ')}
                    </p>
                  </div>
                )}
                {recommendations.performance_trajectory && (
                  <div className="grid grid-cols-3 gap-md mb-md">
                    <div className="bg-surface-container-low rounded-xl p-md text-center border border-outline-variant">
                      <p className="text-label-xs text-on-surface-variant mb-xs">Trend</p>
                      <p className={`text-label-md font-bold ${
                        recommendations.performance_trajectory.trend === 'up' ? 'text-tertiary' :
                        recommendations.performance_trajectory.trend === 'down' ? 'text-error' : 'text-secondary'
                      }`}>
                        {recommendations.performance_trajectory.trend === 'up' ? '\u2191 Improving' :
                         recommendations.performance_trajectory.trend === 'down' ? '\u2193 Declining' : '\u2192 Stable'}
                      </p>
                    </div>
                    {recommendations.performance_trajectory.improvement_rate != null && (
                      <div className="bg-surface-container-low rounded-xl p-md text-center border border-outline-variant">
                        <p className="text-label-xs text-on-surface-variant mb-xs">Improvement Rate</p>
                        <p className={`text-label-md font-bold ${recommendations.performance_trajectory.improvement_rate >= 0 ? 'text-tertiary' : 'text-error'}`}>
                          {recommendations.performance_trajectory.improvement_rate >= 0 ? '+' : ''}{recommendations.performance_trajectory.improvement_rate}/exam
                        </p>
                      </div>
                    )}
                    {recommendations.performance_trajectory.consistency_score != null && (
                      <div className="bg-surface-container-low rounded-xl p-md text-center border border-outline-variant">
                        <p className="text-label-xs text-on-surface-variant mb-xs">Consistency</p>
                        <p className="text-label-md font-bold text-primary">{recommendations.performance_trajectory.consistency_score}%</p>
                      </div>
                    )}
                  </div>
                )}
                {recommendations.topic_recommendations?.length > 0 && (
                  <div className="mb-md">
                    <p className="text-label-md text-primary font-bold mb-sm">Topic-Level Focus</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                      {recommendations.topic_recommendations.slice(0, 6).map((tr) => (
                        <div key={tr.topic} className="bg-surface-container-low rounded-lg p-sm border border-outline-variant">
                          <div className="flex justify-between items-center mb-xs">
                            <span className="text-label-sm font-bold text-primary truncate">{tr.topic}</span>
                            <span className={`text-label-xs font-bold ${
                              tr.status === 'strong' ? 'text-tertiary' :
                              tr.status === 'average' ? 'text-secondary' : 'text-error'
                            }`}>
                              {tr.average_score != null ? `${Math.round(tr.average_score)}%` : '—'}
                            </span>
                          </div>
                          <p className="text-label-xs text-on-surface-variant mb-xs">{tr.subject}</p>
                          <div className="flex flex-wrap gap-0.5">
                            {tr.suggested_focus.slice(0, 2).map((tip) => (
                              <span key={tip} className="text-label-xs bg-surface-container px-xs py-0.5 rounded text-on-surface-variant">
                                {tip}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {recommendations.time_management_tips?.length > 0 && (
                  <div className="pt-md border-t border-outline-variant">
                    <p className="text-label-sm text-primary font-bold mb-sm">Time Management</p>
                    <div className="space-y-sm">
                      {recommendations.time_management_tips.map((tmt, i) => (
                        <div key={i} className="flex items-start gap-sm">
                          <Icon name={tmt.priority === 'high' ? 'priority_high' : 'info'} className={`shrink-0 mt-0.5 text-${
                            tmt.priority === 'high' ? 'error' : 'secondary'
                          }`} />
                          <p className="text-label-sm text-on-surface-variant">{tmt.tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </>
        ) : (
          <div className="text-center py-xl bg-surface-container-lowest rounded-2xl border border-outline-variant">
            <Icon name="analytics" className="text-5xl text-on-surface-variant/30 mb-md" />
            <h3 className="text-headline-sm text-primary font-bold mb-sm">No Data Yet</h3>
            <p className="text-label-md text-on-surface-variant max-w-md mx-auto">
              Complete your first exam to see detailed performance analytics, score trends, and AI-powered insights.
            </p>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
