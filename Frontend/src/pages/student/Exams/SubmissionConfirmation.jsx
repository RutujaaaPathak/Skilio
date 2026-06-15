import { Link, useLocation } from 'react-router-dom';
import Icon from '../../../components/Icon.jsx';

export default function SubmissionConfirmation() {
  const location = useLocation();
  const isAutoSubmitted = location.search.includes('auto=true');

  return (
    <main className="min-h-screen bg-surface p-gutter flex items-center justify-center">
      <section className="max-w-[36rem] w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter text-center shadow-xl space-y-md">
        {isAutoSubmitted ? (
          <>
            <Icon name="gavel" className="text-error text-[64px]" fill />
            <h1 className="text-headline-lg text-error font-bold">Exam Auto-Submitted</h1>
            <div className="p-md bg-error/10 border border-error/20 rounded-xl text-left space-y-xs">
              <p className="text-xs font-bold text-error uppercase tracking-wider">⚠️ Security Incident Lockout</p>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                This examination session was automatically locked and submitted due to **repeated security violations** or a high **Session Risk Score**. Your activity logs, tab-switch history, and biometric frames have been stored securely and marked for teacher review.
              </p>
            </div>
          </>
        ) : (
          <>
            <Icon name="task_alt" className="text-on-tertiary-container text-[64px]" fill />
            <h1 className="text-headline-lg text-primary font-bold">Exam Submitted Successfully</h1>
            <p className="text-on-surface-variant">Your encrypted answers and proctoring logs have been saved securely.</p>
          </>
        )}
        <div className="pt-md">
          <Link to="/student/exams/result" className="h-12 px-lg w-full inline-flex items-center justify-center bg-primary text-on-primary rounded-lg font-bold hover:opacity-90 transition-opacity">
            View Result
          </Link>
        </div>
      </section>
    </main>
  );
}

