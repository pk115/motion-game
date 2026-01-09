import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

// ============================================
// Arm Circles Detection Hook
// ใช้ Vertical Arc Tracking - จับ pattern ขึ้น-ลงของข้อมือ
// กางแขนแนวราบ แล้วหมุนแขน → ข้อมือจะแกว่งขึ้น-ลงเป็นคลื่น
// ============================================

interface ArmCirclesData {
  leftArmAngle: number;      // 0-360 degrees (for visual display)
  rightArmAngle: number;     // 0-360 degrees (for visual display)
  leftRotations: number;     // จำนวนรอบที่หมุนซ้าย
  rightRotations: number;    // จำนวนรอบที่หมุนขวา
  leftDirection: 'forward' | 'backward' | 'none';
  rightDirection: 'forward' | 'backward' | 'none';
  isRotating: boolean;       // กำลังหมุนอยู่
  totalRotations: number;    // รวมทั้งหมด
  confidence: number;
}

export const useArmCircles = (
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  isRunning: boolean
) => {
  const [armCirclesData, setArmCirclesData] = useState<ArmCirclesData>({
    leftArmAngle: 0,
    rightArmAngle: 0,
    leftRotations: 0,
    rightRotations: 0,
    leftDirection: 'none',
    rightDirection: 'none',
    isRotating: false,
    totalRotations: 0,
    confidence: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const requestRef = useRef<number>();
  
  // ============================================
  // Vertical Arc Tracking - จับ wave pattern ขึ้น-ลง
  // ============================================
  
  // Rotation counters
  const leftRotationsRef = useRef(0);
  const rightRotationsRef = useRef(0);
  
  // Previous Y positions (relative to shoulder)
  const leftPrevYRef = useRef(0);
  const rightPrevYRef = useRef(0);
  
  // Peak tracking - นับจุดสูงสุด (เมื่อเปลี่ยนจากขึ้นเป็นลง)
  const leftPeakCountRef = useRef(0);
  const rightPeakCountRef = useRef(0);
  
  // Direction tracking
  const leftDirRef = useRef<'up' | 'down' | null>(null);
  const rightDirRef = useRef<'up' | 'down' | null>(null);
  
  // Movement history for smoothing
  const leftYHistoryRef = useRef<number[]>([]);
  const rightYHistoryRef = useRef<number[]>([]);
  
  // Activity tracking
  const lastActivityRef = useRef(0);

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
  // Detect arm circle from wrist Y movement (wave pattern)
  // ============================================
  const detectArmCircleFromWave = (
    shoulderY: number,
    wristY: number,
    prevYRef: React.MutableRefObject<number>,
    peakCountRef: React.MutableRefObject<number>,
    dirRef: React.MutableRefObject<'up' | 'down' | null>,
    rotationsRef: React.MutableRefObject<number>,
    historyRef: React.MutableRefObject<number[]>
  ) => {
    // ค่า Y relative to shoulder (บวก = ต่ำกว่าไหล่, ลบ = สูงกว่าไหล่)
    const relativeY = wristY - shoulderY;
    
    // Add to history for smoothing (keep last 5 frames)
    historyRef.current.push(relativeY);
    if (historyRef.current.length > 5) {
      historyRef.current.shift();
    }
    
    // Get smoothed Y value (average of history)
    const smoothedY = historyRef.current.reduce((a, b) => a + b, 0) / historyRef.current.length;
    
    // Initialize previous Y
    if (prevYRef.current === 0) {
      prevYRef.current = smoothedY;
      return { isMoving: false, direction: 'none' as const };
    }
    
    const diff = smoothedY - prevYRef.current;
    const threshold = 0.008; // Sensitivity threshold (smaller = more sensitive)
    
    let isMoving = false;
    let detectedDirection: 'forward' | 'backward' | 'none' = 'none';
    
    // กำลังขึ้น (wrist.y ลดลง = ขึ้นใน screen space)
    if (diff < -threshold) {
      if (dirRef.current !== 'up') {
        dirRef.current = 'up';
      }
      isMoving = true;
      detectedDirection = 'forward';
    }
    
    // กำลังลง (wrist.y เพิ่มขึ้น = ลงใน screen space)
    if (diff > threshold) {
      if (dirRef.current === 'up') {
        // เพิ่งเปลี่ยนจากขึ้นเป็นลง = ผ่านจุดสูงสุด 1 ครั้ง!
        peakCountRef.current++;
        lastActivityRef.current = performance.now();
      }
      dirRef.current = 'down';
      isMoving = true;
      detectedDirection = 'backward';
    }
    
    // ครบ 1 รอบหมุน = ผ่านจุดสูงสุด 2 ครั้ง (ขึ้น-ลง-ขึ้น-ลง)
    // แต่เราใช้ 1 peak = 1 rotation เพื่อให้รู้สึกว่านับเร็วขึ้น
    if (peakCountRef.current >= 1) {
      rotationsRef.current++;
      peakCountRef.current = 0;
    }
    
    prevYRef.current = smoothedY;
    
    return { isMoving, direction: detectedDirection };
  };

  // Calculate angle for visual display (optional, for arm circle display)
  const calculateArmAngle = (shoulder: {x: number, y: number}, wrist: {x: number, y: number}) => {
    const dx = wrist.x - shoulder.x;
    const dy = wrist.y - shoulder.y;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return angle;
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

    if (result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];

      // Draw landmarks
      drawingUtils.drawLandmarks(landmarks, {
        radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1),
        color: '#9333EA',
        lineWidth: 2
      });
      drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);

      // Keypoints:
      // 11: left shoulder, 12: right shoulder
      // 15: left wrist, 16: right wrist
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const leftWrist = landmarks[15];
      const rightWrist = landmarks[16];

      // Calculate angles for visual display
      const leftAngle = calculateArmAngle(leftShoulder, leftWrist);
      const rightAngle = calculateArmAngle(rightShoulder, rightWrist);

      // Detect arm circles using Vertical Arc Tracking (wave pattern)
      const leftResult = detectArmCircleFromWave(
        leftShoulder.y,
        leftWrist.y,
        leftPrevYRef,
        leftPeakCountRef,
        leftDirRef,
        leftRotationsRef,
        leftYHistoryRef
      );
      
      const rightResult = detectArmCircleFromWave(
        rightShoulder.y,
        rightWrist.y,
        rightPrevYRef,
        rightPeakCountRef,
        rightDirRef,
        rightRotationsRef,
        rightYHistoryRef
      );

      // Check if still rotating (activity within 800ms)
      const now = performance.now();
      const isRotating = leftResult.isMoving || rightResult.isMoving || 
                         (now - lastActivityRef.current < 800);
      
      if (leftResult.isMoving || rightResult.isMoving) {
        lastActivityRef.current = now;
      }

      // Confidence
      const confidence = ((leftWrist.visibility || 0) + (rightWrist.visibility || 0) +
                         (leftShoulder.visibility || 0) + (rightShoulder.visibility || 0)) / 4;

      setArmCirclesData({
        leftArmAngle: leftAngle,
        rightArmAngle: rightAngle,
        leftRotations: leftRotationsRef.current,
        rightRotations: rightRotationsRef.current,
        leftDirection: leftResult.direction,
        rightDirection: rightResult.direction,
        isRotating,
        totalRotations: Math.max(leftRotationsRef.current, rightRotationsRef.current),
        confidence
      });
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  }, [isRunning, videoRef, canvasRef]);

  useEffect(() => {
    if (isRunning && !isLoading) {
      // Reset all tracking on start
      leftRotationsRef.current = 0;
      rightRotationsRef.current = 0;
      leftPrevYRef.current = 0;
      rightPrevYRef.current = 0;
      leftPeakCountRef.current = 0;
      rightPeakCountRef.current = 0;
      leftDirRef.current = null;
      rightDirRef.current = null;
      leftYHistoryRef.current = [];
      rightYHistoryRef.current = [];
      requestRef.current = requestAnimationFrame(predictWebcam);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning, isLoading, predictWebcam]);

  const resetCount = () => {
    leftRotationsRef.current = 0;
    rightRotationsRef.current = 0;
    leftPrevYRef.current = 0;
    rightPrevYRef.current = 0;
    leftPeakCountRef.current = 0;
    rightPeakCountRef.current = 0;
    leftDirRef.current = null;
    rightDirRef.current = null;
    leftYHistoryRef.current = [];
    rightYHistoryRef.current = [];
    setArmCirclesData(prev => ({ ...prev, leftRotations: 0, rightRotations: 0, totalRotations: 0 }));
  };

  return { armCirclesData, isLoading, resetCount };
};
