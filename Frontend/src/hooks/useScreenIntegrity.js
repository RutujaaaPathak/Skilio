import { useState, useRef, useCallback, useEffect } from 'react';

const MAX_TAB_SWITCHES = 3;

export function useScreenIntegrity() {
  const [status, setStatus] = useState('running');
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [warnings, setWarnings] = useState([]);
  const fullscreenRef = useRef(isFullscreen);
  const tabSwitchRef = useRef(0);

  const addWarning = useCallback((msg) => {
    setWarnings(prev => [...prev.slice(-4), msg]);
  }, []);

  const fullscreenEverRef = useRef(false);

  const handleFullscreenChange = useCallback(() => {
    const fs = !!document.fullscreenElement;
    setIsFullscreen(fs);
    if (fs) {
      fullscreenEverRef.current = true;
      if (tabSwitchRef.current < MAX_TAB_SWITCHES) {
        setStatus('passed');
        setError(null);
      }
    }
    fullscreenRef.current = fs;
    if (!fs && fullscreenEverRef.current) {
      addWarning('Fullscreen exited');
      setStatus('failed');
      setError('Fullscreen was exited during verification');
    }
  }, [addWarning]);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'hidden') {
      tabSwitchRef.current += 1;
      setTabSwitches(tabSwitchRef.current);
      addWarning('Tab switch detected');
      if (tabSwitchRef.current >= MAX_TAB_SWITCHES) {
        setStatus('failed');
        setError('Maximum tab switches exceeded');
      }
    }
  }, [addWarning]);

  const handleWindowBlur = useCallback(() => {
    addWarning('Window lost focus');
  }, [addWarning]);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    const interval = setInterval(() => {
      if (!fullscreenRef.current && fullscreenEverRef.current) {
        setStatus('failed');
        setError('Fullscreen required for exam');
      }
    }, 5000);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      clearInterval(interval);
    };
  }, [handleFullscreenChange, handleVisibilityChange, handleWindowBlur]);

  const requestFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      }
    } catch (err) {
      if (err.name !== 'TypeError') {
        addWarning('Fullscreen request failed');
      }
    }
  }, [addWarning]);

  const reset = useCallback(() => {
    setStatus('running');
    setError(null);
    setTabSwitches(0);
    setWarnings([]);
    tabSwitchRef.current = 0;
    requestFullscreen();
  }, [requestFullscreen]);

  useEffect(() => {
    if (status === 'running' && isFullscreen && tabSwitches < MAX_TAB_SWITCHES) {
      setStatus('passed');
    }
  }, [isFullscreen, tabSwitches, status]);

  return { status, error, isFullscreen, tabSwitches, warnings, requestFullscreen, reset };
}
