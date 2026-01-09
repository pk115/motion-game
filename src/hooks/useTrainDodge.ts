import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PoseLandmarker, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

type Lane = 'left' | 'center' | 'right';

interface GameState {
    playerLane: Lane; // Where the player IS
    score: number;
    lives: number;
    gameOver: boolean;
    confidence: number;
    noseX: number;
}

// Logic:
// Screen X is 0.0 (Left) to 1.0 (Right).
// We mirror the webcam, so:
// Users moving RIGHT in REALITY -> Moves LEFT on SCREEN (x -> 0)
// Users moving LEFT in REALITY -> Moves RIGHT on SCREEN (x -> 1)
// Zones are divided into 3 equal parts:
// Left Lane: 0.0 - 0.33
// Center Lane: 0.33 - 0.67
// Right Lane: 0.67 - 1.0

export const useTrainDodge = (videoRef: React.RefObject<HTMLVideoElement>, canvasRef: React.RefObject<HTMLCanvasElement>, isRunning: boolean) => {
    const [gameState, setGameState] = useState<GameState>({
        playerLane: 'center',
        score: 0,
        lives: 3,
        gameOver: false,
        confidence: 0,
        noseX: 0.5
    });

    const [isLoading, setIsLoading] = useState(true);
    const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
    const requestRef = useRef<number>();

    // Mutable refs for loop
    const stateRef = useRef(gameState);
    // Sync ref
    useEffect(() => { stateRef.current = gameState; }, [gameState]);

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
        return () => { poseLandmarkerRef.current?.close(); };
    }, []);

    const predictWebcam = useCallback(() => {
        if (!isRunning || !poseLandmarkerRef.current || !videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (video.videoWidth === 0) { requestRef.current = requestAnimationFrame(predictWebcam); return; }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const drawingUtils = new DrawingUtils(ctx!);

        const startTimeMs = performance.now();
        const result = poseLandmarkerRef.current.detectForVideo(video, startTimeMs);

        ctx!.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Lane Guides on Canvas (Debug overlay)
        const w = canvas.width;
        ctx!.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        // Lane dividers at 1/3 and 2/3 of screen width
        ctx!.moveTo(w * 0.33, 0); ctx!.lineTo(w * 0.33, canvas.height);
        ctx!.moveTo(w * 0.67, 0); ctx!.lineTo(w * 0.67, canvas.height);
        ctx!.stroke();

        let currentLane: Lane = 'center';

        if (result.landmarks && result.landmarks.length > 0) {
            const landmarks = result.landmarks[0];
            const nose = landmarks[0];

            // Determine Lane - MIRROR the X to match the mirrored video display
            // Divide screen into 3 equal zones: Left (0-0.33), Center (0.33-0.67), Right (0.67-1.0)
            const mirroredX = 1 - nose.x;
            if (mirroredX < 0.33) currentLane = 'left';
            else if (mirroredX > 0.67) currentLane = 'right';
            else currentLane = 'center';

            setGameState(prev => ({
                ...prev,
                playerLane: currentLane,
                confidence: nose.visibility || 0,
                noseX: mirroredX
            }));

            // Draw Skeleton
            drawingUtils.drawLandmarks(landmarks, { color: '#00FF00', radius: 3 });
        }

        requestRef.current = requestAnimationFrame(predictWebcam);
    }, [isRunning]);

    useEffect(() => {
        if (isRunning && !isLoading) requestRef.current = requestAnimationFrame(predictWebcam);
        return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
    }, [isRunning, isLoading, predictWebcam]);

    const resetGame = () => {
        setGameState({
            playerLane: 'center',
            score: 0,
            lives: 3,
            gameOver: false,
            confidence: 0,
            noseX: 0.5
        });
    };

    return { gameState, isLoading, resetGame };
};
