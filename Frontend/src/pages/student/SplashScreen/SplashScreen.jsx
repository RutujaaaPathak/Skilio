import { Link } from 'react-router-dom';
import Icon from '../../../components/Icon.jsx';

export default function SplashScreen() {
  return (
    <main className="min-h-screen bg-primary text-on-primary flex items-center justify-center p-gutter relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-secondary-container/20 blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full bg-primary-fixed-dim/20 blur-3xl" />
      <section className="relative z-10 max-w-3xl text-center">
        <div className="mx-auto mb-md w-20 h-20 rounded-2xl bg-secondary-container flex items-center justify-center text-primary shadow-2xl">
          <Icon name="shield" className="text-[48px]" fill />
        </div>
        <h1 className="text-display font-display mb-sm">Skillo</h1>
        <p className="text-body-lg text-on-primary-container mb-lg">Offline-first secure examination platform with AI proctoring, device lockdown, and biometric verification.</p>
        <div className="flex flex-col sm:flex-row gap-sm justify-center">
          <Link to="/student/auth/login" className="px-lg py-sm bg-secondary-container text-primary rounded-lg font-bold hover:opacity-90">Student Login</Link>
          <Link to="/student/auth/signup" className="px-lg py-sm border border-on-primary-container/30 rounded-lg font-bold hover:bg-white/10">Create Account</Link>
        </div>
      </section>
    </main>
  );
}
