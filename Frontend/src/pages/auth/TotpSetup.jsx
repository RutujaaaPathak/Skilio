import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { authService } from '../../services/authService.js';
import Icon from '../../components/Icon.jsx';

const steps = [
  { key: 'scan', label: 'Scan QR', icon: 'qr_code_scanner' },
  { key: 'backup', label: 'Backup Codes', icon: 'save' },
  { key: 'verify', label: 'Verify', icon: 'verified' },
];

export default function TotpSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [secret, setSecret] = useState('');
  const [uri, setUri] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codesSaved, setCodesSaved] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    authService.getTotpStatus().then((res) => {
      if (res.is_enabled) {
        navigate(-1);
      } else {
        authService.setupTotp().then((data) => {
          setSecret(data.secret);
          setUri(data.provisioning_uri);
          setBackupCodes(data.backup_codes);
        });
      }
    });
  }, [navigate]);

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.enableTotp(code);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopyCodes() {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCodesSaved(true);
  }

  if (!secret) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-sm text-on-surface-variant">
          <div className="w-5 h-5 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-gutter">
        <div className="w-full max-w-md bg-surface rounded-2xl shadow-lg p-xl text-center">
          <div className="w-16 h-16 bg-tertiary-container rounded-full flex items-center justify-center mx-auto mb-md">
            <Icon name="verified" className="text-tertiary text-headline-lg" />
          </div>
          <h2 className="text-headline-md text-on-surface mb-xs">2FA Enabled Successfully!</h2>
          <p className="text-body-md text-on-surface-variant mb-lg">
            Your account is now protected with two-factor authentication.
          </p>
          <button
            onClick={() => navigate('/student/settings')}
            className="w-full h-12 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 flex items-center justify-center gap-xs"
          >
            Done <Icon name="arrow_forward" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen flex flex-col overflow-x-hidden">
      <header className="bg-surface border-b border-outline-variant h-16 flex items-center px-gutter fixed w-full z-50">
        <div className="flex items-center gap-xs">
          <Icon name="shield" className="text-primary text-headline-md" />
          <h1 className="text-headline-md font-bold text-primary">Skillo</h1>
        </div>
        <button onClick={() => navigate(-1)} className="ml-auto text-on-surface-variant hover:text-primary">
          <Icon name="close" />
        </button>
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
                <Icon name="security" className="text-on-secondary-container text-display-md" />
              </div>
              <h2 className="text-display font-display text-on-primary mt-sm mb-md">Double the Security</h2>
              <p className="text-body-lg text-on-primary-container opacity-90 leading-relaxed mb-lg">
                Two-factor authentication adds an extra layer of protection. Even if your password is compromised, your account stays secure.
              </p>
              <div className="grid grid-cols-3 gap-sm">
                {['Authenticator App', 'Backup Codes', 'Enhanced Safety'].map((label) => (
                  <div key={label} className="bg-primary-container/30 backdrop-blur-sm rounded-xl p-sm border border-on-primary-container/10">
                    <p className="text-label-sm text-on-primary font-bold">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="w-full md:w-1/2 lg:w-2/5 bg-surface flex items-start justify-center p-gutter overflow-y-auto">
            <div className="w-full max-w-[28rem] pt-lg">
              <div className="mb-lg text-center md:text-left">
                <h3 className="text-headline-lg text-primary mb-xs">Set Up 2FA</h3>
                <p className="text-body-md text-on-surface-variant">Follow the steps to enable two-factor authentication.</p>
              </div>

              <div className="flex items-center justify-between mb-lg">
                {steps.map((s, i) => (
                  <div key={s.key} className="flex items-center">
                    <div className={`flex items-center gap-xs ${i <= currentStep ? 'text-primary' : 'text-on-surface-variant/50'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-label-sm font-bold ${i < currentStep ? 'bg-tertiary-container text-tertiary' : i === currentStep ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant/50'}`}>
                        {i < currentStep ? <Icon name="check" className="text-sm" /> : i + 1}
                      </div>
                      <span className={`text-label-sm font-bold hidden sm:inline ${i === currentStep ? 'text-on-surface' : ''}`}>{s.label}</span>
                    </div>
                    {i < steps.length - 1 && <div className={`w-8 sm:w-12 h-0.5 ml-xs ${i < currentStep ? 'bg-tertiary-container' : 'bg-outline-variant'}`} />}
                  </div>
                ))}
              </div>

              {currentStep === 0 && (
                <div className="bg-surface-container-low rounded-xl p-lg mb-lg">
                  <h2 className="text-label-lg font-bold text-on-surface mb-sm">Scan QR Code</h2>
                  <p className="text-body-sm text-on-surface-variant mb-md">
                    Open your authenticator app and scan this QR code.
                  </p>
                  <div className="bg-surface rounded-lg p-md flex justify-center mb-md">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(uri)}`}
                      alt="QR Code"
                      className="rounded-lg"
                    />
                  </div>
                  <div className="bg-background rounded-lg p-md">
                    <p className="text-label-sm text-on-surface-variant mb-xs">Or enter this key manually:</p>
                    <div className="flex items-center gap-xs">
                      <code className="flex-1 text-body-sm font-mono font-bold text-primary bg-surface-container-low rounded p-xs text-center tracking-wider select-all">{secret}</code>
                      <button onClick={() => navigator.clipboard.writeText(secret)} className="shrink-0 w-9 h-9 rounded-lg bg-secondary-container text-on-secondary-container hover:opacity-80 flex items-center justify-center">
                        <Icon name="content_copy" className="text-sm" />
                      </button>
                    </div>
                  </div>
                  <button onClick={() => setCurrentStep(1)} className="mt-md w-full h-12 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 flex items-center justify-center gap-xs">
                    Continue <Icon name="arrow_forward" />
                  </button>
                </div>
              )}

              {currentStep === 1 && (
                <div className="bg-surface-container-low rounded-xl p-lg mb-lg">
                  <h2 className="text-label-lg font-bold text-on-surface mb-sm">Save Backup Codes</h2>
                  <p className="text-body-sm text-on-surface-variant mb-md">
                    Store these codes somewhere safe. Each can be used <span className="text-on-surface font-bold">once</span> if you lose access to your authenticator.
                  </p>
                  <div className="bg-background rounded-lg p-md mb-md grid grid-cols-2 gap-sm">
                    {backupCodes.map((c) => (
                      <div key={c} className="font-mono text-body-sm text-on-surface bg-surface-container-low rounded p-xs text-center tracking-wider">{c}</div>
                    ))}
                  </div>
                  <div className="flex gap-sm">
                    <button onClick={handleCopyCodes} className={`flex-1 h-12 rounded-lg font-bold text-label-md flex items-center justify-center gap-xs ${codesSaved ? 'bg-tertiary-container text-tertiary' : 'bg-secondary-container text-on-secondary-container'} hover:opacity-90`}>
                      <Icon name={codesSaved ? 'check' : 'content_copy'} />
                      {codesSaved ? 'Copied' : 'Copy Codes'}
                    </button>
                    <button onClick={() => { setCodesSaved(true); setCurrentStep(2); }} className="flex-1 h-12 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 flex items-center justify-center gap-xs">
                      Continue <Icon name="arrow_forward" />
                    </button>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="bg-surface-container-low rounded-xl p-lg mb-lg">
                  <h2 className="text-label-lg font-bold text-on-surface mb-sm">Verify Setup</h2>
                  <p className="text-body-sm text-on-surface-variant mb-md">
                    Enter the 6-digit code from your authenticator app to enable 2FA.
                  </p>
                  <form onSubmit={handleVerify}>
                    {error && (
                      <div className="mb-md rounded-lg bg-error-container p-sm text-label-md text-error font-bold flex items-center gap-xs">
                        <Icon name="error" /> {error}
                      </div>
                    )}
                    <input
                      className="w-full h-14 px-4 bg-surface border border-outline-variant rounded-lg focus-ring text-body-md text-center text-headline-lg tracking-[0.5em] font-mono"
                      placeholder="000000"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      autoFocus
                    />
                    <div className="flex gap-sm mt-md">
                      <button type="button" onClick={() => setCurrentStep(0)} className="flex-1 h-12 border border-outline-variant text-on-surface-variant font-bold rounded-lg hover:bg-surface-container-low">
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={code.length !== 6 || loading}
                        className="flex-1 h-12 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-xs"
                      >
                        {loading ? <><div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> Verifying...</> : 'Enable 2FA'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}