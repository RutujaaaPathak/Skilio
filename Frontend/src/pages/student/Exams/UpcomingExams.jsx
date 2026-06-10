import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StudentLayout from '../../../components/StudentLayout.jsx';
import Icon from '../../../components/Icon.jsx';
import { examService } from '../../../services/examService.js';

export default function UpcomingExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  return (
    <StudentLayout title="Upcoming Exams">
      <div className="p-gutter max-w-container-max mx-auto">
        <h2 className="text-headline-md font-bold text-primary mb-lg">Upcoming & Live Exams</h2>

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
                <Link
                  to="/student/exams/instructions"
                  className="inline-flex h-10 px-md items-center bg-primary text-on-primary rounded-lg text-sm font-bold hover:opacity-90"
                >
                  {exam.status === 'active' ? 'Start Exam' : 'View Details'}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
