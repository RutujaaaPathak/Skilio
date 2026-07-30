import { useState, useCallback } from 'react';
import { securityService } from '../services/securityService.js';
import { CHECK_STATUS } from '../utils/security/checks.js';

export function useRegisteredDevice() {
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle');

  const verify = useCallback(async (fingerprintHash) => {
    setStatus(CHECK_STATUS.RUNNING);
    try {
      const res = await securityService.verifyFingerprint(fingerprintHash);
      setResult(res);
      setStatus(res.matched ? CHECK_STATUS.PASSED : CHECK_STATUS.WARNING);
    } catch {
      setResult({ matched: false, message: 'Backend unavailable' });
      setStatus(CHECK_STATUS.WARNING);
    }
  }, []);

  return { result, status, verify };
}
