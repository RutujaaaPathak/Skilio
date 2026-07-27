import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/Icon.jsx';
import { api } from '../../../services/api.js';

const PHRASE = 'My identity is verified for this secure exam';
const CORE_WORDS = ['my', 'identity', 'is', 'verified', 'for', 'secure', 'exam'];
const MATCH_THRESHOLD = 6;

function countOrderedMatches(transcript) {
  const words = transcript.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  let wi = 0;
  for (const w of words) {
    if (wi < CORE_WORDS.length && w === CORE_WORDS[wi]) wi++;
  }
  return wi;
}

export default function VoiceVerification() {
  const navigate = useNavigate();
  const [step, setStep] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [progress, setProgress] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [message, setMessage] = useState('');

  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);
  const amplitudeIntervalRef = useRef(null);
  const speakingTimeRef = useRef(0);
  const fallbackRef = useRef(false);
  const isRecordingRef = useRef(false);

  const cleanup = () => {
    isRecordingRef.current = false;
    if (amplitudeIntervalRef.current) {
      clearInterval(amplitudeIntervalRef.current);
      amplitudeIntervalRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch { }
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const verifyWithBackend = async (spoken) => {
    const examId = localStorage.getItem('active_exam_id');
    const token = localStorage.getItem('session_token');
    if (!examId || !token || !spoken.trim()) return false;
    try {
      const res = await api.post(`/students/exams/${examId}/voice-verify`, {
        session_token: token,
        transcript: spoken.trim(),
      });
      return res.passed;
    } catch {
      return false;
    }
  };

  const startVerification = async () => {
    cleanup();
    isRecordingRef.current = true;
    setStep('recording');
    setTranscript('');
    setProgress(0);
    setAudioLevel(0);
    setMessage('Initializing microphone...');
    speakingTimeRef.current = 0;
    fallbackRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      if (audioCtx.state === 'suspended') await audioCtx.resume();

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      amplitudeIntervalRef.current = setInterval(() => {
        analyser.getByteFrequencyData(dataArray);
        let maxVal = 0;
        for (let i = 0; i < bufferLength; i++) {
          if (dataArray[i] > maxVal) maxVal = dataArray[i];
        }
        setAudioLevel(Math.round(maxVal / 2.55));

        if (fallbackRef.current) {
          if (maxVal > 75) {
            speakingTimeRef.current += 60;
            const pct = Math.min(100, Math.round(speakingTimeRef.current / 10));
            setProgress(pct);
            if (pct >= 100) {
              setStep('verified');
              setMessage('Voice verified successfully (volume check).');
              cleanup();
            }
          }
        }
      }, 100);

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let backendDebounce = null;

        recognition.onstart = () => {
          setMessage('Listening... Speak the phrase aloud.');
        };

        recognition.onresult = (event) => {
          let text = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            text += event.results[i][0].transcript;
          }
          const spoken = text.trim();
          setTranscript(spoken);

          const matchedInOrder = countOrderedMatches(spoken);
          const pct = Math.min(100, Math.round((matchedInOrder / MATCH_THRESHOLD) * 100));
          setProgress(pct);

          if (matchedInOrder >= 3) {
            if (backendDebounce) clearTimeout(backendDebounce);
            backendDebounce = setTimeout(async () => {
              const passed = await verifyWithBackend(spoken);
              if (passed) {
                setStep('verified');
                setMessage('Voice verified successfully!');
                cleanup();
              }
            }, 600);
          }
        };

        recognition.onerror = (e) => {
          if (e.error !== 'no-speech') {
            fallbackRef.current = true;
            setMessage('Speech recognition unavailable. Speak clearly to verify via volume.');
          }
        };

        recognition.onend = () => {
          if (isRecordingRef.current && !fallbackRef.current && recognitionRef.current) {
            try { recognitionRef.current.start(); } catch { }
          }
        };

        recognition.start();

        setTimeout(() => {
          if (isRecordingRef.current && !fallbackRef.current) {
            fallbackRef.current = true;
            setMessage('No speech detected. Keep speaking clearly...');
          }
        }, 8000);
      } else {
        fallbackRef.current = true;
        setMessage('Speech recognition not supported. Speak clearly to verify via volume.');
      }
    } catch (err) {
      setMessage(`Microphone error: ${err.message}. Please allow mic access.`);
      setStep('idle');
    }
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  const barHeights = [35, 60, 45, 80, 50, 70, 40];

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
            <div className="flex items-end gap-2 h-24 justify-center mb-md">
              {barHeights.map((h, i) => (
                <div key={i} className="w-6 bg-secondary rounded transition-all duration-150" style={{ height: `${audioLevel > 0 ? audioLevel * (h / 100) : h}%` }} />
              ))}
            </div>
            <button
              onClick={startVerification}
              className="inline-flex h-12 px-lg items-center justify-center bg-secondary text-primary rounded-lg font-bold gap-xs cursor-pointer hover:opacity-90"
            >
              <Icon name="mic" /> Start Verification
            </button>
          </>
        )}

        {step === 'recording' && (
          <div className="space-y-md">
            <p className="text-on-surface-variant">
              Speak: <b>&ldquo;{PHRASE}&rdquo;</b>
            </p>
            {message && <p className="text-sm text-secondary font-semibold">{message}</p>}
            <div className="flex items-end gap-2 h-24 justify-center">
              {barHeights.map((h, i) => (
                <div
                  key={i}
                  className="w-6 bg-secondary rounded transition-all duration-100"
                  style={{ height: `${Math.min(100, audioLevel * (h / 20))}%` }}
                />
              ))}
            </div>
            <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm font-bold text-primary">{progress}%</span>
            {transcript && (
              <p className="text-xs text-primary font-mono bg-surface p-xs rounded border border-outline-variant">
                Heard: &ldquo;{transcript}&rdquo;
              </p>
            )}
            <button
              onClick={cleanup}
              className="text-xs text-secondary hover:underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {step === 'verified' && (
          <div className="space-y-md">
            <Icon name="check_circle" className="text-primary text-[56px]" fill />
            <p className="text-primary font-bold">{message}</p>
            <div className="flex items-end gap-2 h-24 justify-center mb-md">
              {barHeights.map((h, i) => (
                <div key={i} className="w-6 bg-primary rounded" style={{ height: `${h}%` }} />
              ))}
            </div>
            <button
              onClick={() => navigate('/student/exams/security-check')}
              className="inline-flex h-12 px-lg items-center justify-center bg-secondary text-primary rounded-lg font-bold gap-xs cursor-pointer hover:opacity-90"
            >
              Continue to Security Check <Icon name="arrow_forward" />
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
