import { useState, useEffect } from 'react';

export function useDeviceInfo() {
  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState('running');

  useEffect(() => {
    let cancelled = false;
    const collect = async () => {
      try {
        let gpuInfo = 'Unavailable';
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          if (ext) {
            gpuInfo = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || 'Unknown GPU';
          }
          const fmt = gl.getParameter(gl.RENDERER) || '';
          if (!gpuInfo || gpuInfo === 'Unknown GPU') gpuInfo = fmt;
        }
        const data = {
          platform: navigator.platform || 'Unknown',
          os: (() => {
            const ua = navigator.userAgent;
            if (ua.includes('Windows')) return 'Windows';
            if (ua.includes('Mac OS')) return 'macOS';
            if (ua.includes('Linux')) return 'Linux';
            if (ua.includes('Android')) return 'Android';
            if (ua.includes('iOS') || ua.includes('iPhone')) return 'iOS';
            return 'Unknown';
          })(),
          browser: (() => {
            const ua = navigator.userAgent;
            if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
            if (ua.includes('Edg')) return 'Edge';
            if (ua.includes('Firefox')) return 'Firefox';
            if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
            if (ua.includes('Brave') || navigator.brave?.isBrave) return 'Brave';
            return 'Unknown';
          })(),
          browserVersion: (() => {
            const ua = navigator.userAgent;
            const m = ua.match(/(?:Chrome|Firefox|Safari|Edg)\/([\d.]+)/);
            return m ? m[1] : 'Unknown';
          })(),
          cpuCores: navigator.hardwareConcurrency || 'Unknown',
          deviceMemory: navigator.deviceMemory !== undefined ? `${navigator.deviceMemory} GB` : 'Unavailable',
          gpuRenderer: gpuInfo,
          language: navigator.language || 'Unknown',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
          online: navigator.onLine,
        };
        if (!cancelled) {
          setInfo(data);
          setStatus('passed');
        }
      } catch {
        if (!cancelled) setStatus('failed');
      }
    };
    collect();
    return () => { cancelled = true; };
  }, []);

  return { info, status };
}
