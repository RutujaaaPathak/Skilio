import { Link } from 'react-router-dom';
import Icon from '../../../components/Icon.jsx';

export default function SubmissionConfirmation() {
  return (
    <main className="min-h-screen bg-surface p-gutter flex items-center justify-center">
      <section className="max-w-[36rem] w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter text-center">
        <Icon name="task_alt" className="text-on-tertiary-container text-[64px]" fill />
        <h1 className="text-headline-lg text-primary font-bold">Exam Submitted Successfully</h1>
        <p className="text-on-surface-variant mb-md">Your encrypted answers and proctoring logs have been saved securely.</p>
        <Link to="/student/exams/result" className="h-12 px-lg inline-flex items-center justify-center bg-primary text-on-primary rounded-lg font-bold">View Result</Link>
      </section>
    </main>
  );
}
