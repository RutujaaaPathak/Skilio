import { useState, useRef, useCallback, useEffect } from 'react';

const NOISE_THRESHOLD = 60;
const LOUD_DURATION_MS = 5000;

export function useAmbientNoise() {
  const [status, setStatus] = useState('running');
  const [error, setError] = useState(null);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [peakNoise, setPeakNoise] = useState(0);
  const [classification, setClassification] = useState('Analyzing...');
  const [waveform, setWaveform] = useState(new Array(32).fill(0));
  const [available, setAvailable] = useState(false);

  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animRef = useRef(null);
  const loudStartRef = useRef(null);
  const peakRef = useRef(0);
  const ctxRef = useRef(null);

  const classifyLevel = useCallback((level) => {
    if (level < 25) return 'Quiet';
    if (level < 50) return 'Normal';
    if (level < 75) return 'Noisy';
    return 'Very Noisy';
  }, []);

  const startMonitoring = useCallback(async () => {
    setStatus('running');
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('failed');
        setError('Media API not available');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setAvailable(true);

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const tick = () => {
        if (!analyserRef.current) {
          animRef.current = requestAnimationFrame(tick);
          return;
        }
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
        const avg = sum / bufferLength;
        const pct = Math.min(100, Math.round(avg / 2.55));
        setNoiseLevel(pct);

        if (pct > peakRef.current) peakRef.current = pct;
        setPeakNoise(peakRef.current);

        setClassification(classifyLevel(pct));

        const wave = new Array(32);
        for (let i = 0; i < 32; i++) {
          wave[i] = dataArray[Math.floor((i / 32) * bufferLength)] / 255;
        }
        setWaveform(wave);

        if (pct >= NOISE_THRESHOLD) {
          if (!loudStartRef.current) loudStartRef.current = Date.now();
          const elapsed = Date.now() - loudStartRef.current;
          if (elapsed >= LOUD_DURATION_MS) {
            setError('High background noise detected');
            setStatus('failed');
          }
        } else {
          loudStartRef.current = null;
        }

        animRef.current = requestAnimationFrame(tick);
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
  }, [classifyLevel]);

  const stopMonitoring = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
    analyserRef.current = null;
    setAvailable(false);
  }, []);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (ctxRef.current) ctxRef.current.close().catch(() => {});
    };
  }, []);

  const reset = useCallback(() => {
    peakRef.current = 0;
    loudStartRef.current = null;
    setNoiseLevel(0);
    setPeakNoise(0);
    setClassification('Analyzing...');
    setWaveform(new Array(32).fill(0));
    setStatus('running');
    setError(null);
    startMonitoring();
  }, [startMonitoring]);

  return {
    status, error, noiseLevel, peakNoise, classification, waveform, available,
    startMonitoring, stopMonitoring, reset,
  };
}
