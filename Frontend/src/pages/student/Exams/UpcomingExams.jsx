import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import StudentLayout from '../../../components/StudentLayout.jsx';
import Icon from '../../../components/Icon.jsx';
import { examService } from '../../../services/examService.js';
import { authService } from '../../../services/authService.js';

export default function UpcomingExams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completion, setCompletion] = useState(null);

  useEffect(() => {
    examService.getMyExams()
      .then(assignments => {
        const exams = assignments
          .filter(a => a.status === 'assigned' || a.status === 'started')
          .map(a => a.exam)
          .filter(Boolean);
        setExams(exams);
      })
      .catch(() => setExams([]))
      .finally(() => setLoading(false));
    authService.getProfileCompletion()
      .then(setCompletion)
      .catch(() => setCompletion(null));
  }, []);

  function handleExamClick(exam) {
    if (completion && !completion.is_complete) {
      return;
    }
    localStorage.setItem('active_exam_id', exam.id);
    localStorage.removeItem('session_token');
    localStorage.removeItem('offline_package');
    navigate('/student/exams/instructions');
  }

  return (
    <StudentLayout title="Upcoming Exams">
      <div className="p-gutter max-w-container-max mx-auto">
        <h2 className="text-headline-md font-bold text-primary mb-lg">Upcoming & Live Exams</h2>

        {completion && !completion.is_complete && (
          <div className="mb-lg rounded-xl bg-secondary-container border border-secondary p-md">
            <div className="flex items-start gap-md">
              <Icon name="error_outline" className="text-secondary text-xl mt-1" />
              <div className="flex-1">
                <p className="text-label-md font-bold text-secondary mb-xs">Profile Incomplete</p>
                <p className="text-body-sm text-on-secondary-container mb-sm">
                  Complete your profile before accessing exams. Missing: {completion.missing_fields.join(', ')}.
                </p>
                <div className="h-2 w-full bg-white/30 rounded-full overflow-hidden mb-sm max-w-xs">
                  <div className="h-full bg-secondary rounded-full" style={{ width: `${completion.percentage}%` }} />
                </div>
                <Link
                  to="/student/profile"
                  className="inline-flex h-9 px-md items-center bg-secondary text-white rounded-lg text-label-sm font-bold hover:opacity-90 gap-xs"
                >
                  <Icon name="person" /> Complete Profile
                </Link>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-xl text-on-surface-variant">Loading exams...</div>
        ) : exams.length === 0 ? (
          <div className="text-center py-xl">
            <Icon name="assignment" className="text-on-surface-variant text-[48px] mb-md" />
            <h3 className="text-headline-sm text-primary font-bold mb-xs">No Exams Scheduled</h3>
            <p className="text-on-surface-variant">Your exam schedule will appear here once assigned.</p>
            <Link to="/student/dashboard" className="mt-md inline-flex h-11 px-lg items-center bg-primary text-on-primary rounded-lg font-bold hover:opacity-90">
              Back to Dashboard
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-md">
            {exams.map(exam => (
              <div key={exam.id} className="bg-surface border border-outline-variant rounded-xl p-md">
                <div className="flex items-start justify-between mb-sm">
                  <h3 className="text-lg font-bold text-primary">{exam.title}</h3>
                  <span className={`pill text-xs font-bold ${exam.status === 'active' ? 'bg-error-container text-error' : 'bg-surface-container-high text-on-surface-variant'}`}>
                    {exam.status === 'active' ? 'LIVE' : 'Scheduled'}
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant mb-xs">{exam.subject}</p>
                <p className="text-sm text-on-surface-variant">{new Date(exam.start_time).toLocaleString()} • {exam.duration_minutes} min</p>
                <p className="text-sm text-on-surface-variant mb-md">{exam.total_marks} marks</p>
                <button
                  onClick={() => handleExamClick(exam)}
                  className={`inline-flex h-10 px-md items-center rounded-lg text-sm font-bold ${
                    completion && !completion.is_complete
                      ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                      : 'bg-primary text-on-primary hover:opacity-90'
                  }`}
                  disabled={completion && !completion.is_complete}
                >
                  {completion && !completion.is_complete ? (
                    <><Icon name="lock" className="mr-xs" /> Profile Required</>
                  ) : exam.status === 'active' ? 'Start Exam' : 'View Details'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
