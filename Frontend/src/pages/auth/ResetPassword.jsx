import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { authService } from '../../services/authService.js';

const PASSWORD_RULES = [
  { key: 'min', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { key: 'digit', label: 'One digit', test: (v) => /\d/.test(v) },
  { key: 'special', label: 'One special character', test: (v) => /[!@#$%^&*(),.?":{}|<>_\-]/.test(v) },
];

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const failedRules = PASSWORD_RULES.filter((r) => !r.test(password));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (failedRules.length > 0) {
      setError('Password requirements: ' + failedRules.map((r) => r.label).join(', '));
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const header = (
    <header className="bg-surface border-b border-outline-variant h-16 flex items-center px-gutter fixed w-full z-50">
      <div className="flex items-center gap-xs">
        <Icon name="shield" className="text-primary text-headline-md" />
        <h1 className="text-headline-md font-bold text-primary">Skillo</h1>
      </div>
    </header>
  );

  if (!token) {
    return (
      <div className="bg-background min-h-screen flex flex-col overflow-x-hidden">
        {header}
        <main className="flex-grow flex pt-16 min-h-screen">
          <div className="flex w-full overflow-hidden">
            <section className="hidden md:flex md:w-1/2 lg:w-3/5 bg-primary items-center justify-center relative p-xl overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute -top-1/4 -left-1/4 w-full h-full rounded-full bg-secondary-container blur-[120px]" />
                <div className="absolute -bottom-1/4 -right-1/4 w-full h-full rounded-full bg-primary-fixed-dim blur-[120px]" />
              </div>
              <div className="relative z-10 max-w-[32rem]">
                <span className="px-sm py-xs bg-error-container text-on-error rounded-full text-label-sm uppercase tracking-wider font-bold">Invalid Link</span>
                <h2 className="text-display font-display text-on-primary mt-sm mb-md">Link Expired or Invalid</h2>
                <p className="text-body-lg text-on-primary-container opacity-90 leading-relaxed mb-lg">Password reset links expire after a short time for security. Please request a new one.</p>
                <div className="flex items-center gap-md border border-on-primary-container/20 rounded-xl p-md bg-primary-container/50 backdrop-blur-sm">
                  <Icon name="error" className="text-error text-3xl" />
                  <div className="text-on-primary">
                    <p className="text-label-md font-bold">Security First</p>
                    <p className="text-label-sm opacity-70">Links expire to protect your account</p>
                  </div>
                </div>
              </div>
            </section>
            <section className="w-full md:w-1/2 lg:w-2/5 bg-surface flex items-center justify-center p-gutter overflow-y-auto">
              <div className="w-full max-w-[28rem] text-center md:text-left">
                <div className="flex flex-col items-center md:items-start">
                  <div className="w-16 h-16 bg-error-container rounded-full flex items-center justify-center mb-md">
                    <Icon name="error" className="text-error text-3xl" />
                  </div>
                  <h3 className="text-headline-lg font-bold text-primary mb-xs">Invalid Link</h3>
                  <p className="text-body-md text-on-surface-variant mb-lg">This password reset link is invalid or missing.</p>
                  <Link to="/auth/forgot-password" className="font-bold text-secondary hover:underline">Request a new link</Link>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-background min-h-screen flex flex-col overflow-x-hidden">
        {header}
        <main className="flex-grow flex pt-16 min-h-screen">
          <div className="flex w-full overflow-hidden">
            <section className="hidden md:flex md:w-1/2 lg:w-3/5 bg-primary items-center justify-center relative p-xl overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute -top-1/4 -left-1/4 w-full h-full rounded-full bg-secondary-container blur-[120px]" />
                <div className="absolute -bottom-1/4 -right-1/4 w-full h-full rounded-full bg-primary-fixed-dim blur-[120px]" />
              </div>
              <div className="relative z-10 max-w-[32rem]">
                <span className="px-sm py-xs bg-tertiary text-on-tertiary rounded-full text-label-sm uppercase tracking-wider font-bold">Success</span>
                <h2 className="text-display font-display text-on-primary mt-sm mb-md">Password Reset Complete</h2>
                <p className="text-body-lg text-on-primary-container opacity-90 leading-relaxed mb-lg">Your password has been updated successfully. You can now sign in with your new credentials.</p>
                <div className="flex items-center gap-md border border-on-primary-container/20 rounded-xl p-md bg-primary-container/50 backdrop-blur-sm">
                  <Icon name="check_circle" className="text-tertiary text-3xl" />
                  <div className="text-on-primary">
                    <p className="text-label-md font-bold">Account Secured</p>
                    <p className="text-label-sm opacity-70">Your new password is encrypted and stored safely</p>
                  </div>
                </div>
              </div>
            </section>
            <section className="w-full md:w-1/2 lg:w-2/5 bg-surface flex items-center justify-center p-gutter overflow-y-auto">
              <div className="w-full max-w-[28rem] text-center md:text-left">
                <div className="flex flex-col items-center md:items-start">
                  <div className="w-16 h-16 bg-tertiary rounded-full flex items-center justify-center mb-md">
                    <Icon name="check_circle" className="text-on-tertiary text-3xl" />
                  </div>
                  <h3 className="text-headline-lg font-bold text-primary mb-xs">Password Reset</h3>
                  <p className="text-body-md text-on-surface-variant mb-lg">Your password has been reset successfully.</p>
                  <button onClick={() => navigate('/')}
                    className="w-full py-3 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90">
                    Sign In
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen flex flex-col overflow-x-hidden">
      {header}
      <main className="flex-grow flex pt-16 min-h-screen">
        <div className="flex w-full overflow-hidden">
          <section className="hidden md:flex md:w-1/2 lg:w-3/5 bg-primary items-center justify-center relative p-xl overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -top-1/4 -left-1/4 w-full h-full rounded-full bg-secondary-container blur-[120px]" />
              <div className="absolute -bottom-1/4 -right-1/4 w-full h-full rounded-full bg-primary-fixed-dim blur-[120px]" />
            </div>
            <div className="relative z-10 max-w-[32rem]">
              <span className="px-sm py-xs bg-secondary-container text-on-secondary-container rounded-full text-label-sm uppercase tracking-wider font-bold">Secure Recovery</span>
              <h2 className="text-display font-display text-on-primary mt-sm mb-md">Create a New Password</h2>
              <p className="text-body-lg text-on-primary-container opacity-90 leading-relaxed mb-lg">Your new password must be strong and unique. We recommend a combination of letters, numbers, and symbols.</p>
              <div className="flex items-center gap-md border border-on-primary-container/20 rounded-xl p-md bg-primary-container/50 backdrop-blur-sm">
                <Icon name="lock_reset" className="text-secondary text-3xl" />
                <div className="text-on-primary">
                  <p className="text-label-md font-bold">Encrypted &amp; Secure</p>
                  <p className="text-label-sm opacity-70">Your password is hashed and never stored in plain text</p>
                </div>
              </div>
            </div>
          </section>

          <section className="w-full md:w-1/2 lg:w-2/5 bg-surface flex items-center justify-center p-gutter overflow-y-auto">
            <div className="w-full max-w-[28rem]">
              <div className="mb-lg text-center md:text-left">
                <h3 className="text-headline-lg text-primary mb-xs">Reset Password</h3>
                <p className="text-body-md text-on-surface-variant">Enter your new password below.</p>
              </div>

              {error && (
                <div className="mb-md rounded-lg bg-error-container p-sm text-label-md text-error font-bold">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-md">
                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant">New Password</label>
                  <div className="relative">
                    <Icon name="lock" className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input className="w-full pl-12 pr-4 h-12 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md"
                      type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                  <div className="mt-xs space-y-1">
                    {PASSWORD_RULES.map((rule) => {
                      const passed = rule.test(password);
                      return (
                        <div key={rule.key} className={`flex items-center gap-1 text-xs ${passed ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                          <Icon name={passed ? 'check_circle' : 'radio_button_unchecked'} className="text-sm" />
                          {rule.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant">Confirm Password</label>
                  <div className="relative">
                    <Icon name="lock" className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input className="w-full pl-12 pr-4 h-12 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md"
                      type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} required />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full h-12 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 flex items-center justify-center gap-xs disabled:opacity-50">
                  {loading ? 'Resetting...' : <>Reset Password <Icon name="arrow_forward" /></>}
                </button>
              </form>

              <p className="mt-md text-center text-label-md text-on-surface-variant">
                Remember your password? <Link to="/" className="font-bold text-secondary hover:underline">Sign in</Link>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
