import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/Icon.jsx';

const PHRASE = 'My identity is verified for this secure exam';
const CORE_WORDS = ['my', 'identity', 'is', 'verified', 'for', 'secure', 'exam'];
const MATCH_THRESHOLD = 4;

function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const m = [];
  for (let i = 0; i <= b.length; i++) m[i] = [i];
  for (let j = 0; j <= a.length; j++) m[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      m[i][j] = b[i - 1] === a[j - 1]
        ? m[i - 1][j - 1]
        : 1 + Math.min(m[i - 1][j - 1], m[i - 1][j], m[i][j - 1]);
    }
  }
  return m[b.length][a.length];
}

function normalizeWord(w) {
  return w.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
}

function wordsMatch(spoken, target) {
  const s = normalizeWord(spoken);
  const t = normalizeWord(target);
  if (s === t) return true;
  if (s.length < 3 || t.length < 3) return false;
  const maxDist = Math.max(1, Math.floor(Math.min(s.length, t.length) / 4));
  return levenshtein(s, t) <= maxDist;
}

function scorePhrase(spoken) {
  const tokens = tokenize(spoken);
  if (tokens.length === 0) return 0;

  let fuzzy = 0;
  const used = new Set();
  for (const cw of CORE_WORDS) {
    for (let i = 0; i < tokens.length; i++) {
      if (used.has(i)) continue;
      if (wordsMatch(tokens[i], cw)) { fuzzy++; used.add(i); break; }
    }
  }

  let ord = 0;
  for (const w of tokens) {
    if (ord < CORE_WORDS.length && wordsMatch(w, CORE_WORDS[ord])) ord++;
  }

  return Math.max(fuzzy, ord);
}

function computeRMS(timeDomain) {
  let sumSq = 0;
  for (let i = 0; i < timeDomain.length; i++) {
    const d = timeDomain[i] - 128;
    sumSq += d * d;
  }
  const rms = Math.sqrt(sumSq / timeDomain.length);
  const pct = (rms / 128) * 100;
  if (pct < 1.5) return 0;
  return Math.min(100, Math.round(pct));
}

export default function VoiceVerification() {
  const navigate = useNavigate();
  const [step, setStep] = useState('idle');
  const [displayTranscript, setDisplayTranscript] = useState('');
  const [progress, setProgress] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [message, setMessage] = useState('');
  const [micDevices, setMicDevices] = useState([]);
  const [selectedMicId, setSelectedMicId] = useState('');
  const [recognitionActive, setRecognitionActive] = useState(false);

  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const aliveRef = useRef(false);
  const recognizerRef = useRef(null);
  const restartTimerRef = useRef(null);
  const fullTranscriptRef = useRef('');
  const sessionTranscriptRef = useRef('');
  const smoothLevelRef = useRef(0);

  function finishVerified(text) {
    aliveRef.current = false;
    killRecognizer();
    killRestartTimer();
    killAnimation();
    killAudio();
    setDisplayTranscript(text);
    setProgress(100);
    setStep('verified');
    setMessage('Voice verified!');
  }

  function killRecognizer() {
    const r = recognizerRef.current;
    if (r) {
      r.onresult = null;
      r.onerror = null;
      r.onend = null;
      r.onaudiostart = null;
      try { r.abort(); } catch { /* abort may throw if already inactive */ }
      recognizerRef.current = null;
    }
    setRecognitionActive(false);
  }

  function killRestartTimer() {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }

  function killAnimation() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function killAudio() {
    if (audioCtxRef.current) {
      const c = audioCtxRef.current;
      audioCtxRef.current = null;
      c.close().catch(() => null);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    analyserRef.current = null;
  }

  function cleanupAll() {
    aliveRef.current = false;
    killRecognizer();
    killRestartTimer();
    killAnimation();
    killAudio();
  }

  /* ---- microphone + audio level monitoring ---- */

  function startMic() {
    cleanupAll();
    aliveRef.current = true;
    setStep('recording');
    setDisplayTranscript('');
    setProgress(0);
    setAudioLevel(0);
    setRecognitionActive(false);
    setMessage('Starting microphone\u2026');
    fullTranscriptRef.current = '';
    sessionTranscriptRef.current = '';
    smoothLevelRef.current = 0;

    navigator.mediaDevices.getUserMedia({
      audio: selectedMicId
        ? { deviceId: { exact: selectedMicId } }
        : true,
    }).then(stream => {
      if (!aliveRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const ana = ctx.createAnalyser();
      ana.fftSize = 256;
      src.connect(ana);
      analyserRef.current = ana;

      const buf = new Uint8Array(ana.fftSize);

      function loop() {
        if (!aliveRef.current || !analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(buf);
        const raw = computeRMS(buf);
        smoothLevelRef.current += (raw - smoothLevelRef.current) * 0.25;
        setAudioLevel(Math.round(smoothLevelRef.current));
        rafRef.current = requestAnimationFrame(loop);
      }
      loop();

      setMessage('Microphone ready. Tap "Speak" and say the phrase.');
    }).catch(e => {
      setMessage('Mic error: ' + e.message);
      aliveRef.current = false;
    });
  }

  /* ---- speech recognition ---- */

  function startRecognition() {
    if (!aliveRef.current) return;
    killRecognizer();
    killRestartTimer();

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMessage('Speech recognition not available. Use Chrome or Edge.');
      return;
    }

    sessionTranscriptRef.current = '';

    const r = new SR();
    recognizerRef.current = r;
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'en-US';

    r.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          fullTranscriptRef.current += ' ' + event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      fullTranscriptRef.current = fullTranscriptRef.current.replace(/\s+/g, ' ').trim();
      sessionTranscriptRef.current = interim;
      const combined = (fullTranscriptRef.current + ' ' + interim).trim();
      setDisplayTranscript(combined);
      setProgress(Math.min(100, Math.round((scorePhrase(combined) / CORE_WORDS.length) * 100)));

      if (scorePhrase(combined) >= MATCH_THRESHOLD) {
        finishVerified(combined);
      }
    };

    r.onerror = (e) => {
      if (e.error === 'not-allowed') {
        setMessage('Microphone access blocked. Allow mic access and try again.');
        aliveRef.current = false;
        killRestartTimer();
      }
    };

    r.onend = () => {
      if (recognizerRef.current !== r) return;
      recognizerRef.current = null;
      setRecognitionActive(false);

      if (!aliveRef.current) return;

      if (fullTranscriptRef.current) {
        const combined = (fullTranscriptRef.current + ' ' + sessionTranscriptRef.current).trim();
        if (scorePhrase(combined) >= MATCH_THRESHOLD) {
          finishVerified(combined);
          return;
        }
      }

      restartTimerRef.current = setTimeout(startRecognition, 600);
    };

    try {
      r.start();
      setRecognitionActive(true);
      setMessage('Listening\u2026');
    } catch (e) {
      setMessage('Could not start: ' + e.message);
      recognizerRef.current = null;
    }
  }

  function handleStop() {
    killRestartTimer();
    if (recognizerRef.current) {
      killRecognizer();
      const combined = (fullTranscriptRef.current + ' ' + sessionTranscriptRef.current).trim();
      const score = scorePhrase(combined);
      if (combined && score >= MATCH_THRESHOLD) {
        finishVerified(combined);
        return;
      }
      setMessage('Matched ' + score + '/' + CORE_WORDS.length + ' words. Tap "Speak" to try again.');
      if (combined) {
        setDisplayTranscript(combined);
        setProgress(Math.min(100, Math.round((score / CORE_WORDS.length) * 100)));
      }
    }
  }

  function cancel() {
    aliveRef.current = false;
    cleanupAll();
    setStep('idle');
    setProgress(0);
    setAudioLevel(0);
    setDisplayTranscript('');
    setMessage('');
    setRecognitionActive(false);
  }

  /* ---- lifecycle ---- */

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(s => {
      s.getTracks().forEach(t => t.stop());
      return navigator.mediaDevices.enumerateDevices();
    }).then(d => setMicDevices(d.filter(x => x.kind === 'audioinput'))).catch(() => {});
    return () => cleanupAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- bar visuals ---- */

  const bh = [35, 60, 45, 80, 50, 70, 40];

  function barHeight(index) {
    const level = audioLevel;
    if (level === 0) return 3;
    const variance = 0.55 + 0.45 * Math.sin(index * 1.8 + Date.now() / 280);
    return Math.max(3, (level / 100) * 85 * variance);
  }

  /* ---- render ---- */

  return (
    <main className="min-h-screen bg-surface p-gutter flex items-center justify-center">
      <section className="max-w-[36rem] w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-gutter text-center space-y-md">
        <Icon name="keyboard_voice" className="text-primary text-[56px]" />
        <h1 className="text-headline-lg text-primary font-bold">Voice Verification</h1>

        {step === 'idle' && (
          <>
            <p className="text-on-surface-variant mb-md">
              Read the phrase aloud: <b>&ldquo;{PHRASE}&rdquo;</b>
            </p>
            {micDevices.length > 1 && (
              <div className="mb-md">
                <label className="text-xs font-bold text-on-surface-variant block mb-xs">Microphone</label>
                <select value={selectedMicId} onChange={e => setSelectedMicId(e.target.value)} className="input w-full">
                  {micDevices.map(m => (
                    <option key={m.deviceId} value={m.deviceId}>{m.label || `Mic ${m.deviceId.slice(0, 6)}`}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-end gap-1.5 h-24 justify-center mb-md">
              {bh.map((h, i) => (
                <div key={i} className="w-5 bg-secondary rounded-full transition-all duration-75" style={{ height: `${h}%` }} />
              ))}
            </div>
            <button onClick={startMic} className="inline-flex h-12 px-lg items-center justify-center bg-secondary text-primary rounded-lg font-bold gap-xs cursor-pointer hover:opacity-90">
              <Icon name="mic" /> Start Verification
            </button>
          </>
        )}

        {step === 'recording' && (
          <div className="space-y-md">
            <p className="text-on-surface-variant">Say: <b>&ldquo;{PHRASE}&rdquo;</b></p>
            {message && <p className="text-sm font-semibold" style={{ color: recognitionActive ? '#22c55e' : '#a855f7' }}>{message}</p>}
            <div className="flex items-end gap-1.5 h-24 justify-center">
              {bh.map((_, i) => (
                <div key={i} className="w-5 rounded-full transition-all duration-75" style={{
                  height: `${Math.round(barHeight(i))}%`,
                  background: recognitionActive
                    ? (audioLevel > 50 ? 'linear-gradient(to top, #22c55e, #16a34a)' : 'linear-gradient(to top, #3b82f6, #2563eb)')
                    : 'linear-gradient(to top, #a855f7, #7e22ce)',
                }} />
              ))}
            </div>
            <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm font-bold text-primary">{progress}% matched</span>
            <div className="min-h-[3rem] text-xs font-mono bg-surface p-xs rounded border border-outline-variant max-w-sm mx-auto flex items-center justify-center">
              {displayTranscript ? (
                <span className="text-primary">&ldquo;{displayTranscript}&rdquo;</span>
              ) : (
                <span className="text-on-surface-variant italic">{recognitionActive ? 'Waiting for speech\u2026' : 'Tap "Speak" to start'}</span>
              )}
            </div>
            <div className="flex gap-sm justify-center flex-wrap">
              {recognitionActive ? (
                <button onClick={handleStop} className="px-md py-sm bg-red-500 text-white font-bold rounded-lg text-sm cursor-pointer hover:opacity-90 inline-flex items-center gap-xs">
                  <Icon name="stop" className="text-sm" /> Stop
                </button>
              ) : (
                <button onClick={startRecognition} className="px-md py-sm bg-secondary text-primary font-bold rounded-lg text-sm cursor-pointer hover:opacity-90 inline-flex items-center gap-xs">
                  <Icon name="mic" className="text-sm" /> Speak
                </button>
              )}
              <button onClick={cancel} className="px-md py-sm border border-outline-variant rounded-lg text-sm text-on-surface-variant cursor-pointer hover:bg-surface-container">Cancel</button>
            </div>
          </div>
        )}

        {step === 'verified' && (
          <div className="space-y-md">
            <Icon name="check_circle" className="text-primary text-[56px]" fill />
            <p className="text-primary font-bold">{message}</p>
            {displayTranscript && (
              <div className="text-xs font-mono bg-surface p-xs rounded border border-outline-variant max-w-sm mx-auto">
                <span className="text-on-surface-variant">Heard: </span>
                <span className="text-primary">&ldquo;{displayTranscript}&rdquo;</span>
              </div>
            )}
            <div className="flex items-end gap-1.5 h-24 justify-center mb-md">
              {bh.map((h, i) => (<div key={i} className="w-5 bg-primary rounded-full" style={{ height: `${h}%` }} />))}
            </div>
            <button onClick={() => navigate('/student/exams/security-check')} className="inline-flex h-12 px-lg items-center justify-center bg-secondary text-primary rounded-lg font-bold gap-xs cursor-pointer hover:opacity-90">
              Continue to Security Check <Icon name="arrow_forward" />
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
