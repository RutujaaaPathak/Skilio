import { Link } from 'react-router-dom';
import StudentLayout from '../../../components/StudentLayout.jsx';
import Icon from '../../../components/Icon.jsx';

const exams = [
  { title: 'Advanced Cognitive Analytics', date: 'Today', time: '10:30 AM', status: 'Ready' },
  { title: 'Data Integrity & Ethics', date: 'Today', time: '02:00 PM', status: 'Locked' },
  { title: 'Neural Network Foundations', date: 'Nov 24, 2024', time: '11:00 AM', status: 'Upcoming' },
  { title: 'Quantum Computing Intro', date: 'Nov 26, 2024', time: '09:00 AM', status: 'Upcoming' }
];

export default function UpcomingExams() {
  return (
    <StudentLayout title="Upcoming Exams">
      <div className="p-gutter max-w-container-max mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
          {exams.map((exam) => (
            <article key={exam.title} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md hover:border-secondary transition-colors">
              <div className="flex justify-between items-start mb-md">
                <Icon name="assignment" className="text-primary text-[36px]" />
                <span className="px-sm py-xs rounded-full bg-secondary-fixed text-on-secondary-container text-label-sm">{exam.status}</span>
              </div>
              <h3 className="text-headline-sm text-primary font-bold mb-xs">{exam.title}</h3>
              <p className="text-on-surface-variant text-label-md">{exam.date} • {exam.time}</p>
              <Link to="/student/exams/instructions" className="mt-md h-11 bg-primary text-on-primary rounded-lg flex items-center justify-center gap-xs font-bold hover:opacity-90">
                View Instructions <Icon name="arrow_forward" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </StudentLayout>
  );
}
