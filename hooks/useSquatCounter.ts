import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { SquatData } from '../types';

// ============================================
// Algorithm ใหม่: ใช้ความกว้างไหล่เป็น reference
// ============================================
// Diff = Current_Y - Stand_Y
// Threshold = Shoulder_Width × 0.4
// ถ้า Diff > Threshold --> SQUAT (นั่ง)
// ถ้า Diff < Threshold × 0.2 --> UP (ยืน)
// ============================================

const SQUAT_RATIO = 0.4;   // ถ้า Y ตกมากกว่า 40% ของความกว้างไหล่ = SQUAT
const STAND_RATIO = 0.2;   // ถ้า Y กลับมาน้อยกว่า 20% ของ threshold = STAND

export const useSquatCounter = (videoRef: React.RefObject<HTMLVideoElement>, canvasRef: React.RefObject<HTMLCanvasElement>, isRunning: boolean) => {
  const [squatData, setSquatData] = useState<SquatData>({
    count: 0,
    isSquatting: false,
    kneeAngle: 180,
    confidence: 0,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const requestRef = useRef<number>();
  const isSquattingRef = useRef(false);
  const countRef = useRef(0);
  
  // Calibration refs
  const standYRef = useRef<number | null>(null);        // ค่า Y ตอนยืน (calibrated)
  const calibrationFramesRef = useRef(0);               // นับ frame สำหรับ calibration
  const calibrationYValuesRef = useRef<number[]>([]);   // เก็บค่า Y หลายๆ frame เพื่อเอาค่าเฉลี่ย
  
  // Smoothing refs
  const yHistoryRef = useRef<number[]>([]);             // Smooth Y position

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

  // Smooth Y position to reduce jitter
  const getSmoothedY = (newY: number) => {
    yHistoryRef.current.push(newY);
    if (yHistoryRef.current.length > 5) {
      yHistoryRef.current.shift();
    }
    const sum = yHistoryRef.current.reduce((a, b) => a + b, 0);
    return sum / yHistoryRef.current.length;
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

    // Resize canvas to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const drawingUtils = new DrawingUtils(ctx!);

    let startTimeMs = performance.now();
    const result = poseLandmarkerRef.current.detectForVideo(video, startTimeMs);

    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    if (result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];
      
      // Draw landmarks with squat state color
      drawingUtils.drawLandmarks(landmarks, {
        radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1),
        color: isSquattingRef.current ? '#00FF00' : '#FF0000',
        lineWidth: 2
      });
      drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);

      // ===============================
      // Step 1: ดึงค่า Keypoints
      // ===============================
      // 11: left shoulder, 12: right shoulder
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      
      // Check visibility
      const leftVis = leftShoulder.visibility || 0;
      const rightVis = rightShoulder.visibility || 0;
      const avgConfidence = (leftVis + rightVis) / 2;
      
      if (avgConfidence > 0.5) {
        // ===============================
        // Step 2: คำนวณค่าที่ต้องใช้
        // ===============================
        
        // ความกว้างไหล่ (Shoulder Width) = ระยะห่าง X ของไหล่ซ้าย-ขวา
        const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
        
        // ความสูงไหล่ปัจจุบัน (Current Y) = ค่าเฉลี่ย Y ของไหล่ทั้งสอง
        const currentY = (leftShoulder.y + rightShoulder.y) / 2;
        
        // Smooth ค่า Y เพื่อลด jitter
        const smoothedY = getSmoothedY(currentY);
        
        // ===============================
        // Step 3: Calibration (30 frames แรก)
        // ===============================
        const CALIBRATION_FRAMES = 30;
        
        if (calibrationFramesRef.current < CALIBRATION_FRAMES) {
          // เก็บค่า Y หลายๆ frame
          calibrationYValuesRef.current.push(smoothedY);
          calibrationFramesRef.current++;
          
          // เมื่อครบ 30 frames ให้หาค่าเฉลี่ยเป็น Stand_Y
          if (calibrationFramesRef.current >= CALIBRATION_FRAMES) {
            const sumY = calibrationYValuesRef.current.reduce((a, b) => a + b, 0);
            standYRef.current = sumY / calibrationYValuesRef.current.length;
            console.log('Calibrated Stand_Y:', standYRef.current);
          }
          
          // ยังไม่ต้อง detect ระหว่าง calibration
          setSquatData({
            count: countRef.current,
            isSquatting: false,
            kneeAngle: 180,
            confidence: avgConfidence
          });
        } else if (standYRef.current !== null && shoulderWidth > 0.05) {
          // ===============================
          // Step 4: Detection Loop
          // ===============================
          
          // Diff = Current_Y - Stand_Y
          // (ค่า Y มากขึ้น = ต่ำลง ในพิกัดหน้าจอ)
          const diff = smoothedY - standYRef.current;
          
          // Threshold = Shoulder_Width × 0.4
          const threshold = shoulderWidth * SQUAT_RATIO;
          
          // ===============================
          // Step 5: State Machine
          // ===============================
          
          if (diff > threshold) {
            // Diff > Threshold --> SQUAT (นั่ง)
            if (!isSquattingRef.current) {
              isSquattingRef.current = true;
              console.log('SQUAT! Diff:', diff.toFixed(3), 'Threshold:', threshold.toFixed(3));
            }
          } else if (diff < threshold * STAND_RATIO) {
            // Diff < Threshold × 0.2 --> UP (ยืน)
            if (isSquattingRef.current) {
              isSquattingRef.current = false;
              countRef.current += 1;
              console.log('STAND! Count:', countRef.current);
            }
          }
          
          // คำนวณ "pseudo angle" สำหรับแสดง UI (0-180)
          // 0% = 180°, 100% diff/threshold = 90°
          const ratio = Math.max(0, Math.min(1, diff / threshold));
          const pseudoAngle = 180 - (ratio * 90);
          
          setSquatData({
            count: countRef.current,
            isSquatting: isSquattingRef.current,
            kneeAngle: Math.round(pseudoAngle),
            confidence: avgConfidence
          });
        }
      } else {
        // ไม่เห็นไหล่ชัด - แสดงค่าเดิม
        setSquatData(prev => ({
          ...prev,
          confidence: avgConfidence
        }));
      }
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  }, [isRunning, videoRef, canvasRef]);

  useEffect(() => {
    if (isRunning && !isLoading) {
      // Reset calibration เมื่อเริ่มเกม
      calibrationFramesRef.current = 0;
      calibrationYValuesRef.current = [];
      standYRef.current = null;
      yHistoryRef.current = [];
      requestRef.current = requestAnimationFrame(predictWebcam);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRunning, isLoading, predictWebcam]);

  const resetCount = () => {
    countRef.current = 0;
    calibrationFramesRef.current = 0;
    calibrationYValuesRef.current = [];
    standYRef.current = null;
    yHistoryRef.current = [];
    setSquatData(prev => ({ ...prev, count: 0 }));
  };

  return { squatData, isLoading, resetCount };
};