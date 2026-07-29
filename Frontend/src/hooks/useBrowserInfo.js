import { useState, useEffect } from 'react';

const SUPPORTED = ['Chrome', 'Edge', 'Brave', 'Firefox'];

export function useBrowserInfo() {
  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState('running');

  useEffect(() => {
    try {
      const ua = navigator.userAgent;
      let name = 'Unknown';
      if (ua.includes('Chrome') && !ua.includes('Edg') && !ua.includes('Brave')) name = 'Chrome';
      else if (ua.includes('Edg')) name = 'Edge';
      else if (ua.includes('Firefox')) name = 'Firefox';
      else if (ua.includes('Safari') && !ua.includes('Chrome')) name = 'Safari';
      else if (ua.includes('Brave') || navigator.brave?.isBrave) name = 'Brave';

      const versionMatch = ua.match(/(?:Chrome|Firefox|Safari|Edg|Version)\/([\d.]+)/);
      const version = versionMatch ? versionMatch[1] : 'Unknown';

      const supported = SUPPORTED.includes(name);
      const data = { name, version, supported };
      setInfo(data);
      setStatus(supported ? 'passed' : 'warning');
    } catch {
      setStatus('failed');
    }
  }, []);

  return { info, status };
}
