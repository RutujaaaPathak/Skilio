import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../../components/Icon.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';

const roleRoutes = {
  student: '/student/dashboard',
  teacher: '/teacher/',
};

export default function Signup({ defaultRole = 'student' }) {
  const [role, setRole] = useState(defaultRole);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [formError, setFormError] = useState('');
  const { signup, loading, error } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError('Please fill in all fields');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    try {
      await signup({ name: form.name, email: form.email, password: form.password, role });
      navigate(roleRoutes[role]);
    } catch {
      setFormError(error || 'Signup failed. Please try again.');
    }
  }

  return (
    <div className="bg-background min-h-screen flex flex-col overflow-x-hidden">
      <header className="bg-surface border-b border-outline-variant h-16 flex items-center px-gutter fixed w-full z-50">
        <div className="flex items-center gap-xs">
          <Icon name="shield" className="text-primary text-headline-md" />
          <h1 className="text-headline-md font-bold text-primary">Skillo</h1>
        </div>
      </header>

      <main className="flex-grow flex pt-16 min-h-screen">
        <div className="flex w-full overflow-hidden">
          <section className="hidden md:flex md:w-1/2 lg:w-3/5 bg-primary items-center justify-center relative p-xl overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -top-1/4 -left-1/4 w-full h-full rounded-full bg-secondary-container blur-[120px]" />
              <div className="absolute -bottom-1/4 -right-1/4 w-full h-full rounded-full bg-primary-fixed-dim blur-[120px]" />
            </div>
            <div className="relative z-10 max-w-[32rem]">
              <h2 className="text-display font-display text-on-primary mb-md">Join the Academic Network</h2>
              <p className="text-body-lg text-on-primary-container opacity-90 leading-relaxed">Create your secure account to access exams, track performance, and maintain academic integrity.</p>
            </div>
          </section>

          <section className="w-full md:w-1/2 lg:w-2/5 bg-surface flex items-center justify-center p-gutter overflow-y-auto">
            <div className="w-full max-w-[28rem]">
              <div className="mb-lg text-center md:text-left">
                <h3 className="text-headline-lg text-primary mb-xs">Create Account</h3>
                <p className="text-body-md text-on-surface-variant">Register as a {role} to get started.</p>
              </div>

              <div className="flex border-b border-outline-variant mb-md">
                {['student', 'teacher'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRole(item)}
                    className={`flex-1 pb-md text-label-md font-bold transition-all capitalize ${role === item ? 'text-primary border-b-2 border-secondary-container' : 'text-on-surface-variant'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              {formError && (
                <div className="mb-md rounded-lg bg-error-container p-sm text-label-md text-error font-bold">{formError}</div>
              )}

              <form className="space-y-md" onSubmit={handleSubmit}>
                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant">Full Name</label>
                  <input className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md" placeholder="e.g. John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant">Email Address</label>
                  <input className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md" type="email" placeholder="e.g. john@edu.in" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant">Password</label>
                  <input className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md" type="password" placeholder="Minimum 8 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                </div>
                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant">Confirm Password</label>
                  <input className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md" type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                </div>
                <button type="submit" disabled={loading} className="w-full h-12 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 disabled:opacity-50">
                  {loading ? 'Creating Account...' : 'Create Secure Account'}
                </button>
              </form>

              <p className="mt-md text-center text-label-md text-on-surface-variant">Already have an account? <Link className="font-bold text-secondary" to={`/${role}/auth/login`}>Sign in</Link></p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
