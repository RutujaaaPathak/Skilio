import { useState, useRef, useCallback, useEffect } from 'react';

const STABILITY_FRAMES = 5;
const CONSECUTIVE_CENTERED_REQUIRED = 90;
const CENTER_MARGIN = 0.2;
const MIN_FACE_AREA = 0.02;
const MAX_FACE_AREA = 0.4;

function getFaceDetectorAPI() {
  if (window.FaceDetector) {
    try {
      return new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
    } catch { return null; }
  }
  return null;
}

export function useFaceVerification() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [faces, setFaces] = useState([]);
  const [faceCount, setFaceCount] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [verified, setVerified] = useState(false);
  const [isCentered, setIsCentered] = useState(false);
  const [isStable, setIsStable] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [modelType, setModelType] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const modelRef = useRef(null);
  const detectorRef = useRef(null);
  const animRef = useRef(null);
  const positionsRef = useRef([]);
  const centeredRef = useRef(0);
  const stableTimerRef = useRef(null);
  const verifiedRef = useRef(false);
  const statusRef = useRef('idle');
  const [setupKey, setSetupKey] = useState(0);

  useEffect(() => { verifiedRef.current = verified; }, [verified]);
  useEffect(() => { statusRef.current = status; }, [status]);

  const startCamera = useCallback(async () => {
    setStatus('running');
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('failed');
        setError('Camera API not available');
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
      return true;
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera Permission Denied');
      } else if (err.name === 'NotFoundError') {
        setError('No Camera Detected');
      } else {
        setError(err.message || 'Camera unavailable');
      }
      setStatus('failed');
      return false;
    }
  }, []);

  const initModel = useCallback(async (retry) => {
    const detector = getFaceDetectorAPI();
    if (detector) {
      detectorRef.current = detector;
      setModelType('FaceDetector');
      return true;
    }
    if (!retry) return false;
    try {
      await import('@tensorflow/tfjs');
      const blazeface = await import('@tensorflow-models/blazeface');
      modelRef.current = await blazeface.load();
      setModelType('BlazeFace');
      return true;
    } catch (err) {
      console.error('BlazeFace load failed:', err);
      setModelType('none');
      return false;
    }
  }, []);

  const estimateFace = useCallback(async (video) => {
    const detector = detectorRef.current;
    const model = modelRef.current;
    if (detector) {
      try {
        const detections = await detector.detect(video);
        return detections.map(d => {
          const box = d.boundingBox;
          return {
            topLeft: [box.x, box.y],
            bottomRight: [box.x + box.width, box.y + box.height],
            probability: d.landmarks ? 1 : 0.9,
          };
        });
      } catch {
        return [];
      }
    }
    if (model) {
      try {
        return await model.estimateFaces(video, false);
      } catch {
        return [];
      }
    }
    return [];
  }, []);

  const detectFacesRef = useRef(async () => {});
  useEffect(() => {
    detectFacesRef.current = async () => {
      const vid = videoRef.current;
      if (!vid) return;
      if (vid.readyState < 2) return;
      const predictions = await estimateFace(vid);
      const count = predictions.length;
      setFaceCount(count);
      setFaces(predictions);

      if (count === 0) {
        centeredRef.current = 0;
        setIsCentered(false);
        setIsStable(false);
        if (verifiedRef.current) {
          setVerified(false);
          verifiedRef.current = false;
          setStatus('failed');
          setError('Face lost. Verification invalidated.');
        }
        return;
      }

      if (count > 1) {
        centeredRef.current = 0;
        setIsCentered(false);
        setIsStable(false);
        setStatus('failed');
        setError('Multiple people detected. Only one candidate is allowed.');
        setVerified(false);
        verifiedRef.current = false;
        return;
      }

      const face = predictions[0];
      const [x1, y1] = face.topLeft;
      const [x2, y2] = face.bottomRight;
      const boxW = x2 - x1;
      const boxH = y2 - y1;
      const frameW = vid.videoWidth || 640;
      const frameH = vid.videoHeight || 480;

      const faceCx = x1 + boxW / 2;
      const faceCy = y1 + boxH / 2;
      const frameCx = frameW / 2;
      const frameCy = frameH / 2;
      const marginX = frameW * CENTER_MARGIN;
      const marginY = frameH * CENTER_MARGIN;

      const centered = Math.abs(faceCx - frameCx) < marginX && Math.abs(faceCy - frameCy) < marginY;
      setIsCentered(centered);

      const area = (boxW * boxH) / (frameW * frameH);
      let distError = null;
      if (area < MIN_FACE_AREA) distError = 'Face too far';
      else if (area > MAX_FACE_AREA) distError = 'Face too close';

      positionsRef.current.push({ x: faceCx, y: faceCy });
      if (positionsRef.current.length > STABILITY_FRAMES) positionsRef.current.shift();

      let stable = true;
      if (positionsRef.current.length >= 2) {
        let totalMovement = 0;
        for (let i = 1; i < positionsRef.current.length; i++) {
          totalMovement += Math.abs(positionsRef.current[i].x - positionsRef.current[i - 1].x);
          totalMovement += Math.abs(positionsRef.current[i].y - positionsRef.current[i - 1].y);
        }
        stable = totalMovement / positionsRef.current.length < 30;
      }
      setIsStable(stable);

      if (centered && stable && !distError && !verifiedRef.current) {
        centeredRef.current += 1;
      } else if (!verifiedRef.current) {
        centeredRef.current = 0;
        setCountdown(null);
      }

      if (centeredRef.current >= CONSECUTIVE_CENTERED_REQUIRED && !verifiedRef.current) {
        let count = 3;
        setCountdown(count);
        const interval = setInterval(() => {
          count -= 1;
          setCountdown(count);
          if (count <= 0) {
            clearInterval(interval);
            setVerified(true);
            verifiedRef.current = true;
            setStatus('passed');
            setCountdown(null);
          }
        }, 1000);
        stableTimerRef.current = interval;
      }

      if (distError && !verifiedRef.current) {
        setError(distError);
        setStatus('failed');
      } else if (distError && verifiedRef.current) {
        setVerified(false);
        verifiedRef.current = false;
        setStatus('failed');
        setError(distError);
      } else if (!distError && statusRef.current !== 'running' && !verifiedRef.current) {
        setStatus('running');
        setError(null);
      }

      if (verifiedRef.current && !centered) {
        setVerified(false);
        verifiedRef.current = false;
        setStatus('failed');
        setError('Face moved out of center. Verification invalidated.');
      }
    };
  }, [estimateFace]);

  useEffect(() => {
    let mounted = true;
    let cleanup = false;

    (async () => {
      const camOk = await startCamera();
      if (!mounted || !camOk) return;
      const modelOk = await initModel(false);
      if (!mounted) return;
      if (!modelOk) {
        await initModel(true);
      }
      if (!mounted) return;
      const loop = async () => {
        if (cleanup) return;
        await detectFacesRef.current();
        if (!cleanup) animRef.current = requestAnimationFrame(loop);
      };
      animRef.current = requestAnimationFrame(loop);
    })();

    return () => {
      cleanup = true;
      mounted = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (stableTimerRef.current) clearInterval(stableTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setCameraReady(false);
      }
    };
  }, [setupKey, startCamera, initModel]);

  const reset = useCallback(() => {
    setSetupKey(k => k + 1);
    setStatus('running');
    statusRef.current = 'running';
    setError(null);
    setVerified(false);
    verifiedRef.current = false;
    setCountdown(null);
    setIsCentered(false);
    setIsStable(false);
    centeredRef.current = 0;
  }, []);

  const retryModel = useCallback(async () => {
    setStatus('running');
    setError(null);
    const ok = await initModel(true);
    return ok;
  }, [initModel]);

  return {
    status, error, faces, faceCount, countdown, verified,
    isCentered, isStable, cameraReady, videoRef, reset, modelType, retryModel,
  };
}
