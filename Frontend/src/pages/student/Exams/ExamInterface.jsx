import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth.js';
import { useBlazeFaceTracking, convertBlazeFaceToTrackingFormat } from '../../../hooks/useBlazeFaceTracking.js';
import Icon from '../../../components/Icon.jsx';
import { api } from '../../../services/api.js';
import { proctorBufferService } from '../../../services/proctorBufferService.js';
import { GAZE_THRESHOLDS, computeGazeMetrics, smoothGazeHistory, computeBaseline, classifyGazeState } from '../../../utils/gazeEstimation.js';
import { useObjectDetection } from '../../../hooks/useObjectDetection.js';

export default function ExamInterface() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [current, setCurrent] = useState(1);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [questionsData, setQuestionsData] = useState([]);
  const [exam, setExam] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(3600); // 1 hour default
  const [errorState, setErrorState] = useState(null);

  // Load offline exam package and persisted warning count on mount
  useEffect(() => {

    const saved = parseInt(localStorage.getItem('exam_warning_count') || '0', 10);
    if (saved > 0) {
      warningCountRef.current = saved;
      setWarningCount(saved);
    }

    const pkgStr = localStorage.getItem('offline_package');
    if (pkgStr) {
      try {
        const pkg = JSON.parse(pkgStr);
        if (pkg.questions) {
          setQuestionsData(pkg.questions.sort((a, b) => a.order_index - b.order_index));
        }
        if (pkg.exam) {
          setExam(pkg.exam);
          setTimeRemaining(pkg.exam.duration_minutes * 60);
        }
        return;
      } catch (e) {
        console.error("Failed to parse offline package:", e);
      }
    }

    const activeExamId = localStorage.getItem('active_exam_id');
    if (activeExamId) {
      api.get(`/students/exams/${activeExamId}/offline-package`)
        .then(pkg => {
          if (pkg?.questions) {
            setQuestionsData(pkg.questions.sort((a, b) => a.order_index - b.order_index));
          }
          if (pkg?.exam) {
            setExam(pkg.exam);
            setTimeRemaining(pkg.exam.duration_minutes * 60);
          }
          if (pkg?.session_token) {
            localStorage.setItem('session_token', pkg.session_token);
            localStorage.setItem('offline_package', JSON.stringify(pkg));
          }
        })
        .catch(e => {
          console.error("Failed to fetch offline package:", e);
          setErrorState("Could not load exam questions. Please check your connection and try again.");
        });
    }
  }, []);

  // Countdown timer logic
  useEffect(() => {
    if (questionsData.length === 0) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          autoSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [questionsData]);

  const time = useMemo(() => {
    const hrs = Math.floor(timeRemaining / 3600);
    const mins = Math.floor((timeRemaining % 3600) / 60);
    const secs = timeRemaining % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [timeRemaining]);

  // Proctoring States
  const [sessionToken] = useState(localStorage.getItem('session_token'));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [logs, setLogs] = useState([]);
  const [riskScore, setRiskScore] = useState(0.0);
  const [cameraStatus, setCameraStatus] = useState('inactive');
  
  // Real-time proctor statuses
  const [proctorStatus, setProctorStatus] = useState({
    faceVisible: true,
    faceCount: 1,
    gazeOk: true,
    tabLocked: true,
    fullscreenOk: true,
    cameraOk: true,
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const analysisIntervalRef = useRef(null);
  
  // ── Proctoring Time Thresholds (milliseconds) ──
  const PROCTORING_THRESHOLDS = {
    NO_FACE_WARNING: 3000,
    NO_FACE_VIOLATION: 10000,
    MULTIPLE_FACE_WARNING: 3000,
    MULTIPLE_FACE_VIOLATION: 7000,
  };

  // ── Smoothing & cooldown config ──
  const PROCTOR_CFG = {
    SMOOTHING_ALPHA: 0.06,
    WARNING_COOLDOWN_MS: 10000,
  };

  // ── Face state machine refs (time-based continuous duration) ──
  const noFaceStartRef = useRef(0);                // timestamp when no-face began (0 = face present)
  const noFaceStateRef = useRef('NORMAL');          // NORMAL | NO_FACE_PENDING | NO_FACE_WARNING | NO_FACE_VIOLATION
  const noFaceViolationLoggedRef = useRef(false);   // prevent duplicate logging per incident

  const multiFaceStartRef = useRef(0);              // timestamp when multi-face began (0 = single face)
  const multiFaceStateRef = useRef('NORMAL');        // NORMAL | MULTI_FACE_PENDING | MULTI_FACE_WARNING | MULTI_FACE_VIOLATION
  const multiFaceViolationLoggedRef = useRef(false); // prevent duplicate logging per incident

  const lookingAwayTimerRef = useRef(0);
  const warningCountRef = useRef(0);
  const lastEventTimeRef = useRef({});  // cooldown per event type

  const smoothedPosRef = useRef({ x: 0.5, y: 0.5 });
  const gazeAwayRef = useRef(false);
  const lastWarnRef = useRef(0);
  const gazeConfidenceRef = useRef(1.0);
  const faceLastSeenRef = useRef(Date.now());

  // ── Gaze state machine refs (time-based, same pattern as face detection) ──
  const gazeStateRef = useRef('GAZE_CENTER');
  const gazeDeviationStartRef = useRef(0);
  const gazeViolationLoggedRef = useRef(false);
  const gazeHistoryRef = useRef([]);
  const gazeBaselineRef = useRef(null);
  const gazeCalibratingRef = useRef(true);
  const gazeCalibrationSamplesRef = useRef([]);
  const lastPhoneViolationRef = useRef(0);
  const highRiskTriggeredRef = useRef(false);
  const [activeWarning, setActiveWarning] = useState(null); // { reason, count, max }
  const [faceAlert, setFaceAlert] = useState(null); // { type: 'no_face'|'multiple_faces', level: 'warning'|'violation', duration: number }
  const [gazeAlert, setGazeAlert] = useState(null); // { direction, duration } | null

  // ── Proctor config derived from exam ──
  const proctorConfig = useMemo(() => {
    if (!exam) {
      return { face: false, multiPerson: false, phone: false, screen: false, fullscreen: false, microphone: false };
    }
    return {
      face: exam.face_detection_enabled ?? true,
      multiPerson: exam.multiple_person_detection_enabled ?? true,
      phone: exam.phone_detection_enabled ?? true,
      screen: exam.screen_monitoring_enabled ?? true,
      fullscreen: exam.fullscreen_required ?? true,
      microphone: exam.microphone_required ?? true,
    };
  }, [exam]);

  const isEventEnabled = useCallback((eventType) => {
    const faceEvents = ['no_face_detected', 'no_face', 'looking_away', 'face_mismatch', 'student_verified', 'camera_blocked'];
    const multiPersonEvents = ['multiple_faces_detected', 'multiple_faces'];
    const phoneEvents = ['phone_detected'];
    const screenEvents = ['tab_switch', 'window_blur', 'fullscreen_exit', 'devtools_opened', 'copy_paste', 'right_click'];
    if (faceEvents.includes(eventType)) return proctorConfig.face;
    if (multiPersonEvents.includes(eventType)) return proctorConfig.multiPerson;
    if (phoneEvents.includes(eventType)) return proctorConfig.phone;
    if (screenEvents.includes(eventType)) return proctorConfig.screen;
    return true;
  }, [proctorConfig]);

  const isCurrentlyFullscreen = () => {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  };

  const hasBeenFullscreenRef = useRef(isCurrentlyFullscreen());

  // Listen for fullscreen changes; log violation on exit
  useEffect(() => {
    const checkFullscreen = () => {
      const isFull = isCurrentlyFullscreen();
      setIsFullscreen(isFull);
      setProctorStatus(prev => ({ ...prev, fullscreenOk: isFull }));
      if (isFull) {
        hasBeenFullscreenRef.current = true;
      } else if (hasBeenFullscreenRef.current) {
        handleSecurityViolation("fullscreen_exit", "Fullscreen mode was exited.");
      }
    };

    document.addEventListener('fullscreenchange', checkFullscreen);
    document.addEventListener('webkitfullscreenchange', checkFullscreen);
    document.addEventListener('mozfullscreenchange', checkFullscreen);
    document.addEventListener('MSFullscreenChange', checkFullscreen);
    
    // Mark initial state
    if (isCurrentlyFullscreen()) {
      hasBeenFullscreenRef.current = true;
    }
    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen);
      document.removeEventListener('webkitfullscreenchange', checkFullscreen);
      document.removeEventListener('mozfullscreenchange', checkFullscreen);
      document.removeEventListener('MSFullscreenChange', checkFullscreen);
    };
  }, [sessionToken, proctorConfig]);

  // Request fullscreen via user gesture — called from the shield button
  const requestFullscreen = () => {
    const elem = document.documentElement || document.body;
    const alertFailed = () => {
      console.warn("Fullscreen request was rejected. If you are viewing this page inside an IDE/Editor preview frame, please open the website in a standard browser tab (e.g., http://localhost:5173) to allow secure fullscreen lockdown.");
    };

    if (elem.requestFullscreen) {
      elem.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error("Fullscreen request rejected:", err);
        alertFailed();
      });
    } else if (elem.webkitRequestFullscreen) {
      try {
        elem.webkitRequestFullscreen();
        setIsFullscreen(true);
      } catch (e) {
        console.error("WebKit fullscreen error:", e);
        alertFailed();
      }
    } else if (elem.msRequestFullscreen) {
      try {
        elem.msRequestFullscreen();
        setIsFullscreen(true);
      } catch (e) {
        console.error("MS fullscreen error:", e);
        alertFailed();
      }
    } else if (elem.mozRequestFullScreen) {
      try {
        elem.mozRequestFullScreen();
        setIsFullscreen(true);
      } catch (e) {
        console.error("Mozilla fullscreen error:", e);
        alertFailed();
      }
    } else {
      alertFailed();
    }
  };




// Initialize BlazeFace face tracking (at top level, NOT inside useEffect)
  const { stop: stopBlazeFaceTracking } = useBlazeFaceTracking({
    videoRef,
    enabled: proctorConfig.face,
    onFaces: (faces, videoWidth, videoHeight) => {
      const data = convertBlazeFaceToTrackingFormat(faces, videoWidth, videoHeight);
      const now = Date.now();

      if (data.length === 0) {
        gazeConfidenceRef.current = Math.max(0.0, gazeConfidenceRef.current - 0.02);
        multiFaceStartRef.current = 0;
        multiFaceStateRef.current = 'NORMAL';
        multiFaceViolationLoggedRef.current = false;

        if (noFaceStateRef.current === 'NORMAL') {
          noFaceStartRef.current = now;
          noFaceStateRef.current = 'NO_FACE_PENDING';
          noFaceViolationLoggedRef.current = false;
        }

        const duration = now - noFaceStartRef.current;

        if (duration >= PROCTORING_THRESHOLDS.NO_FACE_VIOLATION) {
          noFaceStateRef.current = 'NO_FACE_VIOLATION';
          setProctorStatus(prev => ({ ...prev, faceVisible: false, faceCount: 0 }));
          if (!noFaceViolationLoggedRef.current) {
            noFaceViolationLoggedRef.current = true;
            const conf = Math.round(gazeConfidenceRef.current * 10) / 10;
            const durSec = parseFloat((duration / 1000).toFixed(1));
            triggerViolation("Face not detected for extended period.", "no_face_detected", 0.5 + conf * 0.4, `Face not detected for ${durSec} seconds`);
            setFaceAlert({ type: 'no_face', level: 'violation', duration: durSec });
          }
        } else if (duration >= PROCTORING_THRESHOLDS.NO_FACE_WARNING) {
          noFaceStateRef.current = 'NO_FACE_WARNING';
          setProctorStatus(prev => ({ ...prev, faceVisible: false, faceCount: 0 }));
          const durSec = parseFloat((duration / 1000).toFixed(1));
          setFaceAlert({ type: 'no_face', level: 'warning', duration: durSec });
        } else {
          setProctorStatus(prev => ({ ...prev, faceVisible: true, faceCount: 0 }));
          setFaceAlert(null);
        }

        lookingAwayTimerRef.current = 0;

      } else if (data.length > 1) {
        noFaceStartRef.current = 0;
        noFaceStateRef.current = 'NORMAL';
        noFaceViolationLoggedRef.current = false;

        if (multiFaceStateRef.current === 'NORMAL') {
          multiFaceStartRef.current = now;
          multiFaceStateRef.current = 'MULTI_FACE_PENDING';
          multiFaceViolationLoggedRef.current = false;
        }

        const duration = now - multiFaceStartRef.current;

        if (duration >= PROCTORING_THRESHOLDS.MULTIPLE_FACE_VIOLATION) {
          multiFaceStateRef.current = 'MULTI_FACE_VIOLATION';
          setProctorStatus(prev => ({ ...prev, faceCount: data.length }));
          if (!multiFaceViolationLoggedRef.current) {
            multiFaceViolationLoggedRef.current = true;
            const durSec = parseFloat((duration / 1000).toFixed(1));
            triggerViolation("Multiple faces detected inside camera frame.", "multiple_faces_detected", 0.9, `Multiple faces detected for ${durSec} seconds`);
            setFaceAlert({ type: 'multiple_faces', level: 'violation', duration: durSec });
          }
        } else if (duration >= PROCTORING_THRESHOLDS.MULTIPLE_FACE_WARNING) {
          multiFaceStateRef.current = 'MULTI_FACE_WARNING';
          const durSec = parseFloat((duration / 1000).toFixed(1));
          setFaceAlert({ type: 'multiple_faces', level: 'warning', duration: durSec });
        }

        lookingAwayTimerRef.current = 0;

      } else {
        noFaceStartRef.current = 0;
        noFaceStateRef.current = 'NORMAL';
        noFaceViolationLoggedRef.current = false;
        multiFaceStartRef.current = 0;
        multiFaceStateRef.current = 'NORMAL';
        multiFaceViolationLoggedRef.current = false;
        setFaceAlert(null);

        faceLastSeenRef.current = now;
        gazeConfidenceRef.current = Math.min(1.0, gazeConfidenceRef.current + 0.05);
        setProctorStatus(prev => ({ ...prev, faceVisible: true, faceCount: 1 }));

        const rect = data[0];
        const vw = videoWidth || 320;
        const vh = videoHeight || 240;

        const faceCx = (rect.x + rect.width / 2) / vw;
        const faceCy = (rect.y + rect.height / 2) / vh;

        const a = PROCTOR_CFG.SMOOTHING_ALPHA;
        const p = smoothedPosRef.current;
        const sx = p.x + a * (faceCx - p.x);
        const sy = p.y + a * (faceCy - p.y);
        smoothedPosRef.current = { x: sx, y: sy };

        // ── Gaze estimation using BlazeFace landmarks ──
        const landmarks = rect.landmarks;
        const metrics = computeGazeMetrics(
          landmarks,
          { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          vw, vh
        );

        // Auto-calibration: collect baseline samples at the start
        if (gazeCalibratingRef.current) {
          gazeCalibrationSamplesRef.current.push(metrics);
          if (gazeCalibrationSamplesRef.current.length >= GAZE_THRESHOLDS.CALIBRATION_FRAMES) {
            gazeBaselineRef.current = computeBaseline(gazeCalibrationSamplesRef.current);
            gazeCalibratingRef.current = false;
          }
        }

        // Rolling history for temporal smoothing
        gazeHistoryRef.current.push(metrics);
        if (gazeHistoryRef.current.length > GAZE_THRESHOLDS.SMOOTHING_WINDOW) {
          gazeHistoryRef.current.shift();
        }

        const smoothed = smoothGazeHistory(gazeHistoryRef.current);
        const gazeResult = classifyGazeState(smoothed, gazeBaselineRef.current);

        // ── Gaze state machine (time-based, same pattern as face detection) ──
        if (gazeResult.state === 'GAZE_CENTER') {
          gazeDeviationStartRef.current = 0;
          gazeStateRef.current = 'GAZE_CENTER';
          gazeViolationLoggedRef.current = false;
          setGazeAlert(null);
          if (gazeAwayRef.current) {
            gazeAwayRef.current = false;
            setProctorStatus(prev => ({ ...prev, gazeOk: true }));
          }
        } else if (gazeResult.state === 'GAZE_SLIGHT_DEVIATION' || gazeResult.state === 'GAZE_UNKNOWN') {
          gazeDeviationStartRef.current = 0;
          gazeStateRef.current = gazeResult.state;
          setGazeAlert(null);
        } else {
          if (gazeDeviationStartRef.current === 0) {
            gazeDeviationStartRef.current = now;
            gazeStateRef.current = 'GAZE_PENDING';
            gazeViolationLoggedRef.current = false;
          }

          const duration = now - gazeDeviationStartRef.current;
          const durSec = parseFloat((duration / 1000).toFixed(1));

          if (duration >= GAZE_THRESHOLDS.VIOLATION_DURATION) {
            gazeStateRef.current = 'GAZE_VIOLATION';
            gazeAwayRef.current = true;
            setProctorStatus(prev => ({ ...prev, gazeOk: false }));
            setGazeAlert({ direction: gazeResult.direction, duration: durSec, level: 'violation' });
            if (!gazeViolationLoggedRef.current) {
              gazeViolationLoggedRef.current = true;
              logProctorViolation("looking_away", 0.65, { duration_seconds: durSec, direction: gazeResult.direction }, `Gaze ${gazeResult.direction} for ${durSec}s`);
              addLogEntry(`[Proctoring] Gaze deviation (${gazeResult.direction}) for ${durSec}s`, 'warning');
            }
          } else if (duration >= GAZE_THRESHOLDS.WARNING_DURATION) {
            gazeStateRef.current = 'GAZE_WARNING';
            gazeAwayRef.current = true;
            setProctorStatus(prev => ({ ...prev, gazeOk: false }));
            setGazeAlert({ direction: gazeResult.direction, duration: durSec, level: 'warning' });
          }
        }
      }
    },
  });

  // Initialize COCO-SSD object detection for phone detection
  const { prohibitedObjects } = useObjectDetection(videoRef);

  // Phone detection: trigger violation when a cell phone is visible in the camera
  useEffect(() => {
    if (!proctorConfig.phone) return;
    if (prohibitedObjects.includes('cell phone')) {
      const now = Date.now();
      if (now - lastPhoneViolationRef.current >= 10000) {
        lastPhoneViolationRef.current = now;
        triggerViolation("Mobile phone detected inside proctor frame!", "phone_detected", 0.95);
      }
    }
  }, [prohibitedObjects, proctorConfig.phone]);

  // Request camera and setup tracking
  useEffect(() => {
    if (!exam) return;
    const micRequired = proctorConfig.microphone;
    navigator.mediaDevices.getUserMedia({ video: true, audio: micRequired })
      .then(stream => {
        streamRef.current = stream;
        setCameraStatus('active');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.error("Camera access blocked inside interface:", err);
        setCameraStatus('permission_denied');
        setProctorStatus(prev => ({ ...prev, cameraOk: false }));
        if (isEventEnabled('camera_blocked')) {
          logProctorViolation("camera_blocked", 1.0, { error: err.name || err.message });
        }
      });

    const cleanupWebcam = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (stopBlazeFaceTracking) {
        stopBlazeFaceTracking();
      }
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
    };

    const anyAiEnabled = proctorConfig.face || proctorConfig.multiPerson || proctorConfig.phone;
    if (anyAiEnabled) {
      analysisIntervalRef.current = setInterval(() => {
        captureAndAnalyzeFrame();
      }, 20000);
    }

    return () => {
      cleanupWebcam();
    };
  }, [proctorConfig, exam]);

  // Periodically flush buffered proctor events
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const synced = await proctorBufferService.flush();
        if (synced > 0) addLogEntry(`Synced ${synced} buffered events`, 'success');
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Audio monitoring when microphone is enabled
  useEffect(() => {
    if (!proctorConfig.microphone || !streamRef.current) return;
    let audioCtx, analyser, dataArray, source;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (!audioTrack || !audioTrack.enabled) return;
      source = audioCtx.createMediaStreamSource(streamRef.current);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      dataArray = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) {
      console.error("Audio monitoring init failed:", e);
      return;
    }

    let silentFrames = 0;
    const SILENT_THRESHOLD = 10;
    const SILENT_LIMIT = 300;
    const audioInterval = setInterval(() => {
      if (!analyser || !dataArray) return;
      analyser.getByteFrequencyData(dataArray);
      const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      if (avg < SILENT_THRESHOLD) {
        silentFrames++;
        if (silentFrames >= SILENT_LIMIT) {
          silentFrames = 0;
          triggerViolation("Microphone appears muted or blocked. Please enable your microphone.", "camera_blocked", 0.6, "Audio level below threshold for extended period");
        }
      } else {
        silentFrames = 0;
      }
    }, 200);

    return () => {
      clearInterval(audioInterval);
      if (audioCtx) audioCtx.close().catch(() => {});
    };
  }, [proctorConfig.microphone, proctorConfig]);

  // Visibility (Tab switch) & Window Blur listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleSecurityViolation("tab_switch", "Tab switching is not allowed.");
      }
    };
    
    const handleBlur = () => {
      setProctorStatus(prev => ({ ...prev, tabLocked: false }));
      handleSecurityViolation("tab_switch", "Tab switching is not allowed.");
    };

    const handleFocus = () => {
      setProctorStatus(prev => ({ ...prev, tabLocked: true }));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [sessionToken, proctorConfig]);


  // Disable Right-Click and Common Dev Shortcut Keys
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      triggerViolation("Blocked Right-Click attempt", "right_click", 1.0, "Blocked right click context menu");
    };

    const handleKeyDown = (e) => {
      // Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSecurityViolation("fullscreen_exit", "Escape key is not allowed during the exam.");
        return;
      }
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        triggerViolation("Developer tools blocked!", "devtools_opened", 0.95, "F12 key pressed");
      }
      // Ctrl+Shift+I / J / C
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C' || e.key === 'i' || e.key === 'j' || e.key === 'c')) {
        e.preventDefault();
        triggerViolation("Developer tools inspect blocked!", "devtools_opened", 0.95, "DevTools inspect keyboard shortcut");
      }
      // Ctrl+U (view source)
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        addLogEntry("Blocked View Source shortcut");
      }
      // Clipboard copy/paste block
      if (e.ctrlKey && (e.key === 'c' || e.key === 'x' || e.key === 'v' || e.key === 'C' || e.key === 'X' || e.key === 'V')) {
        e.preventDefault();
        triggerViolation("Blocked Clipboard shortcut", "copy_paste", 1.0, "Blocked copy/cut/paste keyboard shortcut");
      }
    };

    const handleClipboard = (e) => {
      e.preventDefault();
      triggerViolation("Clipboard action blocked!", "copy_paste", 1.0, "Blocked clipboard copy/cut/paste event");
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('copy', handleClipboard);
    document.addEventListener('cut', handleClipboard);
    document.addEventListener('paste', handleClipboard);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('copy', handleClipboard);
      document.removeEventListener('cut', handleClipboard);
      document.removeEventListener('paste', handleClipboard);
    };
  }, [warningCount, proctorConfig]);

  // When risk score exceeds 80, add a violation strike (once per crossing)
  useEffect(() => {
    if (riskScore >= 80.0) {
      if (!highRiskTriggeredRef.current) {
        highRiskTriggeredRef.current = true;
        triggerViolation("Risk score exceeded 80%.", "high_risk", 1.0, "Auto-triggered violation due to high risk score");
      }
    } else if (riskScore < 50.0) {
      highRiskTriggeredRef.current = false;
    }
  }, [riskScore]);

  // ── Cooldown check – prevents duplicate events within 2.5 s ──
  const isOnCooldown = (eventType) => {
    const now = Date.now();
    const last = lastEventTimeRef.current[eventType] || 0;
    if (now - last < 2500) return true;
    lastEventTimeRef.current[eventType] = now;
    return false;
  };

  const addLogEntry = (msg, type = 'info') => {
    const stamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ time: stamp, text: msg, type }, ...prev]);
  };

  // General Violation triggers (increases warning counter, logs to DB)
  const triggerViolation = (userMessage, eventType, confidence, description = null) => {
    if (!isEventEnabled(eventType)) return;
    warningCountRef.current += 1;
    const newCount = warningCountRef.current;
    setWarningCount(newCount);
    addLogEntry(`[Violation] ${userMessage} (${newCount}/5)`, 'error');

    localStorage.setItem('exam_warning_count', String(newCount));

    logProctorViolation(eventType, confidence, { warning_number: newCount }, description || userMessage);

    if (newCount >= 5) {
      setActiveWarning({ reason: userMessage, count: newCount, max: 5, type: 'violation' });
      setTimeout(() => {
        setActiveWarning(null);
        cleanupWebcam();
        navigate('/student/exams/submission?auto=true');
      }, 2000);
    } else {
      setActiveWarning({ reason: userMessage, count: newCount, max: 5, type: 'violation' });
      setTimeout(() => setActiveWarning(null), 3000);
    }
  };

  // ── Security violation handler: warning-based (tab, esc, fullscreen) ──
  const handleSecurityViolation = (eventType, reason) => {
    if (isOnCooldown(eventType)) return;
    if (!isEventEnabled(eventType)) return;

    const newRisk = Math.min(100, riskScore + 5);
    setRiskScore(newRisk);
    addLogEntry(`[Security] ${reason} (risk: ${newRisk}%)`, 'warning');

    setActiveWarning({ reason, risk: newRisk, type: 'warning' });
    setTimeout(() => setActiveWarning(null), 3000);

    if (!isCurrentlyFullscreen()) {
      const elem = document.documentElement || document.body;
      if (elem.requestFullscreen) elem.requestFullscreen().catch(() => {});
    }

    logProctorViolation(eventType, 0.6, { risk_score: newRisk }, reason);
  };

  const logProctorViolation = async (eventType, confidence, metadata = {}, description = null) => {
    try {
      let screenshotUrl = null;
      if (videoRef.current) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 240;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          screenshotUrl = canvas.toDataURL('image/jpeg');
        } catch (canvasErr) {
          console.error("Canvas screenshot capture error:", canvasErr);
        }
      }

      const payload = {
        session_token: sessionToken,
        event_type: eventType,
        confidence_score: confidence,
        screenshot_url: screenshotUrl,
        description: description,
        metadata: {
          exam_running: true,
          client_agent: navigator.userAgent,
          ...metadata
        }
      };

      proctorBufferService.queue(payload);
      const synced = await proctorBufferService.flush();
      if (synced > 0) {
        addLogEntry(`Buffered events synced (${synced})`, 'success');
      }
      try {
        const riskRes = await api.get(`/proctor/session-risk?session_token=${sessionToken}`);
        if (riskRes && riskRes.session_risk_score !== undefined) {
          setRiskScore(riskRes.session_risk_score);
        }
      } catch {}
    } catch (err) {
      console.error("Failed to queue proctor event:", err);
    }
  };




  // Periodically send frames to backend Vision AI analyzer
  const captureAndAnalyzeFrame = async () => {
    if (!videoRef.current || streamRef.current?.active === false) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');

      // Request API vision scan
      const res = await api.post('/proctor/analyze-frame', {
        session_token: sessionToken,
        screenshot_url: dataUrl,
      });

      if (res) {
        setRiskScore(res.session_risk_score);
        
        let details = [];
        if (res.phone_detected) {
          details.push("Mobile phone usage");
          triggerViolation("Mobile phone detected inside proctor frame!", "phone_detected", 0.95);
        }
        if (res.looking_away) {
          details.push("Looking away");
          setProctorStatus(prev => ({ ...prev, gazeOk: false }));
          const now = Date.now();
          if (now - lastWarnRef.current >= PROCTOR_CFG.WARNING_COOLDOWN_MS) {
            lastWarnRef.current = now;
            logProctorViolation("looking_away", 0.85);
          }
        } else {
          setProctorStatus(prev => ({ ...prev, gazeOk: true }));
        }
        if (res.multiple_faces) {
          details.push("Multiple people");
          setProctorStatus(prev => ({ ...prev, faceCount: 2 }));
        }
        if (res.no_face) {
          details.push("No face visible");
          setProctorStatus(prev => ({ ...prev, faceVisible: false }));
        } else {
          setProctorStatus(prev => ({ ...prev, faceVisible: true }));
        }
        if (res.camera_blocked) {
          details.push("Camera obscured");
          setProctorStatus(prev => ({ ...prev, cameraOk: false }));
        } else {
          setProctorStatus(prev => ({ ...prev, cameraOk: true }));
        }

        if (details.length > 0) {
          addLogEntry(`[Vision AI] Alerts: ${details.join(', ')}`, 'warning');
        } else {
          addLogEntry("[Vision AI] Normal status verified.", 'success');
        }
      }
    } catch (err) {
      console.error("Frame analysis query failed:", err);
    }
  };

  const syncAnswers = async (final = false) => {
    const activeExamId = localStorage.getItem('active_exam_id');
    const sessionToken = localStorage.getItem('session_token');
    if (!activeExamId || !sessionToken) {
      if (final) return;
      return;
    }

    const answersList = Object.entries(selectedAnswers).map(([qId, ansText]) => {
      const question = questionsData.find(q => String(q.id) === String(qId));
      let selectedOptionIdx = null;
      if (question && question.options) {
        try {
          const opts = typeof question.options === 'string'
            ? JSON.parse(question.options)
            : question.options;
          const idx = opts.indexOf(ansText);
          if (idx !== -1) {
            selectedOptionIdx = String(idx);
          }
        } catch (e) {
          console.error(e);
        }
      }

      return {
        question_id: parseInt(qId),
        answer_text: ansText,
        selected_option: selectedOptionIdx,
        answer_type: question ? question.question_type : "mcq",
        local_saved_at: new Date().toISOString(),
        word_count: 0,
        edit_count: 0,
        time_spent_seconds: 0
      };
    });

    try {
      await api.post(`/students/exams/${activeExamId}/sync-answers`, {
        session_token: sessionToken,
        answers: answersList,
        final_submission: final
      });
    } catch (err) {
      console.error("Failed to sync answers:", err);
    }
  };

  // Sync answers when selectedAnswers changes
  useEffect(() => {
    if (Object.keys(selectedAnswers).length > 0 && questionsData.length > 0) {
      syncAnswers(false);
    }
  }, [selectedAnswers, questionsData]);

  const autoSubmitExam = async () => {
    try { cleanupWebcam(); } catch {}
    try { await proctorBufferService.flush(); } catch {}
    try { await syncAnswers(true); } catch {}
    localStorage.setItem('demo_answers', JSON.stringify(selectedAnswers));
    navigate('/student/exams/submission?auto=true');
  };

  const handleManualSubmit = async () => {
    try { cleanupWebcam(); } catch {}
    try { await proctorBufferService.flush(); } catch {}
    try { await syncAnswers(true); } catch {}
    localStorage.setItem('demo_answers', JSON.stringify(selectedAnswers));
    navigate('/student/exams/submission');
  };

  const currentQuestion = questionsData[current - 1] || null;

  const currentOptions = useMemo(() => {
    if (!currentQuestion || !currentQuestion.options) return [];
    try {
      return typeof currentQuestion.options === 'string'
        ? JSON.parse(currentQuestion.options)
        : currentQuestion.options;
    } catch (e) {
      console.error("Failed to parse options for question:", e);
      return [];
    }
  }, [currentQuestion]);

  const handleSelectOption = (opt) => {
    if (!currentQuestion) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: opt
    }));
  };

  // Color mappings based on risk
  const getRiskColor = (score) => {
    if (score < 30) return 'text-on-tertiary-container bg-tertiary-fixed';
    if (score < 60) return 'text-warning bg-warning/20 border border-warning/30';
    return 'text-error bg-error/20 border border-error/30 animate-pulse';
  };

  if (errorState) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center font-sans">
        <div className="text-center space-y-md max-w-md mx-auto p-md">
          <div className="w-16 h-16 mx-auto rounded-full bg-error-container flex items-center justify-center">
            <Icon name="error_outline" className="text-error text-[32px]" fill />
          </div>
          <h2 className="text-headline-sm font-bold text-error">Could Not Load Exam</h2>
          <p className="text-on-surface-variant">{errorState}</p>
          <button onClick={() => navigate('/student/exams')} className="inline-flex h-11 px-lg items-center bg-primary text-on-primary rounded-lg font-bold hover:opacity-90 gap-xs">
            <Icon name="arrow_back" /> Back to Exams
          </button>
        </div>
      </div>
    );
  }

  if (questionsData.length === 0) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center font-sans">
        <div className="text-center space-y-md">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-on-surface-variant font-medium">Loading secure exam interface...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface text-on-surface overflow-hidden min-h-screen relative">
      {/* Fullscreen Lockdown Shield (only if required by exam) */}
      {proctorConfig.fullscreen && !isFullscreen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-md">
          <div className="max-w-[32rem] w-full bg-surface-container-lowest rounded-3xl border border-outline-variant p-lg text-center shadow-2xl space-y-md animate-pulse-ring">
            <Icon name="lock" className="text-error text-[56px]" fill />
            <h2 className="text-headline-lg font-bold text-error">Lockdown Mode Active</h2>
            <p className="text-on-surface-variant text-sm">
              This exam requires your browser to run in **Fullscreen Mode**. Leaving fullscreen triggers security violations and logs events to your proctor dashboard.
            </p>
            <button 
              onClick={requestFullscreen}
              className="w-full py-md px-lg bg-primary text-on-primary font-bold rounded-xl hover:opacity-90 flex items-center justify-center gap-xs shadow-lg transition-transform hover:scale-105 cursor-pointer"
            >
              <Icon name="fullscreen" /> Enter Fullscreen Lockdown
            </button>
          </div>
        </div>
      )}

      {/* Warning Modal */}
      {activeWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant p-lg max-w-lg w-full mx-md shadow-2xl text-center space-y-md">
            <div className="w-14 h-14 mx-auto rounded-full bg-error/20 flex items-center justify-center">
              <Icon name={activeWarning.type === 'violation' && activeWarning.count >= 5 ? 'gavel' : 'warning'} className="text-error text-[32px]" fill />
            </div>
            <div>
              <h2 className="text-headline-sm font-bold text-error">
                {activeWarning.type === 'violation'
                  ? (activeWarning.count >= 5 ? 'Exam Auto-Submitted' : 'Security Violation')
                  : 'Security Warning'}
              </h2>
              <p className="text-on-surface-variant text-sm mt-xs">{activeWarning.reason}</p>
            </div>
            {activeWarning.type === 'violation' ? (
              <>
                <div className="flex items-center justify-center gap-xs">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-label-md font-bold border-2 transition-all ${
                        i <= activeWarning.count
                          ? 'bg-error text-white border-error'
                          : 'bg-surface-container-high text-on-surface-variant border-outline-variant'
                      }`}
                    >
                      {i}
                    </div>
                  ))}
                </div>
                <p className="text-label-sm text-on-surface-variant">
                  {activeWarning.count >= 5
                    ? 'Maximum violations reached. The exam has been submitted.'
                    : `Violation ${activeWarning.count} of ${activeWarning.max}. ${activeWarning.max - activeWarning.count} more before auto-submit.`}
                </p>
              </>
            ) : (
              <p className="text-label-sm text-on-surface-variant">
                Risk score: {activeWarning.risk}%. Keep risk below 80% to avoid auto-submit.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="fixed top-0 left-0 w-full h-[4px] bg-outline-variant z-50">
        <div className="h-full bg-secondary-container" style={{ width: `${(Object.keys(selectedAnswers).length / questionsData.length) * 100}%` }} />
      </div>

      <header className="h-16 flex justify-between items-center px-gutter bg-surface border-b border-outline-variant z-35 relative">
        <div className="flex items-center gap-sm">
          <div className="flex items-center gap-xs px-base py-xs bg-tertiary-fixed rounded-full">
            <Icon name="fiber_manual_record" className="text-on-tertiary-fixed-variant text-[16px] animate-pulse" fill />
            <span className="text-label-sm text-on-tertiary-fixed-variant tracking-wider uppercase font-bold">EXAM RUNNING SECURELY</span>
          </div>
          <div className="h-6 w-px bg-outline-variant mx-xs" />
          <div className="flex flex-col">
            <span className="text-label-md font-bold">Skillo Lockdown</span>
            <span className="text-label-sm text-on-surface-variant font-mono">Session: {sessionToken.substring(0, 15)}...</span>
          </div>
        </div>
        <div className="flex items-center gap-lg">
          <div className="flex flex-col items-center">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-widest">Time Remaining</span>
            <span className="text-headline-sm text-secondary font-bold font-mono">{time}</span>
          </div>
          <div className={`flex items-center gap-xs px-sm py-xs rounded-full border-2 font-bold ${
            warningCount >= 3
              ? 'bg-error/20 text-error border-error'
              : warningCount >= 2
                ? 'bg-warning/20 text-warning border-warning'
                : warningCount >= 1
                  ? 'bg-[#FFE57F]/20 text-[#FFE57F] border-[#FFE57F]'
                  : 'bg-tertiary-fixed text-on-tertiary border-transparent'
          }`}>
            <Icon name="warning" className="text-sm" fill />
            <span className="text-label-sm tracking-wider">{warningCount}/5</span>
          </div>
          <div className="flex items-center gap-sm bg-surface-container-low px-md py-xs rounded-lg border border-outline-variant">
            <div className="flex flex-col items-end">
              <span className="text-label-md font-bold">{user ? user.name : "Arjun Sharma"}</span>
              <span className="text-label-sm text-on-surface-variant font-mono">{user ? user.email : "ID: 202488192"}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary font-bold">
              {(user ? user.name : "Arjun Sharma").split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="lockdown-layout">
        {/* Questions Grid Navigation */}
        <aside className="bg-surface-container-low p-md border-r border-outline-variant flex flex-col gap-md overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center">
            <h2 className="text-headline-sm font-bold text-primary">Questions</h2>
            <span className="px-sm py-xs bg-surface-container-highest rounded text-label-sm font-bold">
              {Object.keys(selectedAnswers).length} / {questionsData.length}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-sm">
            {questionsData.map((q, idx) => (
              <button 
                key={q.id} 
                onClick={() => setCurrent(idx + 1)} 
                className={`aspect-square rounded-lg font-bold text-label-md transition-all ${
                  (idx + 1) === current 
                    ? 'bg-primary text-on-primary ring-2 ring-primary-container' 
                    : selectedAnswers[q.id] 
                      ? 'bg-tertiary-fixed text-on-tertiary-container border border-on-tertiary-container/30' 
                      : 'bg-surface-container-highest text-on-surface-variant hover:bg-outline-variant'
                }`}
              >
                {String(idx + 1).padStart(2, '0')}
              </button>
            ))}
          </div>
        </aside>

        {/* Content Question Area */}
        <section className="p-gutter overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto bg-surface-container-lowest rounded-2xl border border-outline-variant p-gutter shadow-sm">
            <div className="flex justify-between items-center mb-md">
              <span className="text-label-md text-on-surface-variant font-bold">Question {current} of {questionsData.length}</span>
              <span className="px-sm py-xs rounded bg-secondary-fixed text-on-secondary-container text-label-sm font-bold uppercase tracking-wider">
                {currentQuestion?.question_type || currentQuestion?.qtype || 'Multiple Choice'}
              </span>
            </div>
            
            <h1 className="text-headline-md text-primary font-bold mb-md">
              {currentQuestion?.question_text || currentQuestion?.text}
            </h1>
            
            <div className="space-y-sm">
              {currentOptions.map((opt) => (
                <button 
                  key={opt} 
                  onClick={() => handleSelectOption(opt)} 
                  className={`w-full text-left p-md rounded-xl border transition-all ${
                    selectedAnswers[currentQuestion?.id] === opt 
                      ? 'border-secondary bg-secondary-fixed/30 font-medium' 
                      : 'border-outline-variant bg-surface hover:border-secondary hover:bg-secondary-fixed/10'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            
            <div className="flex justify-between mt-lg">
              <button 
                onClick={() => setCurrent(Math.max(1, current - 1))} 
                disabled={current === 1}
                className="px-lg py-sm border border-outline-variant rounded-lg font-bold hover:bg-surface-container-low cursor-pointer disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrent(Math.min(questionsData.length, current + 1))} 
                disabled={current === questionsData.length}
                className="px-lg py-sm bg-primary text-on-primary rounded-lg font-bold hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                Save & Next
              </button>
            </div>
          </div>
        </section>

        {/* Proctor Live Monitor Panel */}
        <aside className="bg-surface-container-low p-md border-l border-outline-variant hidden lg:flex flex-col gap-md overflow-y-auto custom-scrollbar">
          {/* Live Feed Container */}
          <div className="card border overflow-hidden relative aspect-video bg-black shadow-md">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform -scale-x-100 opacity-80 ${cameraStatus === 'active' ? 'block' : 'hidden'}`}
            />
            {cameraStatus !== 'active' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-sm text-center">
                <Icon name="videocam_off" className="text-error mb-2" />
                <span className="text-[10px] font-bold text-error">
                  {cameraStatus === 'permission_denied' ? 'CAMERA BLOCKED / PERMISSION DENIED' : 'CONNECTING TO WEBCAM...'}
                </span>
              </div>
            )}
            <div className="absolute top-2 left-2 flex items-center gap-xs bg-black/60 px-xs py-0.5 rounded text-[8px] text-white">
              <div className={`w-1.5 h-1.5 rounded-full ${cameraStatus === 'active' ? 'bg-primary-container animate-pulse' : 'bg-error'}`} />
              PROCTOR MONITOR
            </div>
            <div className="absolute inset-0 pointer-events-none">
              {/* Gaze direction crosshair – shows smoothed gaze offset from center */}
              <div
                className="absolute w-3 h-3 border-2 border-primary-container rounded-full"
                style={{
                  left: `calc(50% + ${(smoothedPosRef.current.x - 0.5) * 100}% - 6px)`,
                  top: `calc(50% + ${(smoothedPosRef.current.y - 0.5) * 100}% - 6px)`,
                  transition: 'left 0.1s ease, top 0.1s ease',
                }}
              />
              <div className="absolute top-1/2 left-1/2 w-0.5 h-full bg-white/10 -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute top-1/2 left-1/2 w-full h-0.5 bg-white/10 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="absolute bottom-2 right-2 text-[8px] text-white/70 font-mono bg-black/40 px-xs py-0.5 rounded">
              FPS: 15
            </div>
          </div>

          {/* Non-blocking Face Alert Banner */}
          {faceAlert && (
            <div className={`rounded-xl border p-md text-sm font-medium ${
              faceAlert.level === 'violation'
                ? 'bg-error/10 border-error/30 text-error'
                : 'bg-warning/10 border-warning/30 text-warning'
            }`}>
              <div className="flex items-center gap-xs">
                <Icon
                  name={faceAlert.level === 'violation' ? 'gavel' : 'warning'}
                  className="text-base"
                  fill
                />
                <span className="font-bold text-label-sm">
                  {faceAlert.type === 'no_face'
                    ? (faceAlert.level === 'violation'
                        ? `Face not detected for ${faceAlert.duration}s`
                        : '⚠️ Face not clearly visible. Please adjust your position.')
                    : (faceAlert.level === 'violation'
                        ? `Multiple faces detected for ${faceAlert.duration}s`
                        : '⚠️ Multiple faces detected. Please ensure you are alone in the camera frame.')}
                </span>
              </div>
            </div>
          )}

          {/* Non-blocking Gaze Alert Banner */}
          {gazeAlert && (
            <div className={`rounded-xl border p-md text-sm font-medium ${
              gazeAlert.level === 'violation'
                ? 'bg-error/10 border-error/30 text-error'
                : 'bg-warning/10 border-warning/30 text-warning'
            }`}>
              <div className="flex items-center gap-xs">
                <Icon
                  name={gazeAlert.level === 'violation' ? 'gavel' : 'warning'}
                  className="text-base"
                  fill
                />
                <span className="font-bold text-label-sm">
                  {gazeAlert.level === 'violation'
                    ? `Please look at the exam screen. (${gazeAlert.duration}s)`
                    : `⚠️ Please look at the exam screen.`}
                </span>
              </div>
            </div>
          )}

          {/* Verification Indicators */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md space-y-xs">
            <div className="flex justify-between items-center mb-xs border-b pb-xs">
              <h3 className="text-label-md text-primary font-bold">Biometric Status</h3>
              <span className={`pill font-mono font-bold ${getRiskColor(riskScore)}`}>
                {riskScore}% Risk
              </span>
            </div>
            
            <Status label="Face visible" ok={proctorStatus.faceVisible} />
            <Status label="Single candidate" ok={proctorStatus.faceCount === 1} />
            <Status label="Eye gaze lock" ok={proctorStatus.gazeOk} />
            <div className="flex items-center justify-between py-xs">
              <span className="text-label-xs text-on-surface-variant">Gaze offset</span>
              <span className="text-[9px] font-mono text-on-surface-variant">
                {((smoothedPosRef.current.x - 0.5) * 100).toFixed(0)}% / {((smoothedPosRef.current.y - 0.5) * 100).toFixed(0)}%
                <span className={`ml-xs ${gazeAwayRef.current ? 'text-error' : 'text-on-tertiary-container'}`}>
                  {gazeAwayRef.current ? 'AWAY' : 'OK'}
                </span>
              </span>
            </div>
            <Status label="Tab locked focus" ok={proctorStatus.tabLocked} />
            <Status label="Fullscreen locked" ok={proctorStatus.fullscreenOk} />
            <Status label="Microphone status" ok={true} />
          </div>

          {/* Security Log */}
          <div className="flex-1 flex flex-col min-h-[140px] bg-surface-container-lowest rounded-xl border border-outline-variant p-md">
            <h4 className="text-label-sm font-bold text-on-surface-variant mb-xs tracking-wider uppercase">Security Logs</h4>
            <div className="flex-1 overflow-y-auto text-[10px] font-mono space-y-base custom-scrollbar pr-xs">
              {logs.length === 0 ? (
                <p className="text-on-surface-variant italic">No security incidents logged. Session clean.</p>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className={`leading-tight border-b border-surface-container-high pb-xs ${
                    log.type === 'error' ? 'text-error font-bold' : log.type === 'warning' ? 'text-secondary' : 'text-primary'
                  }`}>
                    [{log.time}] {log.text}
                  </div>
                ))
              )}
            </div>
          </div>

          <button 
            onClick={handleManualSubmit}
            className="h-12 bg-error text-on-error rounded-lg flex items-center justify-center font-bold gap-xs cursor-pointer hover:opacity-90"
          >
            Submit Exam <Icon name="send" />
          </button>
        </aside>
      </main>
    </div>
  );
}

function Status({ label, ok }) {
  return (
    <div className="flex items-center justify-between py-xs border-b border-surface-container/20">
      <span className="text-label-sm text-on-surface-variant">{label}</span>
      <div className="flex items-center gap-xs">
        <span className={`text-[10px] font-bold uppercase ${ok ? 'text-on-tertiary-container' : 'text-error'}`}>
          {ok ? 'OK' : 'VIOLATION'}
        </span>
        <Icon name={ok ? 'check_circle' : 'warning'} className={ok ? 'text-on-tertiary-container text-sm' : 'text-error text-sm'} fill />
      </div>
    </div>
  );
}
