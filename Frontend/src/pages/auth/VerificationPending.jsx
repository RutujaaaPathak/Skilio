import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { authService } from '../../services/authService.js';

const roleRoutes = {
  student: '/student/dashboard',
  teacher: '/teacher/',
  admin: '/admin/dashboard',
};

export default function VerificationPending() {
  const navigate = useNavigate();
  const email = sessionStorage.getItem('pendingEmail') || 'your email';
  const role = sessionStorage.getItem('pendingRole') || 'student';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const inputsRef = useRef([]);

  function handleOtpChange(index, value) {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputsRef.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) inputsRef.current[index - 1]?.focus();
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      await authService.verifyEmail(code);
      sessionStorage.removeItem('pendingEmail');
      const dest = roleRoutes[role] || '/';
      sessionStorage.removeItem('pendingRole');
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      await authService.resendVerification(email);
      setResent(true);
      setOtp(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
      setTimeout(() => setResent(false), 5000);
    } catch {
      // silent
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
            <div className="relative z-10 max-w-[28rem] text-center">
              <div className="w-20 h-20 bg-secondary-container rounded-full flex items-center justify-center mx-auto mb-md">
                <Icon name="mail" className="text-on-secondary-container text-display-md" />
              </div>
              <h2 className="text-display font-display text-on-primary mt-sm mb-md">One Last Step</h2>
              <p className="text-body-lg text-on-primary-container opacity-90 leading-relaxed mb-lg">
                We've sent a 6-digit OTP to your email. Enter it below to activate your account and access the {role} portal.
              </p>
              <div className="bg-primary-container/30 backdrop-blur-sm rounded-xl p-md border border-on-primary-container/10">
                <p className="text-label-sm text-on-primary">Check your inbox (and spam folder)</p>
              </div>
            </div>
          </section>

          <section className="w-full md:w-1/2 lg:w-2/5 bg-surface flex items-center justify-center p-gutter">
            <div className="w-full max-w-[28rem] text-center">
              <div className="w-16 h-16 bg-secondary-container rounded-full flex items-center justify-center mx-auto mb-md">
                <Icon name="pin" className="text-secondary text-headline-lg" />
              </div>
              <h3 className="text-headline-lg text-primary mb-xs">Verify Your Email</h3>
              <p className="text-body-md text-on-surface-variant mb-lg">
                Enter the 6-digit OTP sent to<br />
                <span className="font-bold text-on-surface">{email}</span>
              </p>

              {error && (
                <div className="mb-md rounded-lg bg-error-container p-sm text-label-md text-error font-bold flex items-center gap-xs">
                  <Icon name="error" /> {error}
                </div>
              )}

              <form onSubmit={handleVerify}>
                <div className="flex items-center justify-center gap-sm mb-lg">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (inputsRef.current[i] = el)}
                      className="w-12 h-14 bg-surface-container-low border border-outline-variant rounded-lg focus-ring text-body-md text-center text-headline-lg font-mono font-bold"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={otp.join('').length !== 6 || loading}
                  className="w-full h-12 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-xs"
                >
                  {loading ? <><div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> Verifying...</> : <>Verify OTP <Icon name="arrow_forward" /></>}
                </button>
              </form>

              <button
                onClick={handleResend}
                disabled={resent}
                className="w-full h-10 mt-md text-label-md text-on-surface-variant hover:text-primary disabled:opacity-50 flex items-center justify-center gap-xs"
              >
                <Icon name={resent ? 'check' : 'refresh'} />
                {resent ? 'OTP Sent!' : 'Resend OTP'}
              </button>

              <button
                onClick={() => { sessionStorage.removeItem('pendingEmail'); sessionStorage.removeItem('pendingRole'); navigate(`/${role}/auth/login`); }}
                className="block w-full h-10 text-label-md text-on-surface-variant hover:text-primary"
              >
                Back to Login
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}