import { useState, useEffect } from 'react';

export function useInternetStatus() {
  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState('running');

  useEffect(() => {
    const update = () => {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const data = {
        online: navigator.onLine,
        type: conn?.effectiveType || 'Unknown',
        downlink: conn?.downlink || 'Unknown',
        rtt: conn?.rtt !== undefined && conn?.rtt !== null ? conn.rtt : 'Unknown',
      };
      setInfo(data);
      setStatus('passed');
    };

    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      conn.addEventListener('change', update);
    }

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      if (conn) conn.removeEventListener('change', update);
    };
  }, []);

  return { info, status };
}
