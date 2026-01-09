import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

// ============================================
// Punch Detection Hook - Enhanced Version
// ตรวจจับการออกหมัด 3 แบบ:
// 1. Straight Punch (หมัดตรง)
// 2. Hook Punch (หมัดฮุค)
// 3. Uppercut (อัปเปอร์คัต)
// ============================================

type PunchType = 'straight' | 'hook' | 'uppercut' | 'none';

interface PunchData {
  leftPunch: PunchType;
  rightPunch: PunchType;
  lastPunch: PunchType;
  punchCount: number;
  combo: number;
  leftWristPos: { x: number; y: number };
  rightWristPos: { x: number; y: number };
  isPunching: boolean;
  confidence: number;
}

// ============================================
// Zone definitions (normalized 0-1)
// ============================================
const ZONES = {
  // Center zone for straight punches (middle 40% of screen width)
  centerXMin: 0.3,
  centerXMax: 0.7,
  
  // Side zones for hooks
  leftSideXMax: 0.35,
  rightSideXMin: 0.65,
  
  // Bottom zone for uppercut start (bottom 40% of screen)
  bottomYMin: 0.6,
  
  // Middle zone for uppercut end
  middleYMax: 0.5,
};

// Thresholds
const THRESHOLDS = {
  // Elbow angle for straight punch (nearly extended)
  straightElbowMin: 140,   // degrees
  
  // Elbow angle for hook (bent arm)
  hookElbowMin: 50,
  hookElbowMax: 130,
  
  // Z movement for forward punch (depth)
  forwardZThreshold: -0.02,
  
  // Side movement for hook
  sideMovementThreshold: 0.04,
  
  // Upward velocity for uppercut
  uppercutVelocityY: -0.05,
  
  // Minimum velocity to register as punch
  minVelocity: 0.03,
  
  // Cooldown frames between punches
  cooldownFrames: 12,
};

export const usePunchDetection = (
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  isRunning: boolean
) => {
  const [punchData, setPunchData] = useState<PunchData>({
    leftPunch: 'none',
    rightPunch: 'none',
    lastPunch: 'none',
    punchCount: 0,
    combo: 0,
    leftWristPos: { x: 0.25, y: 0.5 },
    rightWristPos: { x: 0.75, y: 0.5 },
    isPunching: false,
    confidence: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const requestRef = useRef<number>();
  
  // Tracking refs
  const punchCountRef = useRef(0);
  const comboRef = useRef(0);
  const lastPunchTimeRef = useRef(0);
  
  // Position history for velocity detection (keep 8 frames)
  const leftHistoryRef = useRef<Array<{x: number, y: number, z: number}>>([]);
  const rightHistoryRef = useRef<Array<{x: number, y: number, z: number}>>([]);
  
  // Starting position for uppercut detection
  const leftStartPosRef = useRef<{x: number, y: number} | null>(null);
  const rightStartPosRef = useRef<{x: number, y: number} | null>(null);
  
  // Cooldown to prevent rapid fire
  const leftCooldownRef = useRef(0);
  const rightCooldownRef = useRef(0);

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

  // ============================================
  // Calculate angle between 3 points (in degrees)
  // ============================================
  const calculateAngle = (
    a: {x: number, y: number},
    b: {x: number, y: number},  // vertex point
    c: {x: number, y: number}
  ): number => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180 / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
  };

  // ============================================
  // Detect punch type based on arm position & movement
  // ============================================
  const detectPunch = (
    shoulder: {x: number, y: number, z: number},
    elbow: {x: number, y: number, z: number},
    wrist: {x: number, y: number, z: number},
    history: Array<{x: number, y: number, z: number}>,
    startPosRef: React.MutableRefObject<{x: number, y: number} | null>,
    shoulderCenterX: number,
    isLeft: boolean
  ): PunchType => {
    if (history.length < 5) return 'none';
    
    const current = history[history.length - 1];
    const prev = history[history.length - 5];
    
    // Calculate velocities
    const dx = current.x - prev.x;
    const dy = current.y - prev.y;
    const dz = current.z - prev.z;
    
    const velocity = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    // Need minimum velocity to register as punch
    if (velocity < THRESHOLDS.minVelocity) {
      // Reset start position when not moving
      startPosRef.current = { x: wrist.x, y: wrist.y };
      return 'none';
    }
    
    // Calculate elbow angle (shoulder-elbow-wrist)
    const elbowAngle = calculateAngle(shoulder, elbow, wrist);
    
    // ============================================
    // 1. STRAIGHT PUNCH Detection
    // - Elbow nearly extended (angle > 140°)
    // - Wrist in center zone
    // - Moving forward (Z decreasing)
    // ============================================
    const isInCenterZone = Math.abs(wrist.x - shoulderCenterX) < 0.2;
    const isElbowExtended = elbowAngle > THRESHOLDS.straightElbowMin;
    const isMovingForward = dz < THRESHOLDS.forwardZThreshold;
    
    if (isElbowExtended && isInCenterZone && isMovingForward) {
      return 'straight';
    }
    
    // ============================================
    // 2. HOOK PUNCH Detection
    // - Elbow bent (angle 50-130°)
    // - Horizontal side movement
    // - Wrist in side zone
    // ============================================
    const isElbowBent = elbowAngle >= THRESHOLDS.hookElbowMin && elbowAngle <= THRESHOLDS.hookElbowMax;
    const hasSideMovement = Math.abs(dx) > THRESHOLDS.sideMovementThreshold;
    
    // Left arm hook goes right, right arm hook goes left
    const isCorrectHookDirection = isLeft ? dx > 0 : dx < 0;
    
    // Check if wrist is in side zone
    const isInSideZone = isLeft 
      ? wrist.x < ZONES.leftSideXMax || wrist.x > ZONES.rightSideXMin
      : wrist.x > ZONES.rightSideXMin || wrist.x < ZONES.leftSideXMax;
    
    if (isElbowBent && hasSideMovement && isCorrectHookDirection) {
      return 'hook';
    }
    
    // ============================================
    // 3. UPPERCUT Detection
    // - Started from bottom zone
    // - Moving upward quickly
    // - Now in middle zone
    // ============================================
    const startPos = startPosRef.current;
    const startedInBottomZone = startPos && startPos.y > ZONES.bottomYMin;
    const nowInMiddleZone = wrist.y < ZONES.middleYMax;
    const isMovingUp = dy < THRESHOLDS.uppercutVelocityY;
    
    if (startedInBottomZone && isMovingUp && nowInMiddleZone) {
      startPosRef.current = null; // Reset for next detection
      return 'uppercut';
    }
    
    return 'none';
  };

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

    // Decrease cooldowns
    if (leftCooldownRef.current > 0) leftCooldownRef.current--;
    if (rightCooldownRef.current > 0) rightCooldownRef.current--;

    if (result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];

      // Draw landmarks with punch-themed color
      drawingUtils.drawLandmarks(landmarks, {
        radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1),
        color: '#FF4444',
        lineWidth: 2
      });
      drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);

      // Keypoints:
      // 11: left shoulder, 12: right shoulder
      // 13: left elbow, 14: right elbow
      // 15: left wrist, 16: right wrist
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const leftElbow = landmarks[13];
      const rightElbow = landmarks[14];
      const leftWrist = landmarks[15];
      const rightWrist = landmarks[16];
      
      // Calculate shoulder center for zone reference
      const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;

      // Update history (keep last 8 frames)
      leftHistoryRef.current.push({ x: leftWrist.x, y: leftWrist.y, z: leftWrist.z });
      rightHistoryRef.current.push({ x: rightWrist.x, y: rightWrist.y, z: rightWrist.z });
      
      if (leftHistoryRef.current.length > 8) leftHistoryRef.current.shift();
      if (rightHistoryRef.current.length > 8) rightHistoryRef.current.shift();

      // Initialize start positions if not set
      if (!leftStartPosRef.current) leftStartPosRef.current = { x: leftWrist.x, y: leftWrist.y };
      if (!rightStartPosRef.current) rightStartPosRef.current = { x: rightWrist.x, y: rightWrist.y };

      // Detect punches
      let leftPunch: PunchType = 'none';
      let rightPunch: PunchType = 'none';
      let lastPunch: PunchType = 'none';

      if (leftCooldownRef.current === 0) {
        leftPunch = detectPunch(
          leftShoulder, leftElbow, leftWrist,
          leftHistoryRef.current,
          leftStartPosRef,
          shoulderCenterX,
          true
        );
        if (leftPunch !== 'none') {
          leftCooldownRef.current = THRESHOLDS.cooldownFrames;
          lastPunch = leftPunch;
          punchCountRef.current++;
          lastPunchTimeRef.current = performance.now();
        }
      }

      if (rightCooldownRef.current === 0) {
        rightPunch = detectPunch(
          rightShoulder, rightElbow, rightWrist,
          rightHistoryRef.current,
          rightStartPosRef,
          shoulderCenterX,
          false
        );
        if (rightPunch !== 'none') {
          rightCooldownRef.current = THRESHOLDS.cooldownFrames;
          lastPunch = rightPunch;
          punchCountRef.current++;
          lastPunchTimeRef.current = performance.now();
        }
      }

      // Update combo (resets if no punch for 2 seconds)
      const now = performance.now();
      if (now - lastPunchTimeRef.current < 2000) {
        if (leftPunch !== 'none' || rightPunch !== 'none') {
          comboRef.current++;
        }
      } else {
        comboRef.current = 0;
      }

      // Confidence
      const confidence = ((leftWrist.visibility || 0) + (rightWrist.visibility || 0) +
                         (leftShoulder.visibility || 0) + (rightShoulder.visibility || 0) +
                         (leftElbow.visibility || 0) + (rightElbow.visibility || 0)) / 6;

      const isPunching = leftPunch !== 'none' || rightPunch !== 'none';

      setPunchData(prev => ({
        leftPunch,
        rightPunch,
        lastPunch: isPunching ? lastPunch : prev.lastPunch,
        punchCount: punchCountRef.current,
        combo: comboRef.current,
        leftWristPos: { x: leftWrist.x, y: leftWrist.y },
        rightWristPos: { x: rightWrist.x, y: rightWrist.y },
        isPunching,
        confidence
      }));
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  }, [isRunning, videoRef, canvasRef]);

  useEffect(() => {
    if (isRunning && !isLoading) {
      // Reset all tracking
      punchCountRef.current = 0;
      comboRef.current = 0;
      leftHistoryRef.current = [];
      rightHistoryRef.current = [];
      leftStartPosRef.current = null;
      rightStartPosRef.current = null;
      leftCooldownRef.current = 0;
      rightCooldownRef.current = 0;
      requestRef.current = requestAnimationFrame(predictWebcam);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning, isLoading, predictWebcam]);

  const resetCount = () => {
    punchCountRef.current = 0;
    comboRef.current = 0;
    leftStartPosRef.current = null;
    rightStartPosRef.current = null;
    setPunchData(prev => ({ ...prev, punchCount: 0, combo: 0 }));
  };

  return { punchData, isLoading, resetCount };
};
