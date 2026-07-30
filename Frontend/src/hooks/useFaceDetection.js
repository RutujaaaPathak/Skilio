import { useState, useRef, useCallback, useEffect } from 'react';

export function useFaceDetection() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [faces, setFaces] = useState([]);
  const [confidence, setConfidence] = useState(0);
  const [stable, setStable] = useState(false);
  const [stableDuration, setStableDuration] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const stableTimerRef = useRef(null);
  const stableCountRef = useRef(0);

  const startDetection = useCallback(async () => {
    setStatus('running');
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('failed');
        setError('Camera API not available');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      streamRef.current = stream;
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('running');
    } catch (err) {
      setError(err.name === 'NotAllowedError' ? 'Camera permission denied' : err.message);
      setStatus('failed');
    }
  }, []);

  const onFaceResults = useCallback((results) => {
    setFaces(results);
    if (results.length === 1) {
      const f = results[0];
      setConfidence(Math.round((f.detection?.confidence || 0) * 100));
      setStable(true);
      stableCountRef.current += 1;
      setStableDuration(Math.min(100, Math.round((stableCountRef.current / 30) * 100)));
      if (stableCountRef.current >= 90) {
        setStatus('passed');
      }
    } else {
      setConfidence(0);
      setStable(false);
      stableCountRef.current = 0;
      setStableDuration(0);
    }
  }, []);

  const stopDetection = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setFaces([]);
    setConfidence(0);
    setStable(false);
    setStableDuration(0);
    stableCountRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return {
    status, error, faces, confidence, stable, stableDuration, cameraActive,
    videoRef, startDetection, stopDetection, onFaceResults,
  };
}
