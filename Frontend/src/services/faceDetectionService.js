import { FaceLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

let faceLandmarker = null;
let animFrame = null;
let running = false;
let missedFrames = 0;

const MISS_THRESHOLD = 3;
const FRAME_SKIP = 2;
const EMA_ALPHA = 0.85;

let smoothed = null;
let frameCount = 0;

function ema(current, previous) {
  if (!previous) return current;
  return current.map((v, i) => previous[i] !== undefined ? EMA_ALPHA * previous[i] + (1 - EMA_ALPHA) * v : v);
}

function landmarksToArray(landmarks) {
  return landmarks.map(({ x, y, z }) => [x, y, z]);
}

function getEyeAspectRatio(landmarks, leftIdx, rightIdx, topIdx, bottomIdx) {
  const left = landmarks[leftIdx];
  const right = landmarks[rightIdx];
  const top = landmarks[topIdx];
  const bottom = landmarks[bottomIdx];
  const vDist = Math.hypot(top.x - bottom.x, top.y - bottom.y);
  const hDist = Math.hypot(left.x - right.x, left.y - right.y);
  return hDist === 0 ? 0 : vDist / hDist;
}

export const faceDetectionService = {
  async loadModel() {
    if (faceLandmarker) return faceLandmarker;

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });

    return faceLandmarker;
  },

  start(video, callback) {
    if (!faceLandmarker) {
      throw new Error('FaceLandmarker not loaded. Call loadModel() first.');
    }

    running = true;
    missedFrames = 0;
    smoothed = null;
    frameCount = 0;

    function detect(timestamp) {
      if (!running) return;

      if (video.readyState < 2 || video.videoWidth === 0) {
        animFrame = requestAnimationFrame(detect);
        return;
      }

      frameCount++;
      if (frameCount % FRAME_SKIP !== 0) {
        animFrame = requestAnimationFrame(detect);
        return;
      }

      const result = faceLandmarker.detectForVideo(video, timestamp);

      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        missedFrames = 0;
        const raw = result.faceLandmarks[0];

        const lms = landmarksToArray(raw);
        smoothed = ema(lms, smoothed);

        const leftEyeEAR = getEyeAspectRatio(raw, 33, 133, 159, 145);
        const rightEyeEAR = getEyeAspectRatio(raw, 362, 263, 386, 374);
        const avgEAR = (leftEyeEAR + rightEyeEAR) / 2;

        const gaze = faceDetectionService.estimateGaze(raw);
        const headPose = faceDetectionService.estimateHeadPose(raw);

        const nose = raw[1];
        const chin = raw[152];
        const faceHeight = Math.hypot(chin.x - nose.x, chin.y - nose.y, chin.z - nose.z);

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const lm of raw) {
          if (lm.x < minX) minX = lm.x;
          if (lm.y < minY) minY = lm.y;
          if (lm.x > maxX) maxX = lm.x;
          if (lm.y > maxY) maxY = lm.y;
        }

        callback({
          detected: true,
          bbox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
          landmarks: raw,
          gaze,
          headPose,
          ear: avgEAR,
          confidence: 1,
        });
      } else {
        missedFrames++;
        if (missedFrames >= MISS_THRESHOLD) {
          smoothed = null;
          callback({ detected: false });
        }
      }

      animFrame = requestAnimationFrame(detect);
    }

    animFrame = requestAnimationFrame(detect);
  },

  stop() {
    running = false;
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
    missedFrames = 0;
    smoothed = null;
    frameCount = 0;
  },

  estimateGaze(landmarks) {
    const leftEye = {
      inner: landmarks[133],
      outer: landmarks[33],
      center: landmarks[468],
    };
    const rightEye = {
      inner: landmarks[362],
      outer: landmarks[263],
      center: landmarks[473],
    };

    const leftDir = {
      x: (leftEye.center.x - leftEye.inner.x) / (leftEye.outer.x - leftEye.inner.x || 0.001),
      y: (leftEye.center.y - (leftEye.inner.y + leftEye.outer.y) / 2) * 2,
    };
    const rightDir = {
      x: (rightEye.center.x - rightEye.inner.x) / (rightEye.outer.x - rightEye.inner.x || 0.001),
      y: (rightEye.center.y - (rightEye.inner.y + rightEye.outer.y) / 2) * 2,
    };

    return {
      x: (leftDir.x + rightDir.x) / 2,
      y: (leftDir.y + rightDir.y) / 2,
      lookingAway: Math.abs(leftDir.x) > 0.6 || Math.abs(rightDir.x) > 0.6,
    };
  },

  estimateHeadPose(landmarks) {
    const nose = landmarks[1];
    const leftEar = landmarks[234];
    const rightEar = landmarks[454];
    const chin = landmarks[152];
    const forehead = landmarks[10];

    const yaw = (nose.x - (leftEar.x + rightEar.x) / 2) * 2;
    const pitch = (nose.y - (forehead.y + chin.y) / 2) * 2;
    const roll = Math.atan2(leftEar.y - rightEar.y, leftEar.x - rightEar.x);

    return { yaw, pitch, roll, turnedAway: Math.abs(yaw) > 0.3 || Math.abs(pitch) > 0.3 };
  },

  isLoaded() {
    return faceLandmarker !== null;
  },
};
