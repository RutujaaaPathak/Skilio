import { useRef, useCallback, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

export function useBlazeFaceTracking({ videoRef, enabled = true, onFaces }) {
  const [model, setModel] = useState(null);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const animationRef = useRef(null);
  const predictionsRef = useRef([]);
  const isTrackingRef = useRef(false);
  const onTrackRef = useRef(null);

  // Initialize BlazeFace model
  useEffect(() => {
    let cancelled = false;
    
    const loadModel = async () => {
      setIsModelLoading(true);
      try {
        // Ensure TF.js is ready
        await tf.ready();
        const loadedModel = await blazeface.load();
        if (!cancelled) {
          setModel(loadedModel);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(`Failed to load face detection model: ${err.message}`);
          console.error('BlazeFace load error:', err);
        }
      } finally {
        if (!cancelled) {
          setIsModelLoading(false);
        }
      }
    };

    loadModel();
    return () => { cancelled = true; };
  }, []);

  // Start/stop tracking
  const startTracking = useCallback((onTrack) => {
    if (!model || !videoRef.current || isTrackingRef.current) return;
    
    onTrackRef.current = onTrack;
    isTrackingRef.current = true;
    
    const track = async () => {
      if (!isTrackingRef.current || !model || !videoRef.current) return;
      
      try {
        const video = videoRef.current;
        if (video.readyState < 2 || video.videoWidth === 0) {
          animationRef.current = requestAnimationFrame(track);
          return;
        }
        
        const predictions = await model.estimateFaces(video, false);
        predictionsRef.current = predictions;
        
        if (onTrackRef.current) {
          onTrackRef.current(predictions);
        }
      } catch (err) {
        console.error('BlazeFace prediction error:', err);
      }
      
      if (isTrackingRef.current) {
        animationRef.current = requestAnimationFrame(track);
      }
    };
    
    animationRef.current = requestAnimationFrame(track);
  }, [model, videoRef]);

  const stopTracking = useCallback(() => {
    isTrackingRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    onTrackRef.current = null;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => stopTracking();
  }, [stopTracking]);

  // Auto-start when model and video are ready
  useEffect(() => {
    if (enabled && model && videoRef.current) {
      startTracking(onFaces || (() => {}));
    } else if (!enabled) {
      stopTracking();
    }
  }, [enabled, model, videoRef, startTracking, stopTracking, onFaces]);

  return {
    model,
    isModelLoading,
    error,
    startTracking,
    stopTracking,
  };
}

// Helper to convert BlazeFace predictions to the format expected by existing code
// BlazeFace returns: [{ topLeft: [x, y], bottomRight: [x, y], landmarks: [[x,y],...], probability: [score] }]
export function convertBlazeFaceToTrackingFormat(predictions, videoWidth, videoHeight) {
  if (!predictions || predictions.length === 0) return [];
  
  return predictions
    .filter(pred => (pred.probability?.[0] || 0) >= 0.35)
    .map(pred => {
    const [x1, y1] = pred.topLeft;
    const [x2, y2] = pred.bottomRight;
    
    return {
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1,
      // Normalized center for gaze tracking
      cx: (x1 + x2) / 2 / videoWidth,
      cy: (y1 + y2) / 2 / videoHeight,
      // Landmarks: [rightEye, leftEye, nose, mouth, rightEar, leftEar]
      landmarks: pred.landmarks || [],
      confidence: pred.probability?.[0] || 1.0,
    };
  });
}