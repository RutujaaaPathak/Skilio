import { useState, useEffect } from 'react';

const VM_VENDOR_PATTERNS = [
  'virtualbox', 'vmware', 'qemu', 'hyper-v', 'virtual', 'vbox',
  'innotek', 'parallels', 'xen', 'kvm', 'bhyve',
];

export function useVMDetection() {
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('running');

  useEffect(() => {
    try {
      let gpuRenderer = '';
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) {
          gpuRenderer = (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
        }
      }

      const isAutomated = navigator.webdriver;
      const cpuCores = navigator.hardwareConcurrency || 0;
      const mem = navigator.deviceMemory || 0;

      let clues = 0;
      if (isAutomated) clues += 2;
      if (cpuCores > 0 && cpuCores <= 2) clues += 1;
      if (mem > 0 && mem <= 2) clues += 1;
      if (gpuRenderer && VM_VENDOR_PATTERNS.some(p => gpuRenderer.includes(p))) clues += 2;

      const verdict = clues >= 3 ? 'Likely VM'
        : clues >= 1 ? 'Possible VM'
        : 'Not Detected';

      setResult({ verdict, clues, gpuRenderer: gpuRenderer || 'Unavailable', webdriver: isAutomated });
      setStatus('passed');
    } catch {
      setResult({ verdict: 'Detection Error', clues: 0, gpuRenderer: 'Error', webdriver: false });
      setStatus('warning');
    }
  }, []);

  return { result, status };
}
