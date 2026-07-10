import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/Icon.jsx';
import { useProctorMonitor } from '../../../hooks/useProctorMonitor.js';
import { faceDetectionService } from '../../../services/faceDetectionService.js';
import { monitoringService } from '../../../services/monitoringService.js';

const questions = Array.from({ length: 40 }, (_, i) => i + 1);
const options = ['Supervised AI monitoring', 'Open-book collaboration', 'Unrestricted browser access', 'Manual attendance only'];

const PHONE_RATIO_THRESHOLD = 1.5;
const FACE_EXCLUSION_PADDING = 0.1;
const WARNING_LIMIT = 3;

function analyzePhoneDetection(video, faceBbox) {
  if (!video || video.readyState < 2) return false;

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let excludeX1 = 0, excludeY1 = 0, excludeX2 = 0, excludeY2 = 0;
  let hasExclusion = false;

  if (faceBbox) {
    excludeX1 = Math.max(0, (faceBbox.x - FACE_EXCLUSION_PADDING) * canvas.width);
    excludeY1 = Math.max(0, (faceBbox.y - FACE_EXCLUSION_PADDING) * canvas.height);
    excludeX2 = Math.min(canvas.width, (faceBbox.x + faceBbox.width + FACE_EXCLUSION_PADDING) * canvas.width);
    excludeY2 = Math.min(canvas.height, (faceBbox.y + faceBbox.height + FACE_EXCLUSION_PADDING) * canvas.height);
    hasExclusion = true;
  }

  let brightPixels = 0;
  let totalPixels = 0;
  const threshold = 200;
  const step = 4;

  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      if (hasExclusion && x >= excludeX1 && x <= excludeX2 && y >= excludeY1 && y <= excludeY2) continue;

      const idx = (y * canvas.width + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

      if (brightness > threshold) brightPixels++;
      totalPixels++;
    }
  }

  if (totalPixels === 0) return false;
  const ratio = brightPixels / totalPixels;
  return ratio > PHONE_RATIO_THRESHOLD;
}

export default function ExamInterface({ examId, examSessionId }) {
  const [current, setCurrent] = useState(1);
  const [selected, setSelected] = useState('');
  const [faceState, setFaceState] = useState({ detected: false, gaze: null, headPose: null });
  const [phoneWarnings, setPhoneWarnings] = useState(0);
  const [paused, setPaused] = useState(false);
  const time = useMemo(() => '01:42:15', []);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const phoneCheckInterval = useRef(null);
  const faceBboxRef = useRef(null);

  const monitoringEnabled = Boolean(examId && examSessionId);
  useProctorMonitor({ examSessionId, examId, enabled: monitoringEnabled });

  const log = useCallback((eventType, description, metadata = {}) => {
    monitoringService.logEvent({
      exam_session_id: examSessionId,
      exam_id: examId,
      event_type: eventType,
      description,
      metadata,
    }).catch(() => {});
  }, [examSessionId, examId]);

  useEffect(() => {
    if (monitoringEnabled && !document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, [monitoringEnabled]);

  useEffect(() => {
    let mounted = true;
    let videoStream = null;

    async function initCamera() {
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = videoStream;
        if (!mounted) { videoStream.getTracks().forEach(t => t.stop()); return; }

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = videoStream;

        await new Promise((resolve) => { video.onloadedmetadata = resolve; });
        await video.play();

        await faceDetectionService.loadModel();

        faceDetectionService.start(video, (result) => {
          if (!mounted) return;
          if (result.detected) {
            faceBboxRef.current = result.bbox;
            setFaceState({
              detected: true,
              gaze: result.gaze,
              headPose: result.headPose,
            });
          } else {
            faceBboxRef.current = null;
            setFaceState({ detected: false, gaze: null, headPose: null });
          }
        });
      } catch (err) {
        console.error('Camera init failed:', err);
        if (mounted) setPaused(true);
      }
    }

    initCamera();

    phoneCheckInterval.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || !mounted) return;
      const phoneDetected = analyzePhoneDetection(video, faceBboxRef.current);
      if (phoneDetected) {
        log('phone_detected', 'Smartphone or bright device detected in camera frame');
        setPhoneWarnings(prev => {
          const next = prev + 1;
          if (next >= WARNING_LIMIT) {
            log('phone_detected', 'Phone warning limit exceeded');
          }
          return next;
        });
      }
    }, 5000);

    return () => {
      mounted = false;
      faceDetectionService.stop();
      if (videoStream) videoStream.getTracks().forEach(t => t.stop());
      if (phoneCheckInterval.current) clearInterval(phoneCheckInterval.current);
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!faceState.detected && faceState.gaze === null && faceState.headPose === null) return;
    if (!faceState.detected) {
      log('no_face', 'No face detected by camera');
    }
    if (faceState.headPose?.turnedAway) {
      log('tab_switch', 'Student looking away from screen');
    }
    if (faceState.gaze?.lookingAway) {
      log('tab_switch', 'Gaze detected away from screen');
    }
  }, [faceState]);

  const faceConfidence = faceState.detected ? 'high' : 'low';
  const totalWarnings = phoneWarnings;

  return (
    <div className="bg-surface text-on-surface overflow-hidden min-h-screen">
      {paused && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center">
          <div className="bg-surface p-gutter rounded-2xl max-w-md text-center border border-outline-variant">
            <Icon name="videocam_off" className="text-[48px] text-error mb-md" />
            <h2 className="text-headline-md font-bold mb-sm">Camera Paused</h2>
            <p className="text-on-surface-variant mb-md">Camera access failed. Your exam is paused. Please check your camera and refresh.</p>
          </div>
        </div>
      )}
      <div className="fixed top-0 left-0 w-full h-[4px] bg-outline-variant z-50"><div className="h-full bg-secondary-container" style={{ width: '35%' }} /></div>
      <header className="h-16 flex justify-between items-center px-gutter bg-surface border-b border-outline-variant z-40 relative">
        <div className="flex items-center gap-sm">
          <div className="flex items-center gap-xs px-base py-xs bg-tertiary-fixed rounded-full">
            <Icon name="fiber_manual_record" className="text-on-tertiary-fixed-variant text-[16px] animate-pulse" fill />
            <span className="text-label-sm text-on-tertiary-fixed-variant tracking-wider uppercase">EXAM RUNNING OFFLINE SECURELY</span>
          </div>
          <div className="h-6 w-px bg-outline-variant mx-xs" />
          <div className="flex flex-col"><span className="text-label-md font-bold">Skillo</span><span className="text-label-sm text-on-surface-variant">Session ID: {examSessionId ?? 'ED-9921-X'}</span></div>
        </div>
        <div className="flex items-center gap-lg">
          <div className="flex flex-col items-center"><span className="text-label-sm text-on-surface-variant uppercase tracking-widest">Time Remaining</span><span className="text-headline-sm text-secondary font-bold">{time}</span></div>
          <div className="flex items-center gap-sm bg-surface-container-low px-md py-xs rounded-lg border border-outline-variant"><div className="flex flex-col items-end"><span className="text-label-md font-bold">Arjun Sharma</span><span className="text-label-sm text-on-surface-variant">ID: 202488192</span></div><div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary">AS</div></div>
        </div>
      </header>

      <main className="lockdown-layout">
        <aside className="bg-surface-container-low p-md border-r border-outline-variant flex flex-col gap-md overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center"><h2 className="text-headline-sm font-bold">Questions</h2><span className="px-sm py-xs bg-surface-container-highest rounded text-label-sm">12 / 40</span></div>
          <div className="grid grid-cols-4 gap-sm">
            {questions.map((q) => <button key={q} onClick={() => setCurrent(q)} className={`aspect-square rounded-lg font-bold text-label-md ${q === current ? 'bg-primary text-on-primary' : q < current ? 'bg-tertiary-fixed text-on-tertiary-container' : 'bg-surface-container-highest text-on-surface-variant'}`}>{String(q).padStart(2, '0')}</button>)}
          </div>
        </aside>

        <section className="p-gutter overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto bg-surface-container-lowest rounded-2xl border border-outline-variant p-gutter">
            <div className="flex justify-between items-center mb-md"><span className="text-label-md text-on-surface-variant">Question {current} of 40</span><span className="px-sm py-xs rounded bg-secondary-fixed text-on-secondary-container text-label-sm">Multiple Choice</span></div>
            <h1 className="text-headline-md text-primary font-bold mb-md">Which feature ensures the exam remains secure even without an active internet connection?</h1>
            <div className="space-y-sm">
              {options.map((opt) => <button key={opt} onClick={() => setSelected(opt)} className={`w-full text-left p-md rounded-xl border transition-colors ${selected === opt ? 'border-secondary bg-secondary-fixed/40' : 'border-outline-variant bg-surface hover:border-secondary hover:bg-orange-50'}`}>{opt}</button>)}
            </div>
            <div className="flex justify-between mt-lg"><button onClick={() => setCurrent(Math.max(1, current - 1))} className="px-lg py-sm border border-outline-variant rounded-lg font-bold">Previous</button><button onClick={() => setCurrent(Math.min(40, current + 1))} className="px-lg py-sm bg-primary text-on-primary rounded-lg font-bold">Save & Next</button></div>
          </div>
        </section>

        <aside className="bg-surface-container-low p-md border-l border-outline-variant hidden lg:flex flex-col gap-md w-72">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden flex-1 min-h-0">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          </div>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-sm space-y-xs">
            <h3 className="text-label-md text-primary font-bold mb-xs">Biometric Status</h3>
            <Status label="Face visible" ok={faceState.detected} />
            <Status label="Gaze locked" ok={faceState.gaze && !faceState.gaze.lookingAway} />
            <Status label="Head position" ok={faceState.headPose && !faceState.headPose.turnedAway} />
            <Status label="Tab locked" ok />
            <Status label="Network optional" ok />
            {totalWarnings > 0 && (
              <div className="flex items-center justify-between pt-xs border-t border-outline-variant mt-xs">
                <span className="text-label-sm text-error">Phone warnings</span>
                <span className={`text-label-sm font-bold ${totalWarnings >= WARNING_LIMIT ? 'text-error' : 'text-warning'}`}>{totalWarnings} / {WARNING_LIMIT}</span>
              </div>
            )}
          </div>
          <Link to="/student/exams/submission" className="h-12 bg-error text-on-error rounded-lg flex items-center justify-center font-bold gap-xs shrink-0">Submit Exam <Icon name="send" /></Link>
        </aside>
      </main>
    </div>
  );
}

function Status({ label, ok }) {
  return <div className="flex items-center justify-between py-[2px]"><span className="text-label-sm text-on-surface-variant">{label}</span><Icon name={ok ? 'check_circle' : 'warning'} className={ok ? 'text-on-tertiary-container text-[16px]' : 'text-error text-[16px]'} fill /></div>;
}
