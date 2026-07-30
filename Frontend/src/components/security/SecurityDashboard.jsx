import { useState, useEffect, useRef } from 'react';
import Icon from '../Icon.jsx';
import FaceVerificationCard from './FaceVerificationCard.jsx';
import { useSecurityMonitor } from '../../hooks/useSecurityMonitor.js';

const AI_MESSAGES = [
  "Analyzing camera focus...",
  "Environment noise levels are acceptable.",
  "Face detected. Looking sharp!",
  "Verifying system integrity...",
  "Voice signature registered successfully.",
  "Ready to begin the examination.",
];

export default function SecurityDashboard({ onComplete }) {
  const monitor = useSecurityMonitor({ onProceed: onComplete });

  const [aiMsgIndex, setAiMsgIndex] = useState(0);
  const noiseStartedRef = useRef(false);

  const face = monitor.face;
  const speech = monitor.speech;
  const noise = monitor.noise;
  const hardware = monitor.hardware;
  const screen = monitor.screen;

  useEffect(() => {
    const interval = setInterval(() => {
      setAiMsgIndex(i => (i + 1) % AI_MESSAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (face.verified && !noiseStartedRef.current) {
      noiseStartedRef.current = true;
      noise.startMonitoring();
    }
  }, [face.verified]);

  const hardwareReady = hardware.checks.camera.available && hardware.checks.microphone.available && hardware.checks.internet.online;
  const stepsDone = [
    face.verified, speech.passed, hardwareReady,
    noise.classification === 'Quiet' || noise.classification === 'Normal',
    screen.isFullscreen,
  ].filter(Boolean).length;

  const noiseColor = noise.classification === 'Quiet' || noise.classification === 'Analyzing...' ? 'text-green-400'
    : noise.classification === 'Normal' ? 'text-blue-400'
    : noise.classification === 'Noisy' ? 'text-yellow-400'
    : 'text-red-400';

  const noiseBarColor = noise.classification === 'Quiet' ? 'bg-green-500'
    : noise.classification === 'Normal' ? 'bg-blue-500'
    : noise.classification === 'Noisy' ? 'bg-yellow-500'
    : 'bg-red-500';

  return (
    <div className="min-h-screen bg-surface">
      <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant shadow-sm">
        <div className="flex justify-between items-center px-lg py-md max-w-7xl mx-auto">
          <div className="flex items-center gap-sm">
            <span className="text-headline-md font-extrabold text-primary">Skillo</span>
            <span className="h-6 w-px bg-outline-variant mx-1" />
            <span className="text-label-md text-on-surface-variant">Security Verification</span>
          </div>
          <div className="flex items-center gap-md">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-label-sm text-on-surface-variant">Overall Security Status</span>
              <span className="text-label-md text-primary font-bold">{monitor.overallScore}% Secure</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center">
              <Icon name="help" className="text-primary" />
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary-container border-2 border-primary/20 flex items-center justify-center">
              <Icon name="person" className="text-primary" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-md md:px-lg py-xl flex flex-col md:flex-row gap-lg">
        <div className="flex-1 space-y-lg">
          <section>
            <div className="flex items-center gap-sm mb-base">
              <span className="px-sm py-xs bg-primary-container text-on-primary-container text-label-sm rounded-full">
                Step 1 of 7
              </span>
              <span className="h-1 w-1 bg-outline-variant rounded-full" />
              <span className="text-on-surface-variant text-label-sm">Estimated time: 3 mins</span>
            </div>
            <h1 className="text-headline-lg text-on-surface mb-sm">Security Verification</h1>
            <p className="text-on-surface-variant text-body-lg max-w-2xl">
              Before entering the examination, Skillo needs to verify your identity, device, and examination
              environment to ensure integrity.
            </p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-md">
            <div className="lg:col-span-4 bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm flex flex-col gap-md relative overflow-hidden group">
              <FaceVerificationCard
                faceVerification={face}
                prohibitedObjects={monitor.prohibitedObjects}
              />
            </div>

            <div className="lg:col-span-2 bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm flex flex-col justify-between group">
              <div className="flex items-center gap-sm mb-md">
                <Icon name="mic" className="text-primary" />
                <h3 className="text-headline-sm">Voice</h3>
              </div>
              <div className="flex flex-col gap-sm flex-1">
                <p className="text-on-surface-variant text-label-sm">
                  {speech.expectedSentence ? 'Please read aloud:' : 'Wait for face verification to complete'}
                </p>
                {speech.expectedSentence && (
                  <div className="bg-surface-container p-sm rounded-lg border border-outline-variant italic text-body-md text-on-surface text-center">
                    &ldquo;{speech.expectedSentence}&rdquo;
                  </div>
                )}
                {speech.recognizedSentence && (
                  <div className="bg-surface-container/60 p-sm rounded-lg border border-outline-variant text-body-sm text-on-surface text-center">
                    Recognized: &ldquo;{speech.recognizedSentence}&rdquo;
                  </div>
                )}
                {speech.similarity > 0 && (
                  <div className="flex items-center justify-center gap-xs text-label-sm">
                    <span className="text-on-surface-variant">Match:</span>
                    <span className={`font-bold font-mono ${speech.similarity >= 90 ? 'text-green-400' : 'text-yellow-400'}`}>
                      {speech.similarity}%
                    </span>
                  </div>
                )}
              </div>
              <div className="mt-lg flex flex-col items-center gap-sm">
                <div className="flex gap-1 items-end h-8">
                  {[0.1, 0.3, 0.2, 0.4, 0.1].map((delay, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full mic-bar"
                      style={{
                        animationDelay: `${delay}s`,
                        background: speech.status === 'running'
                          ? 'rgba(99,102,241,0.7)'
                          : 'rgba(99,102,241,0.2)',
                      }}
                    />
                  ))}
                </div>
                {speech.status === 'idle' && !face.verified && (
                  <span className="text-on-surface-variant text-label-sm">Waiting for face verification...</span>
                )}
                {speech.status === 'idle' && face.verified && (
                  <button onClick={speech.startVerification} className="px-lg py-sm bg-primary text-on-primary text-label-md rounded-lg hover:bg-primary/90 transition-all cursor-pointer">
                    Ready to Speak
                  </button>
                )}
                {speech.status === 'running' && (
                  <span className="text-primary text-label-sm animate-pulse">
                    Recording... Attempt {speech.attempts + 1}/{speech.maxAttempts}
                  </span>
                )}
                {speech.status === 'passed' && (
                  <span className="text-green-400 text-label-sm font-bold">Voice verified</span>
                )}
                {speech.status === 'failed' && (
                  <div className="flex flex-col items-center gap-xs">
                    <span className="text-red-400 text-label-sm">{speech.error || 'Verification failed'}</span>
                    {speech.attempts < speech.maxAttempts && (
                      <button onClick={speech.retry} className="px-sm py-xs bg-primary/20 text-primary text-label-sm rounded-lg hover:bg-primary/30 cursor-pointer">
                        Try Again ({speech.attempts}/{speech.maxAttempts})
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm space-y-md">
              <div className="flex items-center gap-sm">
                <Icon name="laptop_mac" className="text-primary" />
                <h3 className="text-headline-sm">Hardware</h3>
              </div>
              <ul className="space-y-sm">
                {[
                  { icon: 'check_circle', label: 'Webcam', detail: hardware.checks.camera.available ? 'Ready' : 'Checking...', ok: hardware.checks.camera.available },
                  { icon: 'check_circle', label: 'Microphone', detail: hardware.checks.microphone.available ? 'Active' : 'Checking...', ok: hardware.checks.microphone.available },
                  { icon: 'check_circle', label: 'Internet', detail: hardware.checks.internet.online ? `${hardware.checks.internet.speed || ''} Mbps`.trim() || 'Online' : 'Offline', ok: hardware.checks.internet.online },
                ].map((item, i) => (
                  <li key={i} className="flex items-center justify-between p-sm rounded-lg hover:bg-surface-container transition-colors">
                    <div className="flex items-center gap-sm">
                      <Icon name={item.ok ? 'check_circle' : 'radio_button_unchecked'} className={item.ok ? 'text-green-400' : 'text-on-surface-variant'} fill={item.ok} />
                      <span className="text-label-md">{item.label}</span>
                    </div>
                    <span className="text-on-surface-variant text-label-sm">{item.detail}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2 bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm flex flex-col gap-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-sm">
                  <Icon name="volume_up" className="text-primary" />
                  <h3 className="text-headline-sm">Ambiance</h3>
                </div>
                <span className={`text-label-sm font-bold ${noiseColor}`}>{noise.classification}</span>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full h-12 relative flex items-center gap-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full h-px bg-outline-variant" />
                  </div>
                  <div className="flex items-center gap-0.5 z-10 w-full justify-around">
                    {noise.waveform.map((val, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full ${noiseBarColor}`}
                        style={{
                          height: `${Math.max(2, val * 24)}px`,
                          opacity: 0.3 + val * 0.7,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-on-surface-variant text-label-sm text-center">
                Background Noise Analysis: <span className="text-on-surface font-semibold">{noise.noiseLevel}%</span>
              </p>
            </div>

            <div className="lg:col-span-2 bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm space-y-md">
              <div className="flex items-center gap-sm">
                <Icon name="usb" className="text-primary" />
                <h3 className="text-headline-sm">Peripherals</h3>
              </div>
              <div className="flex items-center gap-md">
                <div className="flex-1 p-sm bg-surface-container rounded-lg border border-outline-variant flex flex-col items-center">
                  <Icon name="bluetooth" className="text-on-surface-variant" />
                  <span className="text-label-sm mt-xs">Prohibited</span>
                  <span className={`text-[10px] font-bold ${monitor.prohibitedObjects.length === 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {monitor.prohibitedObjects.length === 0 ? 'CLEAR' : monitor.prohibitedObjects[0]}
                  </span>
                </div>
                <div className="flex-1 p-sm bg-surface-container rounded-lg border border-outline-variant flex flex-col items-center">
                  <Icon name="cable" className="text-on-surface-variant" />
                  <span className="text-label-sm mt-xs">External IO</span>
                  <span className="text-green-400 text-[10px] font-bold">CLEAN</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm space-y-md">
              <div className="flex items-center gap-sm">
                <Icon name="monitor" className="text-primary" />
                <h3 className="text-headline-sm">Environment</h3>
              </div>
              <div className="grid grid-cols-2 gap-sm">
                <div className="p-sm rounded-lg bg-surface-container flex flex-col">
                  <span className="text-on-surface-variant text-label-sm">Monitors</span>
                  <span className="text-headline-sm text-on-surface">
                    01
                    <span className="text-green-400 text-xs ml-1">✓</span>
                  </span>
                </div>
                <div className="p-sm rounded-lg bg-surface-container flex flex-col">
                  <span className="text-on-surface-variant text-label-sm">Focus Status</span>
                  <span className="text-headline-sm text-on-surface">
                    {screen.isFullscreen ? 'Locked' : 'Unlocked'}
                    <span className={`text-xs ml-1 ${screen.isFullscreen ? 'text-green-400' : 'text-yellow-400'}`}>
                      {screen.isFullscreen ? '✓' : '○'}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 bg-primary-container p-md rounded-xl border border-primary text-on-primary-container flex items-center gap-lg relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="relative z-10 flex flex-col">
                <h3 className="text-headline-sm mb-xs">Security Score</h3>
                <div className="flex items-baseline gap-xs">
                  <span className="text-4xl font-extrabold">{monitor.overallScore}</span>
                  <span className="text-lg opacity-80">/ 100</span>
                </div>
                <span className="mt-sm text-label-md px-sm py-xs bg-white/20 rounded-full w-fit">
                  {monitor.riskLevel} AI Risk Level
                </span>
              </div>
              <div className="relative z-10 flex-1 grid grid-cols-2 gap-sm">
                {[
                  { icon: 'shield', label: 'ID Verified', ok: face.verified },
                  { icon: 'devices', label: 'Device OK', ok: hardwareReady },
                  { icon: 'check_circle', label: 'Clean Desk', ok: noise.classification === 'Quiet' || noise.classification === 'Normal' },
                  { icon: 'wifi', label: 'Stable Conn', ok: hardware.checks.internet.online },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-xs">
                    <Icon name={item.icon} className="text-sm" />
                    <span className="text-label-sm">{item.label}</span>
                    {item.ok && <Icon name="check" className="text-xs text-green-300" fill />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-lg flex items-center justify-between border-t border-outline-variant">
            <div className="flex items-center gap-sm">
              <Icon name="info" className="text-orange-400" />
              <p className="text-on-surface-variant text-label-sm">
                {monitor.proceedError || 'Please do not refresh this page during the verification process.'}
              </p>
            </div>
            <button
              onClick={monitor.handleProceed}
              disabled={!monitor.allVerified}
              className="px-xl py-md bg-primary text-on-primary text-headline-sm rounded-lg shadow-lg hover:shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
            >
              Enter Exam
            </button>
          </div>
        </div>

        <aside className="w-full md:w-80 space-y-md">
          <div className="sticky top-24 space-y-md">
            <div className="bg-surface-container-low p-md rounded-xl border border-outline-variant shadow-md">
              <div className="flex items-center gap-sm mb-lg">
                <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center">
                  <Icon name="verified_user" className="text-on-primary-container" />
                </div>
                <div>
                  <h4 className="text-label-md font-bold">Verification Steps</h4>
                  <p className="text-on-surface-variant text-body-sm">{6 - stepsDone} tasks remaining</p>
                </div>
              </div>
              <nav className="space-y-sm">
                {[
                  { icon: 'face', label: 'Face Recognition', done: face.verified },
                  { icon: 'mic', label: 'Voice Signature', done: speech.passed },
                  { icon: 'devices', label: 'Hardware Check', done: hardwareReady },
                  { icon: 'noise_control_off', label: 'Ambient Noise', done: noise.classification === 'Quiet' || noise.classification === 'Normal' },
                  { icon: 'screen_share', label: 'Screen Integrity', done: screen.isFullscreen },
                ].map((step, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-sm p-sm rounded-lg transition-all ${
                      step.done
                        ? 'bg-secondary-container text-on-secondary-container font-bold'
                        : 'text-on-surface-variant hover:bg-surface-variant cursor-pointer'
                    }`}
                  >
                    <Icon name={step.icon} />
                    <span className="text-label-md flex-1">{step.label}</span>
                    {step.done && <Icon name="check_circle" className="text-sm" fill />}
                  </div>
                ))}
              </nav>
              <div className="mt-lg pt-md border-t border-outline-variant">
                <button className="w-full py-sm bg-surface-container-high text-primary text-label-md rounded-lg hover:bg-surface-container-highest transition-all">
                  Need Help?
                </button>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-md flex items-start gap-md relative overflow-hidden group">
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 w-12 h-12 rounded-full bg-primary overflow-hidden border-2 border-primary-container shrink-0 flex items-center justify-center">
                <Icon name="smart_toy" className="text-on-primary" />
              </div>
              <div className="relative z-10 flex-1">
                <h5 className="text-label-md font-bold text-primary">Proctor AI</h5>
                <p className="text-on-surface-variant text-body-sm leading-tight mt-xs transition-opacity duration-300">
                  &ldquo;{AI_MESSAGES[aiMsgIndex]}&rdquo;
                </p>
                <div className="mt-sm flex gap-xs">
                  {[0.1, 0.2, 0.3].map((d, i) => (
                    <span key={i} className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${d}s` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 w-full p-md bg-surface/90 backdrop-blur-md border-t border-outline-variant z-40">
        <button
          onClick={monitor.handleProceed}
          disabled={!monitor.allVerified}
          className="w-full py-md bg-primary text-on-primary text-headline-sm rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Enter Exam
        </button>
      </div>
    </div>
  );
}
