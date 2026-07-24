import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../../components/Icon.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';

const roleData = {
  student: { label: 'Student ID / Email', placeholder: 'e.g. 2024-EDU-001 or john@edu.in' },
  teacher: { label: 'Faculty ID / Email', placeholder: 'e.g. PROF-SMITH-442 or smith@univ.edu' },
  admin: { label: 'Admin ID / Email', placeholder: 'e.g. admin-01 or admin@inst.edu' }
};

const roleRoutes = {
  student: '/student/dashboard',
  teacher: '/teacher/',
  admin: '/admin/dashboard',
};

export default function Login({ defaultRole = 'student' }) {
  const [role, setRole] = useState(defaultRole);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [formError, setFormError] = useState('');
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    if (!form.identifier.trim() || !form.password.trim()) {
      setFormError('Please fill in all fields');
      return;
    }

    try {
      const result = await login({ role, identifier: form.identifier, password: form.password });
      if (result.requires_2fa) {
        navigate('/auth/totp-challenge');
      } else {
        navigate(roleRoutes[result.user?.role] || roleRoutes[role]);
      }
    } catch {
      setFormError(error || 'Invalid credentials. Please try again.');
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
              <span className="px-sm py-xs bg-secondary-container text-on-secondary-container rounded-full text-label-sm uppercase tracking-wider font-bold">Encrypted & Secure</span>
              <h2 className="text-display font-display text-on-primary mt-sm mb-md">Secure Access to Academic Excellence</h2>
              <p className="text-body-lg text-on-primary-container opacity-90 leading-relaxed mb-lg">A trusted AI-driven proctoring and assessment environment powered by enterprise-grade security.</p>
              <div className="flex items-center gap-md border border-on-primary-container/20 rounded-xl p-md bg-primary-container/50 backdrop-blur-sm">
                <div className="flex -space-x-4">
                  {[1, 2, 3].map((n) => <div key={n} className="w-10 h-10 rounded-full border-2 border-primary bg-secondary-container flex items-center justify-center font-bold text-primary">{n}</div>)}
                </div>
                <div className="text-on-primary">
                  <p className="text-label-md font-bold">12k+ Institutions</p>
                  <p className="text-label-sm opacity-70">Verified & Secured by AI</p>
                </div>
              </div>
            </div>
          </section>

          <section className="w-full md:w-1/2 lg:w-2/5 bg-surface flex items-center justify-center p-gutter overflow-y-auto">
            <div className="w-full max-w-[28rem]">
              <div className="mb-lg text-center md:text-left">
                <h3 className="text-headline-lg text-primary mb-xs">Welcome Back</h3>
                <p className="text-body-md text-on-surface-variant">Please select your portal to sign in.</p>
              </div>

              <div className="flex border-b border-outline-variant mb-md">
                {Object.keys(roleData).map((item) => (
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
                <div className="mb-md rounded-lg bg-error-container p-sm text-label-md text-error font-bold">
                  {formError}
                </div>
              )}

              <form className="space-y-md" onSubmit={handleSubmit}>
                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant">{roleData[role].label}</label>
                  <div className="relative">
                    <Icon name="person" className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      className="w-full pl-12 pr-4 h-12 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md"
                      placeholder={roleData[role].placeholder}
                      value={form.identifier}
                      onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant">Secure Password</label>
                  <div className="relative">
                    <Icon name="lock" className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      className="w-full pl-12 pr-12 h-12 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary">
                      <Icon name={showPassword ? 'visibility_off' : 'visibility'} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between py-xs">
                  <label className="flex items-center gap-xs cursor-pointer">
                    <input className="w-5 h-5 rounded border-outline-variant text-secondary" type="checkbox" />
                    <span className="text-label-md text-on-surface-variant">Remember me</span>
                  </label>
                  <Link className="text-label-md font-bold text-secondary hover:underline" to="/auth/forgot-password">Forgot access?</Link>
                </div>

                <button
                  className="w-full h-12 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 flex items-center justify-center gap-xs disabled:opacity-50"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Signing In...' : <>Sign In to Secure Portal <Icon name="arrow_forward" /></>}
                </button>
              </form>

              <p className="mt-md text-center text-label-md text-on-surface-variant">New here? <Link className="font-bold text-secondary" to={`/${role}/auth/signup`}>Create account</Link></p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
