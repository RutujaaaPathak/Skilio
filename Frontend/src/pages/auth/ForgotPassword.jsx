import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { authService } from '../../services/authService.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
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

  if (sent) {
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
                <span className="px-sm py-xs bg-secondary-container text-on-secondary-container rounded-full text-label-sm uppercase tracking-wider font-bold">Email Sent</span>
                <h2 className="text-display font-display text-on-primary mt-sm mb-md">Check Your Inbox</h2>
                <p className="text-body-lg text-on-primary-container opacity-90 leading-relaxed mb-lg">We've sent a password reset link to your registered email address. It may take a few minutes to arrive.</p>
                <div className="flex items-center gap-md border border-on-primary-container/20 rounded-xl p-md bg-primary-container/50 backdrop-blur-sm">
                  <Icon name="mail" className="text-secondary text-3xl" />
                  <div className="text-on-primary">
                    <p className="text-label-md font-bold">Sent Securely</p>
                    <p className="text-label-sm opacity-70">Your reset link is encrypted end-to-end</p>
                  </div>
                </div>
              </div>
            </section>
            <section className="w-full md:w-1/2 lg:w-2/5 bg-surface flex items-center justify-center p-gutter overflow-y-auto">
              <div className="w-full max-w-[28rem] text-center md:text-left">
                <div className="flex flex-col items-center md:items-start">
                  <div className="w-16 h-16 bg-secondary-container rounded-full flex items-center justify-center mb-md">
                    <Icon name="mail" className="text-secondary text-3xl" />
                  </div>
                  <h3 className="text-headline-lg font-bold text-primary mb-xs">Check Your Email</h3>
                  <p className="text-body-md text-on-surface-variant mb-lg">
                    If an account with <strong>{email}</strong> exists, we've sent a password reset link.
                  </p>
                  <Link to="/" className="w-full py-3 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 text-center">
                    Back to Login
                  </Link>
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
              <span className="px-sm py-xs bg-secondary-container text-on-secondary-container rounded-full text-label-sm uppercase tracking-wider font-bold">Account Recovery</span>
              <h2 className="text-display font-display text-on-primary mt-sm mb-md">Forgot Your Password?</h2>
              <p className="text-body-lg text-on-primary-container opacity-90 leading-relaxed mb-lg">No worries. Enter your email and we'll send you a secure reset link to regain access to your account.</p>
              <div className="flex items-center gap-md border border-on-primary-container/20 rounded-xl p-md bg-primary-container/50 backdrop-blur-sm">
                <Icon name="lock_reset" className="text-secondary text-3xl" />
                <div className="text-on-primary">
                  <p className="text-label-md font-bold">End-to-End Encrypted</p>
                  <p className="text-label-sm opacity-70">Your data is protected with enterprise-grade security</p>
                </div>
              </div>
            </div>
          </section>

          <section className="w-full md:w-1/2 lg:w-2/5 bg-surface flex items-center justify-center p-gutter overflow-y-auto">
            <div className="w-full max-w-[28rem]">
              <div className="mb-lg text-center md:text-left">
                <h3 className="text-headline-lg text-primary mb-xs">Reset Access</h3>
                <p className="text-body-md text-on-surface-variant">Enter the email associated with your account.</p>
              </div>

              {error && (
                <div className="mb-md rounded-lg bg-error-container p-sm text-label-md text-error font-bold">{error}</div>
              )}

              <form className="space-y-md" onSubmit={handleSubmit}>
                <div className="space-y-xs">
                  <label className="text-label-md font-bold text-on-surface-variant">Email Address</label>
                  <div className="relative">
                    <Icon name="mail" className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      className="w-full pl-12 pr-4 h-12 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md"
                      type="email" placeholder="e.g. john@edu.in"
                      value={email} onChange={e => setEmail(e.target.value)} required
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full h-12 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 flex items-center justify-center gap-xs disabled:opacity-50">
                  {loading ? 'Sending...' : <>Send Reset Link <Icon name="arrow_forward" /></>}
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
