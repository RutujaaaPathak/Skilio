import { Link } from 'react-router-dom';
import Icon from '../../../components/Icon.jsx';

export default function VoiceVerification() {
  return (
    <main className="min-h-screen bg-surface p-gutter flex items-center justify-center">
      <section className="max-w-[36rem] w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter text-center">
        <Icon name="keyboard_voice" className="text-primary text-[56px]" />
        <h1 className="text-headline-lg text-primary font-bold">Voice Verification</h1>
        <p className="text-on-surface-variant mb-md">Read the phrase aloud: <b>&ldquo;My identity is verified for this secure exam.&rdquo;</b></p>
        <div className="flex items-end gap-2 h-24 justify-center mb-md">
          {[35, 60, 45, 80, 50, 70, 40].map((h, i) => <div key={i} className="w-6 bg-secondary rounded" style={{ height: `${h}%` }} />)}
        </div>
        <Link to="/student/exams/security-check" className="inline-flex h-12 px-lg items-center justify-center bg-secondary text-primary rounded-lg font-bold">Continue</Link>
      </section>
    </main>
  );
}
