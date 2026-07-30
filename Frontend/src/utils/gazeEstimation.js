export const GAZE_THRESHOLDS = {
  WARNING_DURATION: 3000,
  VIOLATION_DURATION: 7000,
  SMOOTHING_WINDOW: 15,
  YAW_NORMAL: 0.12,
  YAW_DEVIATION: 0.25,
  PITCH_NORMAL_DOWN: 0.18,
  PITCH_NORMAL_UP: 0.10,
  PITCH_DEVIATION: 0.30,
  OFFSET_NORMAL: 0.06,
  OFFSET_DEVIATION: 0.12,
  MIN_CONFIDENCE: 0.35,
  CALIBRATION_FRAMES: 30,
};

export function estimateHeadPose(landmarks, faceWidth, faceHeight) {
  if (!landmarks || landmarks.length < 6 || faceWidth < 10) {
    return { yaw: 0, pitch: 0, roll: 0, confidence: 0 };
  }

  const [re, le, nose] = landmarks;

  const eyeMidX = (re[0] + le[0]) / 2;
  const eyeMidY = (re[1] + le[1]) / 2;

  const yaw = (nose[0] - eyeMidX) / faceWidth;
  const pitch = (nose[1] - eyeMidY) / faceHeight;
  const roll = Math.atan2(le[1] - re[1], le[0] - re[0]) * (180 / Math.PI);

  const faceDiag = Math.sqrt(faceWidth * faceWidth + faceHeight * faceHeight);
  const confidence = Math.min(1, Math.max(0, (faceDiag - 30) / 170));

  return { yaw, pitch, roll, confidence };
}

export function computeGazeMetrics(landmarks, faceBox, videoWidth, videoHeight) {
  const fw = faceBox?.width || 0;
  const fh = faceBox?.height || 0;
  const pose = estimateHeadPose(landmarks, fw, fh);

  const faceCx = fw > 0 ? (faceBox.x + fw / 2) / (videoWidth || 1) : 0.5;
  const faceCy = fh > 0 ? (faceBox.y + fh / 2) / (videoHeight || 1) : 0.5;

  return {
    yaw: pose.yaw,
    pitch: pose.pitch,
    roll: pose.roll,
    offsetX: faceCx - 0.5,
    offsetY: faceCy - 0.5,
    confidence: pose.confidence,
  };
}

export function smoothGazeHistory(history) {
  if (history.length === 0) return null;
  const out = { yaw: 0, pitch: 0, roll: 0, offsetX: 0, offsetY: 0, confidence: 0 };
  for (const m of history) {
    out.yaw += m.yaw;
    out.pitch += m.pitch;
    out.roll += m.roll;
    out.offsetX += m.offsetX;
    out.offsetY += m.offsetY;
    out.confidence += m.confidence;
  }
  const n = history.length;
  out.yaw /= n;
  out.pitch /= n;
  out.roll /= n;
  out.offsetX /= n;
  out.offsetY /= n;
  out.confidence /= n;
  return out;
}

export function computeBaseline(samples) {
  if (samples.length === 0) return null;
  return smoothGazeHistory(samples);
}

export function classifyGazeState(metrics, baseline) {
  if (!metrics || metrics.confidence < GAZE_THRESHOLDS.MIN_CONFIDENCE) {
    return { state: 'GAZE_UNKNOWN', direction: 'unknown', deviationLevel: 0 };
  }

  const b = baseline || { yaw: 0, pitch: 0, offsetX: 0, offsetY: 0 };
  const relYaw = metrics.yaw - b.yaw;
  const relPitch = metrics.pitch - b.pitch;
  const relOffX = metrics.offsetX - b.offsetX;
  const relOffY = metrics.offsetY - b.offsetY;

  const absYaw = Math.abs(relYaw);
  const absPitch = Math.abs(relPitch);
  const absOffX = Math.abs(relOffX);
  const absOffY = Math.abs(relOffY);

  const t = GAZE_THRESHOLDS;

  const yawNormal = absYaw < t.YAW_NORMAL;
  const pitchNormal = relPitch > -t.PITCH_NORMAL_UP && relPitch < t.PITCH_NORMAL_DOWN;
  const offsetNormal = absOffX < t.OFFSET_NORMAL && absOffY < t.OFFSET_NORMAL;

  if (yawNormal && pitchNormal && offsetNormal) {
    return { state: 'GAZE_CENTER', direction: 'center', deviationLevel: 0 };
  }

  const yawSlight = absYaw < t.YAW_DEVIATION;
  const pitchSlight = absPitch < t.PITCH_DEVIATION;
  const offsetSlight = absOffX < t.OFFSET_DEVIATION && absOffY < t.OFFSET_DEVIATION;

  if (yawSlight && pitchSlight && offsetSlight) {
    return { state: 'GAZE_SLIGHT_DEVIATION', direction: 'center', deviationLevel: 1 };
  }

  const horiz = relYaw + relOffX * 3;
  const vert = relPitch + relOffY * 3;
  const horizMag = Math.abs(horiz);
  const vertMag = Math.abs(vert);

  const direction = horizMag > vertMag
    ? (horiz < 0 ? 'left' : 'right')
    : (vert < 0 ? 'up' : 'down');

  return { state: 'GAZE_DEVIATION', direction, deviationLevel: 2 };
}
