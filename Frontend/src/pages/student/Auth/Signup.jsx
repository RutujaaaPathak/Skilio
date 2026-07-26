import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../../../components/Icon.jsx';
import { useAuth } from '../../../context/AuthContext.jsx';
import { PASSWORD_RULES, getPasswordStrength, getPasswordErrors } from '../../../utils/validation.js';

export default function Signup({ defaultRole = 'student' }) {
  const [role, setRole] = useState(defaultRole);
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', confirmPassword: '', college: '', branch: '', division: '', year: '' });
  const [formError, setFormError] = useState('');
  const { signup, loading } = useAuth();
  const navigate = useNavigate();
  const pwStrength = getPasswordStrength(form.password);

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

    const pwErrors = getPasswordErrors(form.password);
    if (pwErrors.length > 0) {
      setFormError('Password requirements: ' + pwErrors.join(', '));
      return;
    }

    const payload = { name: form.name, username: form.username.trim() || null, email: form.email, password: form.password, role };
    if (role === 'student') {
      payload.college = form.college.trim() || null;
      payload.branch = form.branch.trim() || null;
      payload.division = form.division.trim() || null;
      payload.year = form.year.trim() || null;
    }

    try {
      await signup(payload);
      sessionStorage.setItem('pendingEmail', form.email);
      sessionStorage.setItem('pendingRole', role);
      navigate('/auth/verify-email-pending');
    } catch (err) {
      setFormError(err.message || 'Signup failed. Please try again.');
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
                  <label className="text-label-md font-bold text-on-surface-variant">{role === 'teacher' ? 'Faculty ID' : 'Student ID'}</label>
                  <input className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md" placeholder={role === 'teacher' ? 'e.g. PROF-SMITH-442' : 'e.g. 2024-EDU-001'} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
                </div>
                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant">Email Address</label>
                  <input className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md" type="email" placeholder="e.g. john@edu.in" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant">Password</label>
                  <input className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md" type="password" placeholder="Create a strong password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                  {form.password && (
                    <div className="mt-xs">
                      <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-300 rounded-full ${pwStrength.color}`} style={{ width: `${pwStrength.score}%` }} />
                      </div>
                      <p className="text-label-sm mt-1 text-on-surface-variant font-bold">{pwStrength.label}</p>
                    </div>
                  )}
                  <div className="mt-xs space-y-1">
                    {PASSWORD_RULES.map((rule) => {
                      const passed = rule.test(form.password);
                      return (
                        <div key={rule.key} className={`flex items-center gap-1 text-xs ${passed ? 'text-emerald-600' : 'text-on-surface-variant'}`}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{passed ? 'check_circle' : 'radio_button_unchecked'}</span>
                          {rule.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant">Confirm Password</label>
                  <input className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md" type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} />
                </div>
                {role === 'student' && (
                  <>
                    <div className="space-y-xs">
                      <label className="text-label-md font-bold text-on-surface-variant">College</label>
                      <input className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md" placeholder="e.g. MIT College" value={form.college} onChange={e => setForm(f => ({ ...f, college: e.target.value }))} />
                    </div>
                    <div className="space-y-xs">
                      <label className="text-label-md font-bold text-on-surface-variant">Branch</label>
                      <input className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md" placeholder="e.g. Computer Science" value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-sm">
                      <div className="space-y-xs">
                        <label className="text-label-md font-bold text-on-surface-variant">Division</label>
                        <input className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md" placeholder="e.g. A" value={form.division} onChange={e => setForm(f => ({ ...f, division: e.target.value }))} />
                      </div>
                      <div className="space-y-xs">
                        <label className="text-label-md font-bold text-on-surface-variant">Year</label>
                        <input className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md" placeholder="e.g. 3rd Year" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} />
                      </div>
                    </div>
                  </>
                )}
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
