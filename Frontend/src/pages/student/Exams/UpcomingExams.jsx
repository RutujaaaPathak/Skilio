import { Link } from 'react-router-dom';
import StudentLayout from '../../../components/StudentLayout.jsx';
import Icon from '../../../components/Icon.jsx';

export default function UpcomingExams() {
  return (
    <StudentLayout title="Upcoming Exams">
      <div className="p-gutter max-w-container-max mx-auto">
        <div className="text-center py-xl">
          <Icon name="assignment" className="text-on-surface-variant text-[48px] mb-md" />
          <h3 className="text-headline-sm text-primary font-bold mb-xs">No Exams Scheduled</h3>
          <p className="text-on-surface-variant">Your exam schedule will appear here once assigned.</p>
          <Link to="/student/dashboard" className="mt-md inline-flex h-11 px-lg items-center bg-primary text-on-primary rounded-lg font-bold hover:opacity-90">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </StudentLayout>
  );
}
