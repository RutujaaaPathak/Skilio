import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/Icon.jsx';

const steps = [
  { title: 'Device Integrity', subtitle: 'VM Detection & Lockdown', icon: 'terminal' },
  { title: 'Environment Scan', subtitle: 'AI Noise & Object Analysis', icon: 'sensors' },
  { title: 'Face Verification', subtitle: 'Biometric identity matching', icon: 'face' },
  { title: 'Voice Verification', subtitle: 'Phrase repetition test', icon: 'keyboard_voice' }
];

export default function PreExamSecurityCheck() {
  const [verifiedCount, setVerifiedCount] = useState(1);
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const clock = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    const timers = [
      setTimeout(() => setVerifiedCount(2), 2500),
      setTimeout(() => setVerifiedCount(3), 5000),
      setTimeout(() => setVerifiedCount(4), 7500)
    ];
    return () => {
      clearInterval(clock);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="bg-surface min-h-screen text-on-surface overflow-x-hidden">
      <div className="fixed top-0 left-0 w-full h-1 bg-surface-container-highest z-50">
        <div className="h-full bg-secondary transition-all duration-1000" style={{ width: `${(verifiedCount / 4) * 100}%` }} />
      </div>
      <header className="flex justify-between items-center w-full px-gutter h-16 bg-surface border-b border-outline-variant fixed top-0 z-40">
        <div className="flex items-center gap-base">
          <span className="text-headline-md font-bold text-primary">Skillo</span>
          <span className="text-label-md bg-surface-container-high px-base py-xs rounded text-on-surface-variant">System Integrity</span>
        </div>
        <div className="flex items-center gap-md">
          <span className="text-label-md text-on-surface-variant">{time}</span>
          <Icon name="help_outline" className="text-primary" />
        </div>
      </header>

      <main className="pt-24 pb-lg px-gutter max-w-container-max mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg items-start">
          <section className="lg:col-span-5 space-y-md">
            <div>
              <h1 className="text-headline-lg text-primary font-bold">Security Integrity Check</h1>
              <p className="text-on-surface-variant">Complete all verification steps to unlock your examination dashboard.</p>
            </div>
            <div className="space-y-base">
              {steps.map((step, index) => {
                const status = index < verifiedCount ? 'verified' : index === verifiedCount ? 'checking' : 'pending';
                return <CheckStep key={step.title} {...step} status={status} />;
              })}
            </div>
            {verifiedCount === 4 ? (
              <Link to="/student/exams/interface" className="w-full py-md px-lg bg-secondary text-primary font-bold rounded-xl flex justify-center items-center gap-base shadow-lg">
                Start Secure Exam <Icon name="arrow_forward" />
              </Link>
            ) : (
              <button className="w-full py-md px-lg bg-surface-container-highest text-on-surface-variant font-bold rounded-xl cursor-not-allowed" disabled>
                Start Secure Exam
              </button>
            )}
          </section>

          <section className="lg:col-span-7">
            <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-primary shadow-2xl border-4 border-surface">
              <div className="w-full h-full bg-gradient-to-br from-primary via-primary-container to-secondary-container opacity-90" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-80 rounded-[100%] border-2 border-secondary border-dashed animate-pulse-ring" />
              </div>
              <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-secondary/20 to-transparent scan-beam" />
              <div className="absolute top-md left-md flex items-center gap-base">
                <div className="flex items-center gap-xs bg-error/90 text-white px-base py-xs rounded-full animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full" />
                  <span className="text-label-sm font-bold tracking-widest">LIVE FEED</span>
                </div>
              </div>
              <div className="absolute bottom-md left-md right-md flex justify-between items-end p-md bg-black/30 rounded-xl backdrop-blur-md">
                <div className="text-white/80 flex items-center gap-base"><Icon name="psychology" className="text-secondary" /> AI Proctoring Active</div>
                <div className="text-right"><div className="text-secondary text-headline-sm font-bold">88% Match</div><div className="text-white/60 text-label-sm">Biometric Confidence</div></div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function CheckStep({ title, subtitle, icon, status }) {
  const active = status === 'checking';
  const verified = status === 'verified';
  return (
    <div className={`p-md bg-surface-container-low rounded-xl flex items-center justify-between transition-all ${active ? 'border-2 border-secondary shadow-sm' : 'border border-outline-variant'} ${status === 'pending' ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-md">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${active ? 'bg-secondary text-on-secondary' : verified ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
          <Icon name={icon} />
        </div>
        <div><h3 className="text-headline-sm font-bold">{title}</h3><p className="text-label-md text-on-surface-variant">{subtitle}</p></div>
      </div>
      {verified && <div className="flex items-center gap-xs"><span className="text-label-md font-bold text-on-tertiary-container bg-tertiary-fixed px-base py-xs rounded-full">Verified</span><Icon name="check_circle" className="text-on-tertiary-container" fill /></div>}
      {active && <div className="flex items-center gap-xs"><span className="text-label-md font-bold text-secondary bg-secondary-fixed px-base py-xs rounded-full">Checking</span><div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" /></div>}
      {status === 'pending' && <span className="text-label-md font-bold text-on-surface-variant">Pending</span>}
    </div>
  );
}
