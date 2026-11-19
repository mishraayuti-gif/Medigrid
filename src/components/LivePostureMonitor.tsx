import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

interface LivePostureMonitorProps {
  ruleKey: 'upright_alignment' | 'neck_tilt_release' | 'overhead_reach' | 'shoulder_level';
  isActiveSession: boolean;
  onMetricsUpdate: (metrics: {
    postureUsed: boolean;
    averageScore: number | null;
    latestFeedback: string;
  }) => void;
}

type MonitorMode = 'idle' | 'initializing' | 'live' | 'fallback';

const UPPER_BODY_CONNECTIONS: [number, number][] = [
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
  [11, 23], [12, 24],
  [7, 0], [8, 0],
];

export function LivePostureMonitor({
  ruleKey,
  isActiveSession,
  onMetricsUpdate,
}: LivePostureMonitorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const scoresRef = useRef<number[]>([]);

  const [mode, setMode] = useState<MonitorMode>('idle');
  const [statusMessage, setStatusMessage] = useState<string>(
    'Camera posture guidance is optional. No video frames are recorded or uploaded.'
  );
  const [liveFeedback, setLiveFeedback] = useState<string>('Ready to check alignment.');
  const [liveScore, setLiveScore] = useState<number | null>(null);
  const [postureOk, setPostureOk] = useState<boolean>(true);

  const stopCameraAndLoop = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCameraAndLoop();
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isActiveSession && mode === 'live') {
      stopCameraAndLoop();
      setMode('idle');
      setStatusMessage('Camera stopped automatically when session ended.');
    }
  }, [isActiveSession, mode]);

  const evaluatePose = (landmarks: { x: number; y: number; visibility?: number }[]) => {
    const nose = landmarks[0];
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];

    if (!leftShoulder || !rightShoulder || !nose) {
      return { ok: false, score: 0, feedback: 'Center your upper body and shoulders in frame.' };
    }

    const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const headOffset = Math.abs(nose.x - shoulderMidX);

    let score = 100;
    let ok = true;
    let feedback = 'Balanced posture alignment detected.';

    if (ruleKey === 'upright_alignment') {
      if (shoulderDiff > 0.05) {
        score -= 30;
        ok = false;
        feedback = 'Level both shoulders gently—release any shrug on the higher side.';
      } else if (headOffset > 0.065) {
        score -= 25;
        ok = false;
        feedback = 'Center your head directly over the midpoint of your shoulders.';
      } else {
        feedback = 'Balanced upright alignment—breathe softly into your ribs.';
      }
    } else if (ruleKey === 'neck_tilt_release') {
      const earDiff = leftEar && rightEar ? Math.abs(leftEar.y - rightEar.y) : 0;
      if (shoulderDiff > 0.055) {
        score -= 35;
        ok = false;
        feedback = 'Keep both shoulders relaxed and level while tilting only your neck.';
      } else if (earDiff < 0.025) {
        score -= 10;
        feedback = 'Shoulders are steady. Gently tilt one ear toward a shoulder when cued.';
      } else {
        feedback = 'Controlled neck release with level shoulders.';
      }
    } else if (ruleKey === 'overhead_reach') {
      const wristsAbove =
        leftWrist &&
        rightWrist &&
        leftWrist.y < leftShoulder.y - 0.06 &&
        rightWrist.y < rightShoulder.y - 0.06;
      const wristSymmetry = leftWrist && rightWrist ? Math.abs(leftWrist.y - rightWrist.y) : 0;

      if (!wristsAbove) {
        score -= 35;
        ok = false;
        feedback = 'Raise both wrists smoothly above shoulder height as you inhale.';
      } else if (wristSymmetry > 0.075) {
        score -= 20;
        ok = false;
        feedback = 'Even out left and right wrist height overhead.';
      } else {
        feedback = 'Strong symmetrical overhead reach.';
      }
    } else {
      if (shoulderDiff > 0.055) {
        score -= 30;
        ok = false;
        feedback = 'Soften and level your shoulders.';
      }
    }

    return { ok, score: Math.max(0, Math.min(100, score)), feedback };
  };

  const startLiveMonitoring = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMode('fallback');
      setStatusMessage(
        'Camera API is unavailable in this browser environment. Guided visual timer fallback mode is active.'
      );
      return;
    }

    setMode('initializing');
    setStatusMessage('Requesting local camera access and initializing MediaPipe Pose Landmarker...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (!landmarkerRef.current) {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
      }

      setMode('live');
      setStatusMessage('Live MediaPipe posture monitoring active. Processing occurs locally in memory.');

      let lastTime = -1;
      const detectFrame = () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const landmarker = landmarkerRef.current;
        if (!video || !canvas || !landmarker || !streamRef.current) return;

        if (video.readyState >= 2 && video.currentTime !== lastTime) {
          lastTime = video.currentTime;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const result = landmarker.detectForVideo(video, performance.now());
            if (result.landmarks && result.landmarks.length > 0) {
              const lm = result.landmarks[0];
              const evaluation = evaluatePose(lm);
              setLiveScore(evaluation.score);
              setPostureOk(evaluation.ok);
              setLiveFeedback(evaluation.feedback);

              scoresRef.current.push(evaluation.score);
              const avg = Math.round(
                scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length
              );
              onMetricsUpdate({
                postureUsed: true,
                averageScore: avg,
                latestFeedback: evaluation.feedback,
              });

              ctx.strokeStyle = evaluation.ok ? '#34D399' : '#FBBF24';
              ctx.lineWidth = 3;
              for (const [startIdx, endIdx] of UPPER_BODY_CONNECTIONS) {
                const a = lm[startIdx];
                const b = lm[endIdx];
                if (a && b) {
                  ctx.beginPath();
                  ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
                  ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
                  ctx.stroke();
                }
              }

              for (const idx of [0, 7, 8, 11, 12, 13, 14, 15, 16]) {
                const pt = lm[idx];
                if (pt) {
                  ctx.fillStyle = '#FFFFFF';
                  ctx.beginPath();
                  ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 4.5, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.strokeStyle = '#3F4A8A';
                  ctx.lineWidth = 2;
                  ctx.stroke();
                }
              }
            } else {
              setLiveFeedback('Step back slightly so your head and shoulders are clearly visible.');
            }
          }
        }
        rafRef.current = requestAnimationFrame(detectFrame);
      };

      rafRef.current = requestAnimationFrame(detectFrame);
    } catch (err: any) {
      stopCameraAndLoop();
      setMode('fallback');
      setStatusMessage(
        `Camera or MediaPipe Pose initialization unavailable (${
          err?.message || 'permission denied'
        }). Guided visual timer fallback mode is active.`
      );
    }
  };

  return (
    <div className="rounded-2xl bg-[#F6F7FB] dark:bg-slate-800/40 p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-medium text-slate-900 dark:text-slate-100">
            Live Posture Check (MediaPipe Pose)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Supports explicit upper-body alignment rules only. Camera automatically closes after session.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'live' ? (
            <button
              type="button"
              onClick={() => {
                stopCameraAndLoop();
                setMode('idle');
                setStatusMessage('Camera turned off.');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/50 transition-colors whitespace-nowrap shrink-0"
            >
              <CameraOff className="w-3.5 h-3.5" />
              Stop Camera
            </button>
          ) : (
            <button
              type="button"
              onClick={startLiveMonitoring}
              disabled={mode === 'initializing'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-[#3F4A8A] hover:bg-[#333D75] dark:bg-indigo-500 dark:hover:bg-indigo-400 text-white disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
            >
              <Camera className="w-3.5 h-3.5" />
              {mode === 'initializing' ? 'Connecting Camera...' : 'Enable Camera Posture Check'}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-xl bg-white/80 dark:bg-[#111827]/70 px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-300">
        {mode === 'fallback' ? (
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        ) : (
          <ShieldCheck className="w-4 h-4 text-[#3F4A8A] dark:text-indigo-400 shrink-0 mt-0.5" />
        )}
        <span>{statusMessage}</span>
      </div>

      <div className={mode === 'live' ? 'block' : 'hidden'}>
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video max-h-[340px] mx-auto">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover -scale-x-100"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover -scale-x-100 pointer-events-none"
          />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3 rounded-xl bg-slate-950/80 backdrop-blur-sm px-4 py-2.5 text-xs text-white">
            <div className="flex items-center gap-2 min-w-0">
              {postureOk ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <span className="truncate">{liveFeedback}</span>
            </div>
            {liveScore !== null && (
              <span className="font-mono tabular-nums font-semibold text-indigo-300 shrink-0">
                {liveScore}% align
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
