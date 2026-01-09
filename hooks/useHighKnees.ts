import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

// ============================================
// High Knees Detection Hook - FORGIVING VERSION
// Logic: Knee must reach (Hip Y + Offset)
// Visuals: Debug lines drawn on canvas
// ============================================

interface HighKneesData {
  leftKneeHeight: number;   // 0-1 (normalized lift height)
  rightKneeHeight: number;  // 0-1 (normalized lift height)
  averageSpeed: number;     // 0-1 based on step frequency
  isRunning: boolean;       // true if actively stepping
  stepsCount: number;       // total steps counted
  confidence: number;
}

export const useHighKnees = (
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  isRunning: boolean
) => {
  const [highKneesData, setHighKneesData] = useState<HighKneesData>({
    leftKneeHeight: 0,
    rightKneeHeight: 0,
    averageSpeed: 0,
    isRunning: false,
    stepsCount: 0,
    confidence: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const requestRef = useRef<number>();
  
  // Tracking
  const stepsCountRef = useRef(0);
  const lastStepTimeRef = useRef(0);
  const stepTimesRef = useRef<number[]>([]);
  
  // State Machine
  const leftStateRef = useRef<'down' | 'up'>('down');
  const rightStateRef = useRef<'down' | 'up'>('down');

  // Configuration
  // Offset: How far BELOW the hip can the knee be and still count?
  // 0.1 = 10% of screen height below hip. Very lenient.
  const TRIGGER_OFFSET = 0.15; 
  const RESET_OFFSET = 0.20;   // Must lower knee to 20% below hip to reset

  useEffect(() => {
    const initMediaPipe = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );

      poseLandmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1
      });
      setIsLoading(false);
    };

    initMediaPipe();

    return () => {
      poseLandmarkerRef.current?.close();
    };
  }, []);

  const predictWebcam = useCallback(() => {
    if (!isRunning || !poseLandmarkerRef.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      requestRef.current = requestAnimationFrame(predictWebcam);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const drawingUtils = new DrawingUtils(ctx!);

    let startTimeMs = performance.now();
    const result = poseLandmarkerRef.current.detectForVideo(video, startTimeMs);

    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    if (result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];
      const leftKnee = landmarks[25];
      const rightKnee = landmarks[26];

      // Draw Skeleton
      // drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);
      // drawingUtils.drawLandmarks(landmarks, { radius: 3 });

      // Confidence Check
      const avgConfidence = (
        (leftKnee.visibility || 0) + (rightKnee.visibility || 0) + 
        (leftHip.visibility || 0) + (rightHip.visibility || 0)
      ) / 4;

      if (avgConfidence > 0.4) {
        const now = performance.now();

        // LOGIC: Hip Y - Knee Y
        // Positive = Knee is ABOVE Hip
        // Negative = Knee is BELOW Hip
        const diffL = leftHip.y - leftKnee.y;
        const diffR = rightHip.y - rightKnee.y;

        // Normalized Thresholds (-0.15 means knee can be 0.15 below hip)
        const triggerThreshold = -TRIGGER_OFFSET;
        const resetThreshold = -RESET_OFFSET; 

        // LEFT DETECTION
        if (leftStateRef.current === 'down') {
            if (diffL > triggerThreshold) {
                leftStateRef.current = 'up';
                stepsCountRef.current++;
                stepTimesRef.current.push(now);
                lastStepTimeRef.current = now;
            }
        } else {
            if (diffL < resetThreshold) {
                leftStateRef.current = 'down';
            }
        }

        // RIGHT DETECTION
        if (rightStateRef.current === 'down') {
            if (diffR > triggerThreshold) {
                rightStateRef.current = 'up';
                stepsCountRef.current++;
                stepTimesRef.current.push(now);
                lastStepTimeRef.current = now;
            }
        } else {
            if (diffR < resetThreshold) {
                rightStateRef.current = 'down';
            }
        }

        // ==========================
        // VISUAL DEBUGGING (CRITICAL)
        // ==========================
        ctx.lineWidth = 3;
        ctx.font = "20px Arial";
        
        // --- Left Side Debug ---
        const lx = leftKnee.x * canvas.width;
        const ly = leftKnee.y * canvas.height;
        const lHipY = leftHip.y * canvas.height;
        const lTrigY = (leftHip.y + TRIGGER_OFFSET) * canvas.height; // Lower on screen

        // Draw Hip Line (Blue)
        ctx.strokeStyle = '#00FFFF';
        ctx.beginPath(); ctx.moveTo(lx - 40, lHipY); ctx.lineTo(lx + 40, lHipY); ctx.stroke();
        
        // Draw Trigger Line (Green) - "Lift above this"
        ctx.strokeStyle = '#00FF00';
        ctx.beginPath(); ctx.moveTo(lx - 40, lTrigY); ctx.lineTo(lx + 40, lTrigY); ctx.stroke();
        ctx.fillStyle = '#00FF00';
        // ctx.fillText("TARGET", lx + 45, lTrigY);

        // Draw Knee Dot (Red if down, Green if up)
        ctx.fillStyle = leftStateRef.current === 'up' ? '#00FF00' : '#FF0000';
        ctx.beginPath(); ctx.arc(lx, ly, 8, 0, 2 * Math.PI); ctx.fill();

        // --- Right Side Debug ---
        const rx = rightKnee.x * canvas.width;
        const ry = rightKnee.y * canvas.height;
        const rHipY = rightHip.y * canvas.height;
        const rTrigY = (rightHip.y + TRIGGER_OFFSET) * canvas.height;

        // Hip Line
        ctx.strokeStyle = '#00FFFF';
        ctx.beginPath(); ctx.moveTo(rx - 40, rHipY); ctx.lineTo(rx + 40, rHipY); ctx.stroke();
        
        // Trigger Line
        ctx.strokeStyle = '#00FF00';
        ctx.beginPath(); ctx.moveTo(rx - 40, rTrigY); ctx.lineTo(rx + 40, rTrigY); ctx.stroke();
  
        // Knee Dot
        ctx.fillStyle = rightStateRef.current === 'up' ? '#00FF00' : '#FF0000';
        ctx.beginPath(); ctx.arc(rx, ry, 8, 0, 2 * Math.PI); ctx.fill();

        // --- Stats Text ---
        // ctx.fillStyle = "white";
        // ctx.fillText(`L Diff: ${diffL.toFixed(2)}`, 10, 30);
        // ctx.fillText(`R Diff: ${diffR.toFixed(2)}`, 10, 60);

        // 7. Data Update
        stepTimesRef.current = stepTimesRef.current.filter(t => now - t < 2000);
        const stepsPerSecond = stepTimesRef.current.length / 2;
        const speed = Math.min(1, stepsPerSecond / 4);
        const isActivelyRunning = now - lastStepTimeRef.current < 1000;

        setHighKneesData({
            // Visualize height: 0=ResetThreshold, 1=TriggerThreshold
            // Map diff (-0.2 to -0.15) to 0-1 range for UI bars
            leftKneeHeight: (diffL - (-RESET_OFFSET)) / ((-TRIGGER_OFFSET) - (-RESET_OFFSET)),
            rightKneeHeight: (diffR - (-RESET_OFFSET)) / ((-TRIGGER_OFFSET) - (-RESET_OFFSET)),
            averageSpeed: speed,
            isRunning: isActivelyRunning,
            stepsCount: stepsCountRef.current,
            confidence: avgConfidence
        });
      }
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  }, [isRunning, highKneesData.isRunning]);

  useEffect(() => {
    if (isRunning && !isLoading) {
      stepsCountRef.current = 0;
      stepTimesRef.current = [];
      requestRef.current = requestAnimationFrame(predictWebcam);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning, isLoading, predictWebcam]);

  const resetCount = () => {
    stepsCountRef.current = 0;
    stepTimesRef.current = [];
    setHighKneesData(prev => ({ ...prev, stepsCount: 0, averageSpeed: 0 }));
  };

  return { highKneesData, isLoading, resetCount };
};
