import { useState, useEffect } from 'react';
import { CHECK_STATUS } from '../utils/security/checks.js';

export function useBattery() {
  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState('running');

  useEffect(() => {
    let cancelled = false;
    let bat = null;
    const update = (b) => {
      if (cancelled) return;
      const data = {
        level: Math.round(b.level * 100),
        charging: b.charging,
        chargingTime: b.chargingTime,
        dischargingTime: b.dischargingTime,
        low: b.level < 0.2,
      };
      setInfo(data);
      setStatus(data.low && !data.charging ? CHECK_STATUS.WARNING : CHECK_STATUS.PASSED);
    };

    if (!navigator.getBattery) {
      if (!cancelled) {
        setInfo(null);
        setStatus(CHECK_STATUS.WARNING);
      }
      return;
    }

    navigator.getBattery().then((b) => {
      bat = b;
      update(b);
      b.addEventListener('levelchange', () => update(b));
      b.addEventListener('chargingchange', () => update(b));
    }).catch(() => {
      if (!cancelled) {
        setInfo(null);
        setStatus(CHECK_STATUS.WARNING);
      }
    });

    return () => {
      cancelled = true;
      if (bat) {
        bat.removeEventListener('levelchange', () => {});
        bat.removeEventListener('chargingchange', () => {});
      }
    };
  }, []);

  return { info, status };
}
