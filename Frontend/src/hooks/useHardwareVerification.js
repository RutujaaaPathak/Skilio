import { useState, useRef, useCallback, useEffect } from 'react';

export function useHardwareVerification() {
  const [status, setStatus] = useState('running');
  const [error, setError] = useState(null);
  const [checks, setChecks] = useState({
    camera: { available: false, permitted: false },
    microphone: { available: false, permitted: false },
    internet: { online: false, speed: null },
    screen: { width: 0, height: 0 },
    browser: { name: '', supported: false },
    permissions: { camera: 'prompt', microphone: 'prompt' },
  });
  const mountedRef = useRef(true);

  const runChecks = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasCamera = devices.some(d => d.kind === 'videoinput');
      const hasMic = devices.some(d => d.kind === 'audioinput');

      let camPerm = 'prompt', micPerm = 'prompt';
      try {
        if (navigator.permissions?.query) {
          const camResult = await navigator.permissions.query({ name: 'camera' });
          camPerm = camResult.state;
          const micResult = await navigator.permissions.query({ name: 'microphone' });
          micPerm = micResult.state;
        }
      } catch {}

      let internetSpeed = null;
      try {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        internetSpeed = conn?.downlink || null;
      } catch {}

      const ua = navigator.userAgent;
      let browserName = 'Unknown';
      if (ua.includes('Chrome')) browserName = 'Chrome';
      else if (ua.includes('Firefox')) browserName = 'Firefox';
      else if (ua.includes('Safari')) browserName = 'Safari';
      else if (ua.includes('Edge')) browserName = 'Edge';
      const supported = ['Chrome', 'Firefox', 'Edge', 'Safari'].includes(browserName);

      if (!mountedRef.current) return;
      setChecks({
        camera: { available: hasCamera, permitted: camPerm === 'granted' },
        microphone: { available: hasMic, permitted: micPerm === 'granted' },
        internet: { online: navigator.onLine, speed: internetSpeed },
        screen: { width: window.screen.width, height: window.screen.height },
        browser: { name: browserName, supported },
        permissions: { camera: camPerm, microphone: micPerm },
      });

      if (!hasCamera) { setError('No camera detected'); setStatus('failed'); }
      else if (!hasMic) { setError('No microphone detected'); setStatus('failed'); }
      else if (camPerm === 'denied') { setError('Camera permission denied'); setStatus('failed'); }
      else if (micPerm === 'denied') { setError('Microphone permission denied'); setStatus('failed'); }
      else if (!navigator.onLine) { setError('No internet connection'); setStatus('failed'); }
      else { setStatus('passed'); setError(null); }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || 'Hardware check failed');
        setStatus('failed');
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    runChecks();
    const handleDeviceChange = () => runChecks();
    const handleOnline = () => runChecks();
    const handleOffline = () => runChecks();

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(runChecks, 3000);

    return () => {
      mountedRef.current = false;
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [runChecks]);

  const reset = useCallback(() => {
    setStatus('running');
    setError(null);
    runChecks();
  }, [runChecks]);

  return { status, error, checks, reset };
}
