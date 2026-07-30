import { useState, useRef, useCallback, useEffect } from 'react';
import { securityService } from '../services/securityService.js';
import { useFaceVerification } from './useFaceVerification.js';
import { useObjectDetection } from './useObjectDetection.js';
import { useSpeechVerification } from './useSpeechVerification.js';
import { useAmbientNoise } from './useAmbientNoise.js';
import { useHardwareVerification } from './useHardwareVerification.js';
import { useScreenIntegrity } from './useScreenIntegrity.js';

export function useSecurityMonitor({ onProceed }) {
  const face = useFaceVerification();
  const objDetect = useObjectDetection(face.videoRef);
  const speech = useSpeechVerification();
  const noise = useAmbientNoise();
  const hardware = useHardwareVerification();
  const screen = useScreenIntegrity();

  const [allVerified, setAllVerified] = useState(false);
  const [overallScore, setOverallScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState('High');
  const [checkStatuses, setCheckStatuses] = useState({});
  const [proceedError, setProceedError] = useState(null);
  const prevVerifiedRef = useRef(false);
  const submittingRef = useRef(false);
  const noiseStoppedRef = useRef(false);
  const faceBlockedPrevRef = useRef(false);

  const noiseRef = useRef(noise);
  noiseRef.current = noise;

  const prohibitedObjects = objDetect.prohibitedObjects;
  const faceVerified = face.verified;
  const faceStatus = face.status;
  const faceBlocked = prohibitedObjects.length > 0;
  const speechPassed = speech.passed;
  const speechStatus = speech.status;
  const hardwareStatus = hardware.status;
  const noiseStatus = noise.status;
  const screenStatus = screen.status;
  const screenFs = screen.isFullscreen;

  const faceOk = faceVerified && !faceBlocked;
  const hardwareOk = hardwareStatus === 'passed';
  const noiseOk = noiseStatus === 'passed';
  const screenOk = screenStatus === 'passed';

  useEffect(() => {
    if (faceBlocked !== faceBlockedPrevRef.current) {
      faceBlockedPrevRef.current = faceBlocked;
      if (faceBlocked) {
        face.reset();
        objDetect.reset();
      }
    }
  }, [faceBlocked]);

  useEffect(() => {
    const statuses = {
      face: faceOk ? 'passed' : faceStatus === 'failed' ? 'failed' : faceStatus,
      faceBlocked: faceBlocked ? 'failed' : 'passed',
      speech: speechPassed ? 'passed' : speechStatus === 'failed' ? 'failed' : speechStatus,
      hardware: hardwareOk ? 'passed' : hardwareStatus === 'failed' ? 'failed' : hardwareStatus,
      noise: noiseOk ? 'passed' : noiseStatus === 'failed' ? 'failed' : noiseStatus,
      screen: screenOk ? 'passed' : screenStatus === 'failed' ? 'failed' : screenStatus,
    };
    setCheckStatuses(statuses);

    const passed = Object.values(statuses).filter(s => s === 'passed').length;
    const total = Object.keys(statuses).length;
    const score = total > 0 ? Math.round((passed / total) * 100) : 0;
    setOverallScore(score);
    setRiskLevel(score >= 75 ? 'Low' : score >= 50 ? 'Medium' : 'High');

    const allPassed = faceOk && speechPassed && hardwareOk && noiseOk && screenOk;
    const wasPassed = prevVerifiedRef.current;

    if (allPassed && !wasPassed) {
      setAllVerified(true);
      prevVerifiedRef.current = true;
      noiseStoppedRef.current = true;
      noiseRef.current.stopMonitoring();
    } else if (!allPassed && wasPassed) {
      setAllVerified(false);
      prevVerifiedRef.current = false;
      if (noiseStoppedRef.current) {
        noiseStoppedRef.current = false;
        noiseRef.current.startMonitoring();
      }
    }
  }, [faceOk, faceStatus, faceBlocked, speechPassed, speechStatus, hardwareOk, hardwareStatus, noiseOk, noiseStatus, screenOk, screenStatus]);

  useEffect(() => {
    if (hardwareStatus === 'failed' && prevVerifiedRef.current) {
      setAllVerified(false);
      prevVerifiedRef.current = false;
    }
  }, [hardwareStatus]);

  useEffect(() => {
    if (screenStatus === 'failed' && prevVerifiedRef.current) {
      setAllVerified(false);
      prevVerifiedRef.current = false;
    }
  }, [screenStatus]);

  const handleProceed = useCallback(async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setProceedError(null);

    const finalFaceOk = face.verified && objDetect.prohibitedObjects.length === 0;
    const finalSpeechOk = speech.passed;
    const finalHardwareOk = hardware.status === 'passed';
    const finalNoiseOk = noise.status === 'passed';
    const finalScreenOk = screen.status === 'passed';

    if (!finalFaceOk) { setProceedError('Face verification failed or prohibited device detected.'); submittingRef.current = false; return; }
    if (!finalSpeechOk) { setProceedError('Voice verification failed.'); submittingRef.current = false; return; }
    if (!finalHardwareOk) { setProceedError('Hardware verification failed.'); submittingRef.current = false; return; }
    if (!finalNoiseOk) { setProceedError('Ambient noise check failed.'); submittingRef.current = false; return; }
    if (!finalScreenOk) { setProceedError('Screen integrity check failed.'); submittingRef.current = false; return; }

    try {
      await securityService.submitReport({
        overall_score: overallScore,
        risk_level: riskLevel,
        results: [
          { check_name: 'face_verification', status: 'passed', details: {} },
          { check_name: 'object_detection', status: 'passed', details: {} },
          { check_name: 'speech_verification', status: 'passed', details: {} },
          { check_name: 'hardware_check', status: 'passed', details: {} },
          { check_name: 'noise_check', status: 'passed', details: {} },
          { check_name: 'screen_integrity', status: 'passed', details: {} },
        ],
        client_timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Report submission failed:', err);
    }

    submittingRef.current = false;
    if (onProceed) onProceed();
  }, [face.verified, objDetect.prohibitedObjects, speech.passed, hardware.status, noise.status, screen.status, overallScore, riskLevel, onProceed]);

  return {
    face, prohibitedObjects: objDetect.prohibitedObjects,
    objModelLoaded: objDetect.modelLoaded, objModelError: objDetect.modelError,
    speech, noise, hardware, screen,
    allVerified, overallScore, riskLevel, checkStatuses,
    proceedError, handleProceed,
  };
}
