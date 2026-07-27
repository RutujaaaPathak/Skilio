import { useState, useEffect, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import StudentLayout from '../../../components/StudentLayout.jsx';
import PageFooter from '../../../components/PageFooter.jsx';
import Icon from '../../../components/Icon.jsx';
import { examService } from '../../../services/examService.js';
import { authService } from '../../../services/authService.js';
import { useAuth } from '../../../context/AuthContext.jsx';

function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-surface-container-high rounded-xl ${className}`} />
  );
}

const StatCard = memo(function StatCard({ label, value, subtitle, icon, color }) {
  return (
    <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
      <div className="flex items-center gap-sm mb-xs">
        <Icon name={icon} className={`${color || 'text-primary'}`} />
        <p className="text-label-md text-on-surface-variant">{label}</p>
      </div>
      <div className="flex items-end gap-sm">
        <span className="text-display text-primary font-bold">{value}</span>
        {subtitle && (
          <span className="text-label-sm px-xs py-1 rounded mb-2 bg-surface-container text-on-surface-variant">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
});

const ExamCard = memo(function ExamCard({ exam, compact }) {
  const startDate = new Date(exam.start_time);
  const now = new Date();
  const diffMs = startDate - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  let statusBadge;
  if (exam.status === 'active') {
    statusBadge = <span className="text-label-xs bg-error text-on-error px-xs py-0.5 rounded-full font-bold animate-pulse">LIVE</span>;
  } else if (exam.status === 'scheduled') {
    statusBadge = <span className="text-label-xs bg-secondary text-white px-xs py-0.5 rounded-full">Scheduled</span>;
  } else if (exam.status === 'completed') {
    statusBadge = <span className="text-label-xs bg-surface-container-highest text-on-surface-variant px-xs py-0.5 rounded-full">Completed</span>;
  } else {
    statusBadge = null;
  }

  const timeStr = startDate.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  if (compact) {
    return (
      <div className="border border-outline-variant rounded-xl p-md bg-surface-container-lowest">
        <div className="flex items-center justify-between mb-xs">
          <p className="font-bold text-primary">{exam.title}</p>
          {statusBadge}
        </div>
        <p className="text-sm text-on-surface-variant">{exam.subject} &bull; {timeStr}</p>
        <p className="text-sm text-on-surface-variant">{exam.duration_minutes} min &bull; {exam.total_marks} marks</p>
        {diffDays > 0 && (
          <p className="text-label-sm text-secondary font-bold mt-xs">
            {diffDays}d {diffHours}h remaining
          </p>
        )}
        <Link
          to="/student/exams/instructions"
          className="mt-sm inline-flex h-9 px-md items-center border border-outline-variant rounded-lg text-sm font-bold text-primary hover:bg-surface-container-high"
        >
          View Details
        </Link>
      </div>
    );
  }

  return (
    <div className="p-gutter flex items-center justify-between">
      <div>
        <div className="flex items-center gap-sm">
          <p className="font-bold text-primary">{exam.title}</p>
          {statusBadge}
        </div>
        <p className="text-sm text-on-surface-variant">
          {exam.subject} &bull; {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {exam.duration_minutes} min
        </p>
      </div>
      <Link
        to="/student/exams/instructions"
        className="h-10 px-md bg-primary text-on-primary rounded-lg text-sm font-bold flex items-center hover:opacity-90"
      >
        Start
      </Link>
    </div>
  );
});

export default function StudentDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [results, setResults] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [motivation] = useState(() => {
    const quotes = [
      { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
      { text: "Education is the most powerful weapon you can use to change the world.", author: "Nelson Mandela" },
      { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
      { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
      { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
      { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
      { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
      { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
      { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
      { text: "Your attitude, not your aptitude, will determine your altitude.", author: "Zig Ziglar" },
      { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
      { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
      { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
      { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
      { text: "Strive for progress, not perfection.", author: "Unknown" },
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      examService.getMyExams(),
      examService.getMyResults().catch(() => []),
      examService.getPracticeRecommendations().catch(() => null),
      examService.getAiInsights().catch(() => null),
      authService.getProfileCompletion().catch(() => null),
    ])
      .then(([data, res, rec, ai, comp]) => {
        if (cancelled) return;
        setAssignments(data || []);
        setResults(res || []);
        setRecommendations(rec);
        setAiInsights(ai);
        setCompletion(comp);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load dashboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const completed = assignments.filter((a) => a.status === 'submitted').length;
    const inProgress = assignments.filter((a) => a.status === 'started').length;
    const pending = assignments.filter((a) => a.status === 'assigned').length;
    return { completed, inProgress, pending, total: assignments.length };
  }, [assignments]);

  const voiceVerificationExams = useMemo(
    () =>
      assignments
        .filter((a) => {
          const e = a.exam;
          return e && e.voice_verification_enabled && (e.status === 'scheduled' || e.status === 'active');
        })
        .map((a) => a.exam)
        .slice(0, 3),
    [assignments]
  );

  const tasks = useMemo(() => {
    const pendingExams = assignments.filter((a) => a.status === 'assigned').length;
    const missingFields = completion?.missing_fields?.length || 0;
    const total = pendingExams + missingFields;
    return { pendingExams, missingFields, total };
  }, [assignments, completion]);

  const now = new Date();
  const todayStr = now.toDateString();

  const todayExams = useMemo(
    () =>
      assignments
        .filter((a) => {
          const e = a.exam;
          return e && new Date(e.start_time).toDateString() === todayStr && e.status === 'active';
        })
        .map((a) => a.exam),
    [assignments, todayStr]
  );

  const upcoming = useMemo(
    () =>
      assignments
        .filter((a) => {
          const e = a.exam;
          if (!e) return false;
          if (e.status === 'active') return false;
          return new Date(e.start_time) > now || e.status === 'scheduled';
        })
        .map((a) => a.exam)
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time)),
    [assignments, now]
  );

  const subjectPerformance = useMemo(
    () => aiInsights?.subject_performance || [],
    [aiInsights]
  );

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const userCollege = user?.college || user?.institution?.name || '';
  const userBranch = user?.branch || user?.department?.name || '';
  const userYear = user?.year || '';

  if (error) {
    return (
      <StudentLayout title="Dashboard">
        <div className="p-gutter max-w-container-max mx-auto">
          <div role="alert" className="bg-error-container border border-error rounded-xl p-lg text-center">
            <Icon name="error" className="text-error text-4xl mb-sm" />
            <p className="text-body-md text-error font-bold mb-xs">Failed to load dashboard</p>
            <p className="text-label-md text-error mb-md">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-md py-sm bg-error text-on-error rounded-lg text-label-md font-bold hover:opacity-90"
            >
              Retry
            </button>
          </div>
        </div>
        <PageFooter />
      </StudentLayout>
    );
  }

  return (
    <StudentLayout title="Dashboard">
      <div className="p-gutter max-w-container-max mx-auto">
        {loading ? (
          <>
            <Skeleton className="h-32 w-full mb-lg" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-lg">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
              <div className="lg:col-span-4 space-y-gutter">
                <Skeleton className="h-72" />
                <Skeleton className="h-40" />
              </div>
              <div className="lg:col-span-8 space-y-gutter">
                <Skeleton className="h-48" />
                <Skeleton className="h-64" />
                <Skeleton className="h-48" />
              </div>
            </div>
          </>
        ) : (
          <>
            <section className="bg-gradient-to-br from-primary to-primary-container rounded-2xl p-gutter mb-lg text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center gap-sm mb-xs">
                  <span className="text-headline-md font-bold">{greeting}, {user?.name || 'Student'}!</span>
                  <Icon name="waving_hand" className="text-3xl" />
                </div>
                <p className="text-label-md text-white/80 mb-sm">
                  <Icon name="calendar_today" className="inline align-text-bottom mr-xs" />
                  {dateStr}
                </p>
                {(userCollege || userBranch || userYear) && (
                  <p className="text-label-md text-white/80 mb-md">
                    <Icon name="school" className="inline align-text-bottom mr-xs" />
                    {[userCollege, userBranch, userYear].filter(Boolean).join(' \u2022 ')}
                  </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-md mt-md">
                  <div className="bg-white/10 rounded-xl p-sm text-center backdrop-blur-sm">
                    <p className="text-label-sm text-white/70">Completed</p>
                    <p className="text-headline-md font-bold">{stats.completed}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-sm text-center backdrop-blur-sm">
                    <p className="text-label-sm text-white/70">In Progress</p>
                    <p className="text-headline-md font-bold">{stats.inProgress}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-sm text-center backdrop-blur-sm">
                    <p className="text-label-sm text-white/70">Pending</p>
                    <p className="text-headline-md font-bold">{stats.pending}</p>
                  </div>
                </div>
                {completion && (
                  <div className="mt-md flex items-center gap-sm bg-white/10 rounded-lg px-sm py-xs">
                    <Icon name="person" className="text-white/70" />
                    <span className="text-label-sm text-white/70">Profile:</span>
                    <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden max-w-40">
                      <div
                        className={`h-full rounded-full ${completion.is_complete ? 'bg-tertiary' : 'bg-secondary'}`}
                        style={{ width: `${completion.percentage}%` }}
                      />
                    </div>
                    <span className="text-label-sm text-white font-bold">{completion.percentage}%</span>
                  </div>
                )}
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-lg">
              <div className="md:col-span-3 bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
                <div className="flex items-start gap-sm">
                  <Icon name="auto_awesome" className="text-secondary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-label-md text-on-surface-variant mb-xs">Daily Motivation</p>
                    <p className="text-body-md text-primary font-bold italic">&ldquo;{motivation.text}&rdquo;</p>
                    <p className="text-label-sm text-on-surface-variant mt-xs">&mdash; {motivation.author}</p>
                  </div>
                </div>
              </div>
              <StatCard
                label="Completed Exams"
                value={stats.completed}
                subtitle={stats.total > 0 ? `${stats.total} total` : 'No exams yet'}
                icon="check_circle"
                color="text-tertiary"
              />
              <StatCard
                label="In Progress"
                value={stats.inProgress}
                subtitle={stats.inProgress > 0 ? 'Awaiting submission' : 'None active'}
                icon="hourglass_top"
                color="text-secondary"
              />
              <StatCard
                label="Pending"
                value={stats.pending}
                subtitle={stats.pending > 0 ? 'Awaiting start' : 'All clear'}
                icon="pending_actions"
                color="text-primary"
              />
            </section>

            {results.length > 0 && (
              <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-gutter mb-lg">
                <h3 className="text-headline-sm text-primary font-bold mb-md">Progress Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                  <div>
                    <p className="text-label-md text-on-surface-variant mb-sm">Overall Completion</p>
                    <div className="flex items-center gap-md">
                      <svg width="96" height="96" viewBox="0 0 96 96" className="shrink-0">
                        <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8"
                          className="text-surface-container-high" />
                        <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8"
                          className="text-secondary" strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - stats.completed / Math.max(stats.total, 1))}`}
                          transform="rotate(-90 48 48)" strokeLinecap="round" />
                      </svg>
                      <div>
                        <p className="text-display text-primary font-bold">
                          {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                        </p>
                        <p className="text-label-sm text-on-surface-variant">
                          {stats.completed} of {stats.total} exams completed
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-label-md text-on-surface-variant mb-sm">Score Trend</p>
                    <div className="flex items-end h-24 gap-1">
                      {results.slice(0, 7).reverse().map((r, i, arr) => {
                        const pct = r.score_percentage || 0;
                        const h = Math.max(4, (pct / 100) * 80);
                        let color;
                        if (pct >= 75) color = 'bg-tertiary';
                        else if (pct >= 40) color = 'bg-secondary';
                        else color = 'bg-error';
                        return (
                          <div key={r.exam_id} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5">
                            <span className="text-label-xs text-on-surface-variant">{Math.round(pct)}</span>
                            <div className={`w-full rounded-t ${color}`} style={{ height: `${h}px` }} title={r.exam_title} />
                            <span className="text-label-xs text-on-surface-variant truncate w-full text-center">{i + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-label-xs text-on-surface-variant text-center mt-xs">Last {Math.min(results.length, 7)} exams</p>
                  </div>
                </div>
                {aiInsights?.has_data && (
                  <div className="mt-md pt-md border-t border-outline-variant">
                    <p className="text-label-sm text-on-surface-variant">{aiInsights.overall_assessment}</p>
                  </div>
                )}
              </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
              <section className="lg:col-span-4 space-y-gutter">
                <div className="bg-primary-container p-gutter rounded-xl text-on-primary-container relative overflow-hidden">
                  <h3 className="text-headline-sm mb-md text-white font-bold">Intelligence Profile</h3>
                  {subjectPerformance.length > 0 ? (
                    subjectPerformance.map((s) => {
                      let colors;
                      if (s.status === 'strong') colors = 'from-tertiary to-tertiary-container';
                      else if (s.status === 'average') colors = 'from-secondary to-secondary-container';
                      else colors = 'from-error to-error-container';
                      return (
                        <div key={s.subject} className="mb-md">
                          <div className="flex justify-between mb-xs">
                            <span className="text-label-md text-on-primary-fixed-variant">{s.subject}</span>
                            <span className="text-label-md text-white font-bold">{s.average_score}%</span>
                          </div>
                          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${colors} transition-all duration-700`}
                              style={{ width: `${s.average_score}%` }}
                            />
                          </div>
                          <span className="text-label-xs text-white/50 mt-0.5 block capitalize">{s.status} &middot; {s.exams_taken} exam{s.exams_taken !== 1 ? 's' : ''}</span>
                        </div>
                      );
                    })
                  ) : stats.completed > 0 ? (
                    ['Logical Reasoning', 'Quantitative Aptitude', 'Verbal Ability'].map((name) => (
                      <div key={name} className="mb-md">
                        <div className="flex justify-between mb-xs">
                          <span className="text-label-md text-on-primary-fixed-variant">{name}</span>
                          <span className="text-label-md text-white">—</span>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full w-0 bg-secondary-container" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-lg">
                      <Icon name="insights" className="text-4xl text-white/30 mb-sm" />
                      <p className="text-label-md text-white/60">Complete exams to unlock your AI intelligence profile</p>
                    </div>
                  )}
                  <div className="mt-lg p-sm bg-white/5 rounded-lg border border-white/10">
                    {subjectPerformance.length > 0 && aiInsights?.insights?.length > 0 ? (
                      <ul className="space-y-1">
                        {aiInsights.insights.slice(0, 3).map((insight, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <span className={`shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${
                              insight.severity === 'positive' ? 'bg-tertiary' :
                              insight.severity === 'warning' ? 'bg-error' : 'bg-white/50'
                            }`} />
                            <span className="text-label-sm text-white/80">{insight.message}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-label-sm italic text-white/70">
                        {stats.completed > 0
                          ? 'Complete more exams for deeper AI analysis.'
                          : 'Profile data will appear once exams are completed.'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
                  <div className="flex items-center gap-sm mb-sm">
                    <Icon name="task_alt" className="text-secondary" />
                    <h3 className="text-label-md font-bold text-primary">Today's Tasks</h3>
                  </div>
                  {tasks.total === 0 ? (
                    <div className="text-center py-md">
                      <Icon name="check_circle" className="text-2xl text-tertiary mb-xs" />
                      <p className="text-label-sm text-on-surface-variant">All caught up!</p>
                    </div>
                  ) : (
                    <ul className="space-y-sm">
                      {tasks.pendingExams > 0 && (
                        <li className="flex items-center justify-between">
                          <div className="flex items-center gap-sm">
                            <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
                            <span className="text-label-sm text-on-surface">Pending exams</span>
                          </div>
                          <span className="text-label-sm font-bold text-secondary">{tasks.pendingExams}</span>
                        </li>
                      )}
                      {tasks.missingFields > 0 && (
                        <li className="flex items-center justify-between">
                          <div className="flex items-center gap-sm">
                            <span className="w-2 h-2 rounded-full bg-error shrink-0" />
                            <span className="text-label-sm text-on-surface">Profile incomplete</span>
                          </div>
                          <span className="text-label-sm font-bold text-error">{tasks.missingFields}</span>
                        </li>
                      )}
                    </ul>
                  )}
                  {tasks.missingFields > 0 && (
                    <Link
                      to="/student/profile"
                      className="mt-sm inline-flex text-label-sm text-secondary font-bold hover:underline"
                    >
                      Complete profile &rarr;
                    </Link>
                  )}
                </div>

                {voiceVerificationExams.length > 0 && (
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
                    <div className="flex items-center gap-sm mb-sm">
                      <Icon name="mic" className="text-secondary" />
                      <h3 className="text-label-md font-bold text-primary">Voice Verification</h3>
                    </div>
                    <p className="text-label-sm text-on-surface-variant mb-sm">
                      {voiceVerificationExams.length} upcoming exam(s) require voice verification
                    </p>
                    <ul className="space-y-xs mb-sm">
                      {voiceVerificationExams.map((e) => (
                        <li key={e.id} className="text-label-sm text-on-surface truncate">
                          &bull; {e.title}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/student/exams"
                      className="inline-flex text-label-sm text-secondary font-bold hover:underline"
                    >
                      Prepare now &rarr;
                    </Link>
                  </div>
                )}
              </section>

              <section className="lg:col-span-8 flex flex-col gap-gutter">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                  <div className="bg-primary px-gutter py-md flex justify-between items-center">
                    <h3 className="text-headline-sm text-white font-bold">Today's Exams</h3>
                    <span className="text-label-sm bg-secondary text-white px-md py-xs rounded-full">
                      {todayExams.length} exam(s)
                    </span>
                  </div>
                  <div className="divide-y divide-outline-variant">
                    {todayExams.length === 0 ? (
                      <div className="p-gutter text-center text-on-surface-variant text-sm">
                        <Icon name="event_busy" className="text-2xl mb-xs opacity-50" />
                        <p>No exams scheduled for today.</p>
                      </div>
                    ) : (
                      todayExams.map((exam) => <ExamCard key={exam.id} exam={exam} />)
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-md">
                    <h3 className="text-headline-sm text-primary font-bold">Upcoming Exams</h3>
                    {upcoming.length > 4 && (
                      <Link
                        to="/student/exams"
                        className="text-label-md text-secondary font-bold hover:underline"
                      >
                        View all ({upcoming.length})
                      </Link>
                    )}
                  </div>
                  {upcoming.length === 0 ? (
                    <div className="text-center text-on-surface-variant text-sm py-md bg-surface-container-lowest rounded-xl border border-outline-variant">
                      <Icon name="calendar_month" className="text-2xl mb-xs opacity-50" />
                      <p>No upcoming exams.</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-md">
                      {upcoming.slice(0, 4).map((exam) => (
                        <ExamCard key={exam.id} exam={exam} compact />
                      ))}
                    </div>
                  )}
                </div>

                {results.length > 0 && (
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                    <div className="bg-primary px-gutter py-md">
                      <h3 className="text-headline-sm text-white font-bold">Recent Results</h3>
                    </div>
                    <div className="divide-y divide-outline-variant">
                      {results.slice(0, 5).map((r) => {
                        const pct = r.score_percentage;
                        let colorClass = 'bg-error';
                        let textColor = 'text-error';
                        if (pct >= 75) { colorClass = 'bg-tertiary'; textColor = 'text-tertiary'; }
                        else if (pct >= 40) { colorClass = 'bg-secondary'; textColor = 'text-secondary'; }
                        return (
                          <div key={r.exam_id} className="p-gutter flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-primary truncate">{r.exam_title}</p>
                              <p className="text-sm text-on-surface-variant">{r.exam_subject}</p>
                            </div>
                            <div className="text-right ml-md shrink-0">
                              <p className={`text-headline-md font-bold ${textColor}`}>
                                {pct != null ? `${Math.round(pct)}%` : '—'}
                              </p>
                              <p className="text-label-sm text-on-surface-variant">
                                {r.correct_count}/{r.total_questions} correct
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {recommendations?.has_data && recommendations.recommendations.length > 0 && (
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
                    <div className="flex items-center gap-sm mb-md">
                      <Icon name="school" className="text-secondary" />
                      <h3 className="text-headline-sm text-primary font-bold">Practice Recommendations</h3>
                    </div>
                    {recommendations.weak_subjects.length > 0 && (
                      <div className="mb-sm p-sm bg-error-container rounded-lg">
                        <p className="text-label-sm text-error font-bold">
                          Focus needed: {recommendations.weak_subjects.join(', ')}
                        </p>
                      </div>
                    )}
                    <div className="space-y-md">
                      {recommendations.recommendations.map((rec) => {
                        let barColor;
                        if (rec.status === 'weak') barColor = 'bg-error';
                        else if (rec.status === 'average') barColor = 'bg-secondary';
                        else barColor = 'bg-tertiary';
                        return (
                          <div key={rec.subject}>
                            <div className="flex justify-between items-center mb-xs">
                              <span className="text-label-md font-bold text-primary">{rec.subject}</span>
                              <span className={`text-label-sm font-bold ${barColor.replace('bg-', 'text-')}`}>
                                {rec.average_score}%
                              </span>
                            </div>
                            <div className="h-2 bg-surface-container-high rounded-full overflow-hidden mb-xs">
                              <div
                                className={`h-full rounded-full ${barColor}`}
                                style={{ width: `${Math.min(rec.average_score, 100)}%` }}
                              />
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {rec.suggested_focus.map((tip) => (
                                <span key={tip} className="text-label-xs bg-surface-container px-xs py-0.5 rounded text-on-surface-variant">
                                  {tip}
                                </span>
                              ))}
                            </div>
                            {rec.ai_tip && (
                              <p className="text-label-sm text-on-surface-variant italic mt-xs">
                                AI tip: {rec.ai_tip}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
      <PageFooter />
    </StudentLayout>
  );
}
