import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import StudentLayout from '../../../components/StudentLayout.jsx';
import PageFooter from '../../../components/PageFooter.jsx';
import Icon from '../../../components/Icon.jsx';
import { examService } from '../../../services/examService.js';

export default function StudentDashboard() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examService.getMyExams()
      .then(assignments => {
        const exams = assignments.map(a => a.exam).filter(Boolean);
        setExams(exams);
      })
      .catch(() => setExams([]))
      .finally(() => setLoading(false));
  }, []);

  const todayStr = new Date().toDateString();
  const todayExams = exams.filter(e => new Date(e.start_time).toDateString() === todayStr && e.status === 'active');
  const upcoming = exams.filter(e => new Date(e.start_time).toDateString() !== todayStr || e.status === 'scheduled');

  return (
    <StudentLayout title="Candidate Overview">
      <div className="p-gutter max-w-container-max mx-auto">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-lg">
          {['Completed Exams', 'Avg Score', 'Accuracy Rate'].map((label) => (
            <div key={label} className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
              <p className="text-label-md text-on-surface-variant mb-xs">{label}</p>
              <div className="flex items-end gap-sm">
                <span className="text-display text-primary font-bold">—</span>
                <span className="text-label-sm px-xs py-1 rounded mb-2 bg-surface-container text-on-surface-variant">Awaiting data</span>
              </div>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <section className="lg:col-span-4 bg-primary-container p-gutter rounded-xl text-on-primary-container relative overflow-hidden">
            <h3 className="text-headline-sm mb-md text-white font-bold">Intelligence Profile</h3>
            {['Logical Reasoning', 'Quantitative Aptitude', 'Verbal Ability'].map((name) => (
              <div key={name} className="mb-md">
                <div className="flex justify-between mb-xs">
                  <span className="text-label-md text-on-primary-fixed-variant">{name}</span>
                  <span className="text-label-md text-white">—</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-0 bg-secondary-container" />
                </div>
              </div>
            ))}
            <div className="mt-lg p-sm bg-white/5 rounded-lg border border-white/10">
              <p className="text-label-sm italic">AI Insight: Profile data will appear once exams are completed.</p>
            </div>
          </section>

          <section className="lg:col-span-8 flex flex-col gap-gutter">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
              <div className="bg-primary px-gutter py-md flex justify-between items-center">
                <h3 className="text-headline-sm text-white font-bold">Today's Exams</h3>
                <span className="text-label-sm bg-secondary text-white px-md py-xs rounded-full">{loading ? '...' : todayExams.length + ' exam(s)'}</span>
              </div>
              <div className="divide-y divide-outline-variant">
                {loading ? (
                  <div className="p-gutter text-center text-on-surface-variant text-sm">Loading...</div>
                ) : todayExams.length === 0 ? (
                  <div className="p-gutter text-center text-on-surface-variant text-sm">No exams scheduled for today.</div>
                ) : todayExams.map(exam => (
                  <div key={exam.id} className="p-gutter flex items-center justify-between">
                    <div>
                      <p className="font-bold text-primary">{exam.title}</p>
                      <p className="text-sm text-on-surface-variant">{exam.subject} • {new Date(exam.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {exam.duration_minutes} min</p>
                    </div>
                    <Link to="/student/exams/instructions" className="h-10 px-md bg-primary text-on-primary rounded-lg text-sm font-bold flex items-center hover:opacity-90">
                      Start
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-headline-sm text-primary mb-md font-bold">Upcoming Exams</h3>
              {loading ? (
                <div className="text-center text-on-surface-variant text-sm py-md">Loading...</div>
              ) : upcoming.length === 0 ? (
                <div className="text-center text-on-surface-variant text-sm py-md">No upcoming exams.</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-md">
                  {upcoming.slice(0, 4).map(exam => (
                    <div key={exam.id} className="border border-outline-variant rounded-xl p-md bg-surface-container-lowest">
                      <p className="font-bold text-primary mb-xs">{exam.title}</p>
                      <p className="text-sm text-on-surface-variant">{exam.subject} • {new Date(exam.start_time).toLocaleString()}</p>
                      <p className="text-sm text-on-surface-variant">{exam.duration_minutes} min • {exam.total_marks} marks</p>
                      <Link to="/student/exams/instructions" className="mt-sm inline-flex h-9 px-md items-center border border-outline-variant rounded-lg text-sm font-bold text-primary hover:bg-surface-container-high">
                        View Details
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      <PageFooter />
    </StudentLayout>
  );
}
