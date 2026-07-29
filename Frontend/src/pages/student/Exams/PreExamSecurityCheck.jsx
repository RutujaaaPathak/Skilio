import { useNavigate, Link } from 'react-router-dom';
import StudentLayout from '../../../components/StudentLayout.jsx';
import SecurityDashboard from '../../../components/security/SecurityDashboard.jsx';

export default function PreExamSecurityCheck() {
  const navigate = useNavigate();

  const handleComplete = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {}).finally(() => {
        navigate('/student/exams/interface');
      });
    } else {
      navigate('/student/exams/interface');
    }
  };

  return (
    <StudentLayout title="Pre-Exam Security Check">
      <div className="max-w-container-max mx-auto px-gutter py-md">
        <div className="mb-md">
          <Link
            to="/student/exams/instructions"
            className="text-label-sm text-secondary hover:underline inline-flex items-center gap-xs"
          >
            &larr; Back to Instructions
          </Link>
        </div>
        <SecurityDashboard onComplete={handleComplete} />
      </div>
    </StudentLayout>
  );
}
