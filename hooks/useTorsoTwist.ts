import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

// ============================================
// Torso Twist Detection Hook - Enhanced
// ตรวจจับการบิดตัว (twist) อย่างแม่นยำ
// แยก twist จาก lean และ shift
// ============================================

type TwistDirection = 'left' | 'right' | 'center';

interface TorsoTwistData {
  twistAngle: number;        // -90 to 90 degrees (- = twist right, + = twist left)
  twistDirection: TwistDirection;
  twistIntensity: number;    // 0-1 how much twist
  isTwisting: boolean;       // actively moving
  twistCount: number;        // total twists
  isPerfectDodge: boolean;   // deep twist (>50°)
  confidence: number;
  // Debug info
  shoulderTwist: number;
  hipTwist: number;
  bodyTwist: number;
}

// Thresholds
const THRESHOLDS = {
  // Twist detection (in degrees)
  minTwist: 20,      // ต่ำกว่านี้ = center
  normalDodge: 30,   // 30° = หลบได้
  perfectDodge: 50,  // 50° = perfect dodge
  
  // Movement rejection
  maxLeanX: 0.08,    // ห้ามเอนไปด้านข้างมาก
  maxMoveZ: 0.1,     // ห้ามเดินเข้า-ออกกล้อง
};

export const useTorsoTwist = (
  videoRef: React.RefObject<HTMLVideoElement>,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  isRunning: boolean
) => {
  const [twistData, setTwistData] = useState<TorsoTwistData>({
    twistAngle: 0,
    twistDirection: 'center',
    twistIntensity: 0,
    isTwisting: false,
    twistCount: 0,
    isPerfectDodge: false,
    confidence: 0,
    shoulderTwist: 0,
    hipTwist: 0,
    bodyTwist: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const requestRef = useRef<number>();
  
  // Tracking refs
  const twistCountRef = useRef(0);
  const lastDirectionRef = useRef<TwistDirection>('center');
  const prevAngleRef = useRef(0);
  const smoothedTwistRef = useRef(0);
  
  // Previous positions for movement rejection
  const prevHeadXRef = useRef(0);
  const prevHipCenterZRef = useRef(0);
  const isInitializedRef = useRef(false);

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
  // Calculate twist angle from Z-depth difference
  // ============================================
  const calculateTwistAngle = (
    leftZ: number, rightZ: number, 
    leftX: number, rightX: number
  ): number => {
    // atan2 ให้มุมเป็น radians
    const radians = Math.atan2(rightZ - leftZ, rightX - leftX);
    // แปลงเป็น degrees
    const degrees = radians * (180 / Math.PI);
    return degrees;
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
        color: '#FF00FF',
        lineWidth: 2
      });
      drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);

      // Keypoints:
      // 0: nose (for head position)
      // 11: left shoulder, 12: right shoulder
      // 23: left hip, 24: right hip
      const nose = landmarks[0];
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const leftHip = landmarks[23];
      const rightHip = landmarks[24];

      // ============================================
      // 1) Calculate Shoulder Twist Angle
      // ============================================
      const shoulderTwist = calculateTwistAngle(
        leftShoulder.z, rightShoulder.z,
        leftShoulder.x, rightShoulder.x
      );

      // ============================================
      // 2) Calculate Hip Twist Angle
      // ============================================
      const hipTwist = calculateTwistAngle(
        leftHip.z, rightHip.z,
        leftHip.x, rightHip.x
      );

      // ============================================
      // 3) Combine Shoulder + Hip (Body Twist)
      // ============================================
      const rawBodyTwist = (shoulderTwist + hipTwist) / 2;

      // ============================================
      // 4) Validate: Is it a REAL twist?
      // ============================================
      const hipCenterZ = (leftHip.z + rightHip.z) / 2;
      
      // Initialize previous values
      if (!isInitializedRef.current) {
        prevHeadXRef.current = nose.x;
        prevHipCenterZRef.current = hipCenterZ;
        isInitializedRef.current = true;
      }

      // Check if head moved sideways too much (lean)
      const headMovedSideways = Math.abs(nose.x - prevHeadXRef.current);
      const isLean = headMovedSideways > THRESHOLDS.maxLeanX;

      // Check if hip moved forward/back (shift)
      const hipMovedZ = Math.abs(hipCenterZ - prevHipCenterZRef.current);
      const isShift = hipMovedZ > THRESHOLDS.maxMoveZ;

      // Check if shoulder and hip Z differences are in the same direction
      // This is the signature of a real twist
      const shoulderZDiff = rightShoulder.z - leftShoulder.z;
      const hipZDiff = rightHip.z - leftHip.z;
      const sameDirection = (shoulderZDiff * hipZDiff) > 0; // Same sign

      // Only count as twist if:
      // - Not a lean
      // - Not a shift  
      // - Shoulder and hip are twisting in the same direction
      const isValidTwist = !isLean && !isShift && sameDirection;

      // Update previous values (with smoothing)
      prevHeadXRef.current = prevHeadXRef.current * 0.9 + nose.x * 0.1;
      prevHipCenterZRef.current = prevHipCenterZRef.current * 0.9 + hipCenterZ * 0.1;

      // ============================================
      // 5) Apply twist angle (with smoothing)
      // ============================================
      const effectiveTwist = isValidTwist ? rawBodyTwist : rawBodyTwist * 0.3; // Reduce if not valid
      smoothedTwistRef.current = smoothedTwistRef.current * 0.6 + effectiveTwist * 0.4;
      
      const bodyTwist = Math.max(-90, Math.min(90, smoothedTwistRef.current));

      // ============================================
      // 6) Determine direction and intensity
      // ============================================
      let twistDirection: TwistDirection = 'center';
      let isPerfectDodge = false;

      const absTwist = Math.abs(bodyTwist);

      if (absTwist >= THRESHOLDS.minTwist) {
        // bodyTwist > 0 = right shoulder forward = twist LEFT
        // bodyTwist < 0 = left shoulder forward = twist RIGHT
        twistDirection = bodyTwist > 0 ? 'left' : 'right';
        
        if (absTwist >= THRESHOLDS.perfectDodge) {
          isPerfectDodge = true;
        }
      }

      // Calculate twist angle for display (0 = center, negative = right, positive = left)
      const twistAngle = bodyTwist;

      // Calculate intensity (0-1) based on thresholds
      let twistIntensity = 0;
      if (absTwist >= THRESHOLDS.minTwist) {
        twistIntensity = Math.min(1, (absTwist - THRESHOLDS.minTwist) / (THRESHOLDS.perfectDodge - THRESHOLDS.minTwist));
      }

      // Count twists (direction changes from left to right or vice versa)
      if (lastDirectionRef.current !== 'center' && 
          twistDirection !== 'center' && 
          twistDirection !== lastDirectionRef.current) {
        twistCountRef.current++;
      }
      
      if (twistDirection !== 'center') {
        lastDirectionRef.current = twistDirection;
      }

      // Detect if actively twisting (angle changing)
      const angleDelta = Math.abs(bodyTwist - prevAngleRef.current);
      const isTwisting = angleDelta > 2;
      prevAngleRef.current = bodyTwist;

      // Confidence
      const confidence = ((leftShoulder.visibility || 0) + (rightShoulder.visibility || 0) +
                         (leftHip.visibility || 0) + (rightHip.visibility || 0) +
                         (nose.visibility || 0)) / 5;

      setTwistData({
        twistAngle,
        twistDirection,
        twistIntensity,
        isTwisting,
        twistCount: twistCountRef.current,
        isPerfectDodge,
        confidence,
        shoulderTwist,
        hipTwist,
        bodyTwist,
      });
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  }, [isRunning, videoRef, canvasRef]);

  useEffect(() => {
    if (isRunning && !isLoading) {
      twistCountRef.current = 0;
      lastDirectionRef.current = 'center';
      smoothedTwistRef.current = 0;
      prevAngleRef.current = 0;
      isInitializedRef.current = false;
      requestRef.current = requestAnimationFrame(predictWebcam);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning, isLoading, predictWebcam]);

  const resetCount = () => {
    twistCountRef.current = 0;
    isInitializedRef.current = false;
    setTwistData(prev => ({ ...prev, twistCount: 0 }));
  };

  return { twistData, isLoading, resetCount };
};
