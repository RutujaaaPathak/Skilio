import { useState, useEffect } from 'react';

export function useExternalDisplay() {
  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState('running');

  useEffect(() => {
    try {
      /*
       * The Screen Details API (getScreenDetails) is available in some
       * Chromium-based browsers behind a permission prompt. Most browsers
       * do not allow enumeration of multiple displays from JavaScript for
       * privacy/security reasons.
       * This check uses the available Screen API surface. If
       * getScreenDetails is available we attempt it; otherwise we report
       * that detection is unavailable.
       */
      if (window.getScreenDetails && typeof window.getScreenDetails === 'function') {
        window.getScreenDetails().then((details) => {
          const screens = details.screens;
          const count = screens ? screens.length : 1;
          setInfo({ count, screens: count, method: 'ScreenDetails API' });
          setStatus(count > 1 ? 'warning' : 'passed');
        }).catch(() => {
          setInfo({ count: 1, method: 'Fallback (no permission)' });
          setStatus('passed');
        });
      } else {
        setInfo({ count: 1, method: 'Unavailable - API not supported' });
        setStatus('warning');
      }
    } catch {
      setInfo({ count: 1, method: 'Detection unavailable' });
      setStatus('warning');
    }
  }, []);

  return { info, status };
}
