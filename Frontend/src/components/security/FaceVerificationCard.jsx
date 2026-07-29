import { useEffect, useRef } from 'react';
import Icon from '../Icon.jsx';

export default function FaceVerificationCard({ faceVerification, prohibitedObjects }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  const {
    status, error, faces, faceCount, countdown, verified,
    isCentered, isStable, cameraReady, videoRef, reset, modelType,
  } = faceVerification;

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;

    const render = () => {
      if (!video || !canvas) return;
      if (video.readyState >= 2) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          const rx = canvas.width * 0.2;
          const ry = canvas.height * 0.35;

          ctx.strokeStyle = verified ? 'rgba(34,197,94,0.6)' : 'rgba(34,197,94,0.4)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);

          if (!verified) {
            ctx.fillStyle = 'rgba(34,197,94,0.05)';
            ctx.fill();
          }

          ctx.strokeStyle = 'rgba(34,197,94,0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx, cy - ry);
          ctx.lineTo(cx, cy + ry);
          ctx.moveTo(cx - rx, cy);
          ctx.lineTo(cx + rx, cy);
          ctx.stroke();
        }
      }
      animRef.current = requestAnimationFrame(render);
    };
    animRef.current = requestAnimationFrame(render);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    }, [videoRef, verified, cameraReady]);

  const statusMessage = () => {
    if (verified) return countdown !== null ? `${countdown}` : '';
    if (countdown !== null) return `${countdown}`;
    return '';
  };

  const statusLabel = () => {
    if (!cameraReady) return 'Starting camera...';
    if (modelType === 'none') return 'Face model unavailable';
    if (prohibitedObjects.length > 0) {
      const obj = prohibitedObjects[0];
      const label = obj === 'cell phone' ? 'Mobile phone' :
                    obj === 'tv' ? 'TV' :
                    obj.charAt(0).toUpperCase() + obj.slice(1);
      return `${label} detected`;
    }
    if (countdown !== null) return `Hold still... ${countdown}`;
    if (verified) return 'Verification complete';
    if (faceCount === 0) return 'Look at the camera and center your face';
    if (faceCount > 1) return 'Multiple people detected';
    if (!isCentered) return 'Center your face in the frame';
    if (!isStable) return 'Keep still';
    return 'Face detected: Processing...';
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-sm">
          <Icon name="face" className="text-primary" />
          <h3 className="text-headline-sm">Face Verification</h3>
        </div>
        <span className={`flex items-center gap-xs text-label-md ${verified ? 'text-green-400' : 'text-on-surface-variant'}`}>
          <Icon name={verified ? 'check_circle' : 'pending'} className="text-sm" fill={verified} />
          {verified ? 'Verified' : 'Verifying...'}
        </span>
      </div>
      <div className="relative rounded-lg overflow-hidden aspect-video bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        {!cameraReady && status !== 'passed' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Icon name="face" className="text-3xl text-white/40" />
          </div>
        )}
        {cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-64 border-2 border-green-500 rounded-full relative">
              <div className="absolute inset-0 bg-green-500/10 rounded-full" />
              <div className="absolute left-1/2 top-0 h-full w-px bg-green-500/20 -translate-x-1/2" />
              <div className="absolute top-1/2 left-0 w-full h-px bg-green-500/20 -translate-y-1/2" />
              <div className="absolute top-0 left-0 w-full h-1 bg-green-400/60 face-scan-line blur-sm" />
            </div>
          </div>
        )}
        {countdown !== null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-6xl font-bold text-green-400 drop-shadow-lg animate-ping">
              {countdown}
            </span>
          </div>
        )}
        <div className="absolute bottom-md left-md glass-panel px-md py-sm rounded-lg flex items-center gap-sm">
          <div className={`w-2 h-2 rounded-full ${cameraReady ? 'bg-green-500 animate-pulse' : 'bg-on-surface-variant/50'}`} />
          <span className="text-label-sm text-on-surface">
            {error || statusLabel()}
          </span>
        </div>
        {prohibitedObjects.length > 0 && (
          <div className="absolute top-md right-md glass-panel px-md py-sm rounded-lg flex items-center gap-sm border border-red-400/50">
            <Icon name="warning" className="text-sm text-red-400" />
            <span className="text-label-sm text-red-400 font-bold">
              {statusLabel()}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
