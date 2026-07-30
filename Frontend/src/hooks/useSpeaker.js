import { useState, useCallback } from 'react';

export function useSpeaker() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const playBeep = useCallback(() => {
    setStatus('running');
    setError(null);
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 440;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1);
      setTimeout(() => {
        ctx.close();
      }, 1100);
      setStatus('awaiting');
    } catch (err) {
      setError('Speaker test failed: ' + err.message);
      setStatus('failed');
    }
  }, []);

  const confirmHeard = useCallback((heard) => {
    if (heard) {
      setStatus('passed');
    } else {
      setStatus('failed');
      setError('User did not hear the sound');
    }
  }, []);

  return { status, error, playBeep, confirmHeard };
}
