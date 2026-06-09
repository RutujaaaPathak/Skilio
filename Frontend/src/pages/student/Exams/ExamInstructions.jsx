import { Link } from 'react-router-dom';
import StudentLayout from '../../../components/StudentLayout.jsx';
import Icon from '../../../components/Icon.jsx';

export default function ExamInstructions() {
  const rules = ['Keep your webcam and microphone enabled.', 'Do not switch tabs or leave the secure window.', 'No phones, books, notes, or extra devices allowed.', 'Submit before the timer ends.'];
  return (
    <StudentLayout title="Exam Instructions">
      <div className="p-gutter max-w-4xl mx-auto">
        <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter">
          <div className="flex items-center gap-md mb-md">
            <div className="w-14 h-14 rounded-xl bg-primary text-on-primary flex items-center justify-center"><Icon name="menu_book" /></div>
            <div>
              <h1 className="text-headline-lg text-primary font-bold">Advanced Cognitive Analytics</h1>
              <p className="text-on-surface-variant">Duration: 90 minutes • Questions: 40 • Secure offline mode</p>
            </div>
          </div>
          <div className="space-y-sm">
            {rules.map((rule) => (
              <div key={rule} className="flex items-start gap-sm p-sm bg-surface-container-low rounded-lg">
                <Icon name="check_circle" className="text-on-tertiary-container" fill />
                <p>{rule}</p>
              </div>
            ))}
          </div>
          <Link to="/student/exams/security-check" className="mt-gutter h-12 bg-primary text-on-primary rounded-lg flex items-center justify-center gap-xs font-bold hover:opacity-90">
            Proceed to Security Check <Icon name="arrow_forward" />
          </Link>
        </section>
      </div>
    </StudentLayout>
  );
}
