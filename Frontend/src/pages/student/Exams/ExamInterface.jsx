import { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Icon from '../../../components/Icon.jsx';
import { api } from '../../../services/api.js';

export default function ExamInterface() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(1);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [questionsData, setQuestionsData] = useState([]);
  const [exam, setExam] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(3600); // 1 hour default
  const [user, setUser] = useState(null);

  // Load user profile and offline exam package on mount
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (e) {
        console.error("Failed to parse user:", e);
      }
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
      } catch (e) {
        console.error("Failed to parse offline package:", e);
      }
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
  const [sessionToken] = useState(localStorage.getItem('session_token') || 'demo-session-token-alice-123');
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
  const trackerTaskRef = useRef(null);
  const analysisIntervalRef = useRef(null);
  
  // Counter refs to smooth warnings
  const noFaceTimerRef = useRef(0);
  const lookingAwayTimerRef = useRef(0);
  const multipleFacesTimerRef = useRef(0);
  const warningCountRef = useRef(0);

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
        endExamSecurityViolation("fullscreen_exit", "Fullscreen exited during exam");
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
  }, [sessionToken]);

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




  // Request camera and setup tracking
  useEffect(() => {
    // Request Camera Stream with simplified constraints
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        streamRef.current = stream;
        setCameraStatus('active');
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Initialize tracking.js if loaded
        if (window.tracking) {
          const startTracking = () => {
            if (!videoRef.current || !window.tracking) return;
            const tracker = new window.tracking.ObjectTracker('face');
            tracker.setInitialScale(1.6);
            tracker.setStepSize(1.7);
            tracker.setEdgesDensity(0.05);

            tracker.on('track', event => {
              const data = event.data;
              if (data.length === 0) {
                // No face
                noFaceTimerRef.current += 1;
                if (noFaceTimerRef.current >= 25) { // ~5 seconds of lost tracking
                  setProctorStatus(prev => ({ ...prev, faceVisible: false, faceCount: 0 }));
                  triggerViolation("Face not detected. Please face the camera.", "no_face_detected", 0.7);
                  noFaceTimerRef.current = 0;
                }
                lookingAwayTimerRef.current = 0;
                multipleFacesTimerRef.current = 0;
              } else if (data.length > 1) {
                // Multiple faces
                multipleFacesTimerRef.current += 1;
                if (multipleFacesTimerRef.current >= 10) { // ~2 seconds of multi-faces
                  setProctorStatus(prev => ({ ...prev, faceCount: data.length }));
                  triggerViolation("Multiple faces detected in camera view!", "multiple_faces_detected", 0.9);
                  multipleFacesTimerRef.current = 0;
                }
                noFaceTimerRef.current = 0;
                lookingAwayTimerRef.current = 0;
              } else {
                // Exactly 1 face
                noFaceTimerRef.current = 0;
                multipleFacesTimerRef.current = 0;
                setProctorStatus(prev => ({ ...prev, faceVisible: true, faceCount: 1 }));

                const rect = data[0];
                const videoW = videoRef.current?.videoWidth || 320;
                const videoH = videoRef.current?.videoHeight || 240;
                const faceCx = rect.x + rect.width / 2;
                const faceCy = rect.y + rect.height / 2;
                const targetCx = videoW / 2;
                const targetCy = videoH / 2;

                // Distance from center check (gaze/looking away heuristic) - relaxed for specs/headphones
                const maxGazeDist = videoW * 0.32; 
                const dist = Math.sqrt(Math.pow(faceCx - targetCx, 2) + Math.pow(faceCy - targetCy, 2));

                if (dist > maxGazeDist) {
                  lookingAwayTimerRef.current += 1;
                  if (lookingAwayTimerRef.current >= 25) { // ~5 seconds of looking away
                    setProctorStatus(prev => ({ ...prev, gazeOk: false }));
                    triggerViolation("Please look directly at the exam screen.", "looking_away", 0.65);
                    lookingAwayTimerRef.current = 0;
                  }
                } else {
                  lookingAwayTimerRef.current = 0;
                  setProctorStatus(prev => ({ ...prev, gazeOk: true }));
                }
              }
            });

            trackerTaskRef.current = window.tracking.track(videoRef.current, tracker);
          };

          const videoEl = videoRef.current;
          if (videoEl) {
            if (videoEl.readyState >= 2 && videoEl.videoWidth > 0) {
              startTracking();
            } else {
              videoEl.onloadedmetadata = () => {
                startTracking();
              };
            }
          }
        }
      })
      .catch(err => {
        console.error("Camera access blocked inside interface:", err);
        setCameraStatus('permission_denied');
        setProctorStatus(prev => ({ ...prev, cameraOk: false }));
        // Log immediately
        logProctorViolation("camera_blocked", 1.0, { error: err.name || err.message });
      });

    // Start periodic Vision AI screenshots check (every 20 seconds)
    analysisIntervalRef.current = setInterval(() => {
      captureAndAnalyzeFrame();
    }, 20000);

    return () => {
      cleanupWebcam();
    };
  }, []);

  const cleanupWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    if (trackerTaskRef.current) {
      trackerTaskRef.current.stop();
    }
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
    }
  };

  // Visibility (Tab switch) & Window Blur listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        endExamSecurityViolation("tab_switch", "Tab switch/minimization detected during exam");
      }
    };
    
    const handleBlur = () => {
      setProctorStatus(prev => ({ ...prev, tabLocked: false }));
      endExamSecurityViolation("tab_switch", "Window lost focus / blurred during exam");
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
  }, [sessionToken]);


  // Disable Right-Click and Common Dev Shortcut Keys
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      triggerViolation("Blocked Right-Click attempt", "right_click", 1.0, "Blocked right click context menu");
    };

    const handleKeyDown = (e) => {
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
  }, [warningCount]);

  // Check auto-submit thresholds
  useEffect(() => {
    if (warningCount >= 3 || riskScore >= 75.0) {
      autoSubmitExam();
    }
  }, [warningCount, riskScore]);

  const addLogEntry = (msg, type = 'info') => {
    const stamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ time: stamp, text: msg, type }, ...prev]);
  };

  // General Violation triggers (increases warning counter, logs to DB)
  const triggerViolation = (userMessage, eventType, confidence, description = null) => {
    warningCountRef.current += 1;
    const newCount = warningCountRef.current;
    setWarningCount(newCount);
    addLogEntry(`[Violation] ${userMessage} (${newCount}/3)`, 'error');

    // Post to database
    logProctorViolation(eventType, confidence, { warning_number: newCount }, description || userMessage);
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

      const res = await api.post('/proctor/events', payload);
      if (res && res.session_risk_score !== undefined) {
        setRiskScore(res.session_risk_score);
      }
    } catch (err) {
      console.error("Failed to post proctor event:", err);
    }
  };

  const endExamSecurityViolation = async (eventType, description) => {
    try {
      const payload = {
        session_token: sessionToken,
        event_type: eventType,
        confidence_score: 1.0,
        description: description,
        metadata: {
          forced_submit: true,
          reason: description,
          exam_running: true,
          client_agent: navigator.userAgent,
        }
      };
      await api.post('/proctor/events', payload);
    } catch (err) {
      console.error("Failed to post proctor event on forced submit:", err);
    }
    cleanupWebcam();
    navigate('/student/exams/submission?auto=true');
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
          // Only increment warnings if they are looking away repeatedly
          logProctorViolation("looking_away", 0.85);
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
    if (!activeExamId || !sessionToken) return;

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
    cleanupWebcam();
    await syncAnswers(true);
    navigate('/student/exams/submission?auto=true');
  };

  const handleManualSubmit = async () => {
    cleanupWebcam();
    await syncAnswers(true);
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
      {/* Fullscreen Lockdown Shield */}
      {!isFullscreen && (
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

      {/* Warning Banner alerts */}
      {warningCount > 0 && isFullscreen && (
        <div 
          className="fixed top-20 z-50 bg-error text-white px-6 py-4 rounded-2xl flex items-center justify-between shadow-2xl animate-bounce border border-white/10"
          style={{ width: '90%', maxWidth: '512px', left: '50%', transform: 'translateX(-50%)' }}
        >
          <div className="flex items-center gap-3">
            <Icon name="warning" className="text-white text-xl animate-pulse" fill />
            <span className="text-sm font-bold tracking-wide">
              SECURITY WARNING: Violation {warningCount}/3. Auto-submit on 3rd violation!
            </span>
          </div>
          <button 
            onClick={() => {
              const prev = Math.min(2, warningCount);
              warningCountRef.current = prev;
              setWarningCount(prev);
            }}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Icon name="close" className="text-lg" />
          </button>
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
            <div className="absolute bottom-2 right-2 text-[8px] text-white/70 font-mono bg-black/40 px-xs py-0.5 rounded">
              FPS: 15
            </div>
          </div>

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

          {/* Test Simulation Panel */}
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md space-y-xs">
            <div className="flex justify-between items-center mb-xs border-b pb-xs">
              <h4 className="text-label-sm font-bold text-primary uppercase tracking-wider">Simulation Panel</h4>
              <span className="text-[9px] px-sm bg-secondary-container text-primary font-bold uppercase rounded">Test Tools</span>
            </div>
            <div className="grid grid-cols-2 gap-xs">
              <button 
                onClick={() => triggerViolation("Mobile phone detected inside proctor frame!", "phone_detected", 0.95)}
                className="py-1 px-1 bg-error/10 text-error hover:bg-error/20 border border-error/30 text-[9px] font-bold rounded cursor-pointer text-center"
              >
                Simulate Phone
              </button>
              <button 
                onClick={() => triggerViolation("Tab switch/minimization detected!", "tab_switch", 0.9)}
                className="py-1 px-1 bg-warning/10 text-warning-container hover:bg-warning/20 border border-warning/30 text-[9px] font-bold rounded cursor-pointer text-center"
              >
                Simulate Tab Switch
              </button>
              <button 
                onClick={() => triggerViolation("Face not detected. Please face the camera.", "no_face_detected", 0.7)}
                className="py-1 px-1 bg-secondary-container/20 text-primary hover:bg-secondary-container/40 border border-secondary/30 text-[9px] font-bold rounded cursor-pointer text-center"
              >
                Simulate No Face
              </button>
              <button 
                onClick={() => triggerViolation("Multiple faces detected in camera view!", "multiple_faces_detected", 0.9)}
                className="py-1 px-1 bg-secondary-container/20 text-primary hover:bg-secondary-container/40 border border-secondary/30 text-[9px] font-bold rounded cursor-pointer text-center"
              >
                Simulate Multi-Face
              </button>
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
