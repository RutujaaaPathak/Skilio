import { sha256 } from './hashing.js';

function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'canvas-unavailable';
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(100, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Skilio', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Security', 4, 45);
    ctx.fillStyle = '#000';
    ctx.font = '12px Courier';
    ctx.fillText('FP', 200, 200);
    return canvas.toDataURL();
  } catch {
    return 'canvas-unavailable';
  }
}

export async function generateDeviceFingerprint() {
  const canvasFp = getCanvasFingerprint();
  const components = [
    navigator.userAgent,
    navigator.platform || '',
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    navigator.language || '',
    `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth || 24}`,
    navigator.hardwareConcurrency?.toString() || '',
    navigator.deviceMemory?.toString() || '',
    canvasFp,
  ];
  const raw = components.join('|||');
  const hash = await sha256(raw);
  return { hash, raw: raw.substring(0, 50) + '...' };
}
