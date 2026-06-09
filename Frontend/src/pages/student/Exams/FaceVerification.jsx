import { Link } from 'react-router-dom';
import Icon from '../../../components/Icon.jsx';

export default function FaceVerification() {
  return (
    <main className="min-h-screen bg-surface p-gutter flex items-center justify-center">
      <section className="max-w-3xl w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter text-center">
        <Icon name="face" className="text-primary text-[56px]" />
        <h1 className="text-headline-lg text-primary font-bold mb-xs">Face Verification</h1>
        <p className="text-on-surface-variant mb-md">Align your face inside the frame for biometric identity matching.</p>
        <div className="mx-auto mb-md w-full max-w-[36rem] aspect-video bg-primary rounded-3xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container" />
          <div className="absolute inset-0 flex items-center justify-center"><div className="w-56 h-72 rounded-full border-2 border-secondary border-dashed animate-pulse-ring" /></div>
        </div>
        <Link to="/student/exams/security-check" className="inline-flex h-12 px-lg items-center justify-center bg-secondary text-primary rounded-lg font-bold gap-xs">Continue <Icon name="arrow_forward" /></Link>
      </section>
    </main>
  );
}
