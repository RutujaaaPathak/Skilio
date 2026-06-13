import { useEffect, useRef } from 'react';
import { monitoringService } from '../services/monitoringService.js';

/**
 * Monitors proctor-relevant events during an exam and logs them to the backend.
 *
 * Detects:
 *  - visibilitychange (tab switch / tab hidden)
 *  - window blur (alt-tab, clicking outside)
 *  - fullscreen change
 *  - copy / paste
 *  - right click (context menu)
 */
export function useProctorMonitor({ examSessionId, examId, enabled = true }) {
  const lastLog = useRef({});

  const log = (eventType, description, metadata = {}) => {
    const now = Date.now();
    if (lastLog.current[eventType] && now - lastLog.current[eventType] < 2000) return;
    lastLog.current[eventType] = now;

    monitoringService.logEvent({
      exam_session_id: examSessionId,
      exam_id: examId,
      event_type: eventType,
      description,
      metadata,
    }).catch(() => {});
  };

  useEffect(() => {
    if (!enabled || !examSessionId || !examId) return;

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        log('tab_switch', 'Tab switched or browser hidden');
      }
    };

    const onBlur = () => {
      log('window_blur', 'Window lost focus');
    };

    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        log('fullscreen_exit', 'Exited fullscreen mode');
      }
    };

    const onCopy = (e) => {
      log('copy_paste', 'Copy attempted', { clipboardLength: e.clipboardData?.getData('text/plain')?.length });
    };

    const onPaste = (e) => {
      log('copy_paste', 'Paste attempted', { clipboardLength: e.clipboardData?.getData('text/plain')?.length });
    };

    const onContextMenu = () => {
      log('right_click', 'Right-click context menu opened');
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onContextMenu);
    };
  }, [examSessionId, examId, enabled]);
}
