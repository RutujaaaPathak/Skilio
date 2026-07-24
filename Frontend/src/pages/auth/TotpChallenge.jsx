import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import Icon from '../../components/Icon.jsx';

const roleRoutes = {
  student: '/student/dashboard',
  teacher: '/teacher/',
  admin: '/admin/dashboard',
};

export default function TotpChallenge() {
  const { complete2fa, cancel2fa, loading, error } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [formError, setFormError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (code.length !== 6) {
      setFormError('Please enter the full 6-digit code');
      return;
    }
    try {
      const result = await complete2fa(code);
      navigate(roleRoutes[result.user?.role] || '/student/dashboard');
    } catch (err) {
      setFormError(err.message || 'Invalid code. Please try again.');
    }
  }

  function handleCancel() {
    cancel2fa();
    navigate('/');
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
            <div className="relative z-10 max-w-[28rem] text-center">
              <div className="w-20 h-20 bg-secondary-container rounded-full flex items-center justify-center mx-auto mb-md">
                <Icon name="lock" className="text-on-secondary-container text-display-md" />
              </div>
              <h2 className="text-display font-display text-on-primary mt-sm mb-md">Almost There</h2>
              <p className="text-body-lg text-on-primary-container opacity-90 leading-relaxed mb-lg">
                Two-factor authentication is enabled on your account. Enter the code from your authenticator app to complete sign-in securely.
              </p>
              <div className="bg-primary-container/30 backdrop-blur-sm rounded-xl p-md border border-on-primary-container/10 inline-block">
                <p className="text-label-sm text-on-primary">Secure 2FA Verification</p>
              </div>
            </div>
          </section>

          <section className="w-full md:w-1/2 lg:w-2/5 bg-surface flex items-center justify-center p-gutter">
            <div className="w-full max-w-[28rem]">
              <div className="mb-lg text-center md:text-left">
                <h3 className="text-headline-lg text-primary mb-xs">Two-Factor Auth</h3>
                <p className="text-body-md text-on-surface-variant">Enter the 6-digit code from your authenticator app.</p>
              </div>

              {(formError || error) && (
                <div className="mb-md rounded-lg bg-error-container p-sm text-label-md text-error font-bold flex items-center gap-xs">
                  <Icon name="error" /> {formError || error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-lg">
                  <label className="text-label-md font-bold text-on-surface-variant mb-sm block">Authentication Code</label>
                  <div className="relative">
                    <Icon name="lock" className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      className="w-full pl-12 pr-4 h-14 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md text-center text-headline-lg tracking-[0.5em] font-mono"
                      placeholder="000000"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={code.length !== 6 || loading}
                  className="w-full h-12 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-xs"
                >
                  {loading ? <><div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> Verifying...</> : <>Verify & Sign In <Icon name="arrow_forward" /></>}
                </button>
              </form>

              <button onClick={handleCancel} className="w-full h-10 mt-md text-label-md text-on-surface-variant hover:text-primary flex items-center justify-center gap-xs">
                <Icon name="arrow_back" /> Cancel &amp; Go Back
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}