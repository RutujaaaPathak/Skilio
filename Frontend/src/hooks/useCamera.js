import { useState, useRef, useCallback, useEffect } from 'react';

export function useCamera() {
  const [status, setStatus] = useState('running');
  const [error, setError] = useState(null);
  const [resolution, setResolution] = useState(null);
  const [available, setAvailable] = useState(false);
  const streamRef = useRef(null);
  const videoRef = useRef(null);

  const startCamera = useCallback(async () => {
    setStatus('running');
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('failed');
        setError('Camera API not supported in this browser');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setAvailable(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const track = stream.getVideoTracks()[0];
        const caps = track.getSettings?.() || track.getConstraints?.() || {};
        setResolution({
          width: caps.width || videoRef.current.videoWidth || 'Unknown',
          height: caps.height || videoRef.current.videoHeight || 'Unknown',
        });
      }
      setStatus('passed');
    } catch (err) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found');
      } else {
        setError(err.message || 'Camera unavailable');
      }
      setStatus('failed');
      setAvailable(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setAvailable(false);
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return { status, error, resolution, available, videoRef, startCamera, stopCamera };
}
