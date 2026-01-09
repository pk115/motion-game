import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';
import { SquatData } from '../types';

// Logic for Mosquito Clap
// 1. Hands (Wrists) must be above Nose (Y axis check). Note: in MediaPipe, Y increases downwards, so Wrist.y < Nose.y
// 2. Hands must be close to each other (Clap). Distance between Left Wrist and Right Wrist is small.

const CLAP_DISTANCE_THRESHOLD = 0.15; // Normalized coordinates. Adjust based on testing.
const UNCLAP_DISTANCE_THRESHOLD = 0.3; // Must separate hands to reset.

export const useMosquitoCounter = (videoRef: React.RefObject<HTMLVideoElement>, canvasRef: React.RefObject<HTMLCanvasElement>, isRunning: boolean) => {
  const [gameData, setGameData] = useState({
    count: 0,
    isClapping: false,
    confidence: 0,
    handDistance: 1,
    noseY: 0,
    handsY: 0,
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const requestRef = useRef<number>();
  
  const isClappingRef = useRef(false); 
  const countRef = useRef(0);
  const lastClapTimeRef = useRef(0);

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

  const calculateDistance = (a: any, b: any) => {
      return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
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
      
      // Draw landmarks
      drawingUtils.drawLandmarks(landmarks, {
        radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1),
        color: isClappingRef.current ? '#F43F5E' : '#FFFFFF', 
        lineWidth: 2
      });
      drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS);

      // Mosquito Logic
      // 0: nose
      // 15: left wrist, 16: right wrist
      const nose = landmarks[0];
      const leftWrist = landmarks[15];
      const rightWrist = landmarks[16];

      // Calculate Midpoint of hands
      const handsY = (leftWrist.y + rightWrist.y) / 2;
      
      // Calculate distance between wrists
      const distance = calculateDistance(leftWrist, rightWrist);

      // Logic Check
      const handsAboveNose = handsY < nose.y; // Remember Y is inverted
      
      if (handsAboveNose) {
          if (distance < CLAP_DISTANCE_THRESHOLD) {
              if (!isClappingRef.current) {
                  // Valid Clap!
                  // Debounce slightly to prevent double counting
                  const now = Date.now();
                  if (now - lastClapTimeRef.current > 300) {
                      isClappingRef.current = true;
                      countRef.current += 1;
                      lastClapTimeRef.current = now;
                  }
              }
          } else if (distance > UNCLAP_DISTANCE_THRESHOLD) {
              // Reset state when hands separate
              isClappingRef.current = false;
          }
      } else {
          // If hands drop below nose, reset checking state but keep 'isClapping' mostly false
          // Actually, if hands are below nose, you definitely aren't overhead clapping.
          isClappingRef.current = false;
      }

      setGameData({
        count: countRef.current,
        isClapping: isClappingRef.current,
        handDistance: distance,
        noseY: nose.y,
        handsY: handsY,
        confidence: (leftWrist.visibility || 0 + rightWrist.visibility || 0) / 2
      });
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  }, [isRunning, videoRef, canvasRef]);

  useEffect(() => {
    if (isRunning && !isLoading) {
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
    setGameData(prev => ({ ...prev, count: 0 }));
  };

  return { gameData, isLoading, resetCount };
};
