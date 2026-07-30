import { useState, useEffect } from 'react';

export function useScreenResolution() {
  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState('running');

  useEffect(() => {
    try {
      const data = {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio || 1,
      };
      setInfo(data);
      const minW = 1366;
      const minH = 768;
      if (data.width < minW || data.height < minH) {
        setStatus('warning');
      } else {
        setStatus('passed');
      }
    } catch {
      setStatus('failed');
    }
  }, []);

  return { info, status };
}
