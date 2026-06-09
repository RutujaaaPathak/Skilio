import { Link } from 'react-router-dom';
import Icon from '../../../components/Icon.jsx';

export default function DeviceCheck() {
  const checks = ['Lockdown browser active', 'Virtual machine not detected', 'Screen recording blocked', 'Developer tools disabled'];
  return (
    <main className="min-h-screen bg-surface p-gutter flex items-center justify-center">
      <section className="max-w-[36rem] w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter">
        <Icon name="terminal" className="text-primary text-[48px]" />
        <h1 className="text-headline-lg text-primary font-bold mb-md">Device Check</h1>
        <div className="space-y-sm">{checks.map((c) => <div key={c} className="flex items-center gap-sm p-sm bg-tertiary-fixed/40 rounded-lg"><Icon name="check_circle" className="text-on-tertiary-container" fill />{c}</div>)}</div>
        <Link to="/student/exams/security-check" className="mt-md w-full h-12 bg-primary text-on-primary rounded-lg flex items-center justify-center font-bold">Back to Security Check</Link>
      </section>
    </main>
  );
}
