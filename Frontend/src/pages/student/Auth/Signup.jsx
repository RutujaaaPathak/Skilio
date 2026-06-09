import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../../components/Icon.jsx';

export default function Signup() {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-gutter">
      <section className="w-full max-w-[32rem] bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter shadow-sm">
        <div className="text-center mb-md">
          <Icon name="shield" className="text-primary text-[44px]" />
          <h1 className="text-headline-lg text-primary font-bold">Create Student Account</h1>
          <p className="text-on-surface-variant">Register to access your secure exam portal.</p>
        </div>
        <form className="space-y-sm" onSubmit={(e) => { e.preventDefault(); navigate('/student/dashboard'); }}>
          {['Full Name', 'Student ID', 'Institution Email', 'Password'].map((label) => (
            <div key={label}>
              <label className="text-label-md font-bold text-on-surface-variant">{label}</label>
              <input type={label === 'Password' ? 'password' : 'text'} className="mt-xs w-full h-12 px-md bg-surface border border-outline-variant rounded-lg focus-ring" placeholder={label} />
            </div>
          ))}
          <button className="w-full h-12 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90">Create Account</button>
        </form>
        <p className="mt-md text-center text-label-md text-on-surface-variant">Already have an account? <Link className="font-bold text-secondary" to="/student/auth/login">Login</Link></p>
      </section>
    </main>
  );
}
