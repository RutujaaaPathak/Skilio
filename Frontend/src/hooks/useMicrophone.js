import { useState, useRef, useCallback, useEffect } from 'react';

export function useMicrophone() {
  const [status, setStatus] = useState('running');
  const [error, setError] = useState(null);
  const [level, setLevel] = useState(0);
  const [decibels, setDecibels] = useState(0);
  const [available, setAvailable] = useState(false);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  const startMic = useCallback(async () => {
    setStatus('running');
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('failed');
        setError('Media devices API not supported');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setAvailable(true);

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const avg = sum / bufferLength;
        const pct = Math.min(100, Math.round(avg / 2.55));
        setLevel(pct);
        setDecibels(Math.round(avg > 0 ? 20 * Math.log10(avg / 255) : -100));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
      setStatus('passed');
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found');
      } else {
        setError(err.message || 'Microphone unavailable');
      }
      setStatus('failed');
    }
  }, []);

  const stopMic = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    analyserRef.current = null;
    setAvailable(false);
    setLevel(0);
    setDecibels(0);
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  return { status, error, level, decibels, available, startMic, stopMic };
}
