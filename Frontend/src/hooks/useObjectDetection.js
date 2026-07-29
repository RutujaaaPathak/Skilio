import { useState, useRef, useCallback, useEffect } from 'react';

const PROHIBITED_CLASSES = ['cell phone', 'laptop', 'tablet', 'tv', 'monitor'];

function loadCocoSsdModel() {
  return import('@tensorflow/tfjs').then(() => import('@tensorflow-models/coco-ssd')).then(m => m.load({ base: 'lite_mobilenet_v2' }));
}

export function useObjectDetection(videoRef) {
  const [prohibitedObjects, setProhibitedObjects] = useState([]);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelError, setModelError] = useState(null);
  const modelRef = useRef(null);
  const animRef = useRef(null);
  const lastDetectionsRef = useRef([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const model = await loadCocoSsdModel();
        if (!mounted) return;
        modelRef.current = model;
        setModelLoaded(true);
      } catch (err) {
        if (!mounted) return;
        setModelError('Failed to load object detection model');
        console.error('COCO-SSD load error:', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const detectObjects = useCallback(async () => {
    if (!modelRef.current || !videoRef?.current) {
      animRef.current = requestAnimationFrame(detectObjects);
      return;
    }
    const video = videoRef.current;
    if (video.readyState < 2) {
      animRef.current = requestAnimationFrame(detectObjects);
      return;
    }
    try {
      const predictions = await modelRef.current.detect(video);
      const prohibited = predictions.filter(p =>
        PROHIBITED_CLASSES.includes(p.class.toLowerCase())
      );
      if (prohibited.length > 0 || lastDetectionsRef.current.length > 0) {
        const names = [...new Set(prohibited.map(p => p.class))];
        setProhibitedObjects(names);
      }
      lastDetectionsRef.current = prohibited;
    } catch (err) {
      console.error('Object detection error:', err);
    }
    animRef.current = requestAnimationFrame(detectObjects);
  }, [videoRef]);

  useEffect(() => {
    if (modelLoaded && videoRef?.current) {
      animRef.current = requestAnimationFrame(detectObjects);
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [modelLoaded, videoRef, detectObjects]);

  const reset = useCallback(() => {
    setProhibitedObjects([]);
    lastDetectionsRef.current = [];
  }, []);

  return { prohibitedObjects, modelLoaded, modelError, reset };
}
