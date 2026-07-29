import { useState, useRef, useCallback } from 'react';
import { combinedSimilarity } from '../utils/security/similarity.js';

const SENTENCES = [
  'I confirm that I will complete this examination honestly',
  'My name is ready and I am prepared to begin my examination',
  'I agree to follow all rules and guidelines during this exam',
  'I understand that academic integrity is expected at all times',
];

export function useSpeechVerification() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [expectedSentence, setExpectedSentence] = useState('');
  const [recognizedSentence, setRecognizedSentence] = useState('');
  const [similarity, setSimilarity] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [passed, setPassed] = useState(false);
  const recognitionRef = useRef(null);
  const attemptsRef = useRef(0);
  const passedRef = useRef(false);
  const maxAttempts = 3;

  const generateSentence = useCallback(() => {
    const idx = Math.floor(Math.random() * SENTENCES.length);
    setExpectedSentence(SENTENCES[idx]);
    return SENTENCES[idx];
  }, []);

  const startVerification = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatus('failed');
      setError('Speech recognition is not supported in this browser');
      return;
    }

    const sentence = generateSentence();
    setStatus('running');
    setError(null);
    setRecognizedSentence('');
    setSimilarity(0);

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      setRecognizedSentence(transcript);
      const sim = combinedSimilarity(sentence, transcript);
      setSimilarity(sim);
      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);
      if (sim >= 90) {
        setPassed(true);
        passedRef.current = true;
        setStatus('passed');
      } else if (attemptsRef.current >= maxAttempts) {
        setStatus('failed');
        setError(`Max attempts reached. Best match: ${sim}%`);
      } else {
        setStatus('failed');
        setError(`Voice didn't match (${sim}% similar). Try again.`);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'aborted') return;
      attemptsRef.current += 1;
      setAttempts(attemptsRef.current);
      const msg = event.error === 'no-speech'
        ? 'No speech detected. Please try again.'
        : `Speech error: ${event.error}`;
      setError(msg);
      if (attemptsRef.current >= maxAttempts) {
        setStatus('failed');
        setError('Max attempts reached');
      } else {
        setStatus('failed');
        setError(msg);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, [generateSentence]);

  const retry = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
    if (attemptsRef.current < maxAttempts) {
      startVerification();
    }
  }, [maxAttempts, startVerification]);

  const reset = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
    attemptsRef.current = 0;
    setStatus('idle');
    setError(null);
    setExpectedSentence('');
    setRecognizedSentence('');
    setSimilarity(0);
    setAttempts(0);
    setPassed(false);
    passedRef.current = false;
  }, []);

  return {
    status, error, expectedSentence, recognizedSentence,
    similarity, attempts, maxAttempts, passed,
    startVerification, retry, reset,
  };
}
