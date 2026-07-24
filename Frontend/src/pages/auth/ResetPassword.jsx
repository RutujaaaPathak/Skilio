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

    const failed = PASSWORD_RULES.filter((r) => !r.test(password));
    if (failed.length > 0) {
      setError('Password requirements: ' + failed.map((r) => r.label).join(', '));
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

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-gutter">
        <div className="card max-w-md w-full p-lg text-center">
          <Icon name="error" className="text-error text-5xl mb-md" />
          <h2 className="text-headline-lg font-bold text-primary mb-sm">Invalid Link</h2>
          <p className="text-body-md text-on-surface-variant mb-lg">This password reset link is invalid or missing.</p>
          <Link to="/auth/forgot-password" className="font-bold text-secondary hover:underline">Request a new link</Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-gutter">
        <div className="card max-w-md w-full p-lg text-center">
          <Icon name="check_circle" className="text-emerald-500 text-5xl mb-md" />
          <h2 className="text-headline-lg font-bold text-primary mb-sm">Password Reset</h2>
          <p className="text-body-md text-on-surface-variant mb-lg">Your password has been reset successfully.</p>
          <button onClick={() => navigate('/')}
            className="px-md py-sm bg-primary text-on-primary font-bold rounded-lg hover:opacity-90">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-surface border-b border-outline-variant h-16 flex items-center px-gutter">
        <div className="flex items-center gap-xs">
          <Icon name="shield" className="text-primary text-headline-md" />
          <h1 className="text-headline-md font-bold text-primary">Skillo</h1>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-gutter">
        <div className="card max-w-md w-full p-lg">
          <h2 className="text-headline-lg font-bold text-primary mb-xs">Reset Password</h2>
          <p className="text-body-md text-on-surface-variant mb-lg">Enter your new password.</p>

          {error && (
            <div className="mb-md rounded-lg bg-error-container p-sm text-label-md text-error font-bold">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-md">
            <div className="space-y-xs">
              <label className="text-label-md font-bold text-on-surface-variant">New Password</label>
              <input className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md"
                type="password" placeholder="New password" value={password} onChange={e => setPassword(e.target.value)} required />
              <div className="mt-xs space-y-1">
                {PASSWORD_RULES.map((rule) => {
                  const passed = rule.test(password);
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
              <input className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md"
                type="password" placeholder="Re-enter password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading}
              className="w-full h-12 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 disabled:opacity-50">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}