import { useState, useEffect } from 'react';
import { generateDeviceFingerprint } from '../utils/security/fingerprint.js';

export function useDeviceFingerprint() {
  const [fingerprint, setFingerprint] = useState(null);
  const [status, setStatus] = useState('running');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fp = await generateDeviceFingerprint();
        if (!cancelled) {
          setFingerprint(fp);
          setStatus('passed');
        }
      } catch {
        if (!cancelled) setStatus('failed');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { fingerprint, status };
}
