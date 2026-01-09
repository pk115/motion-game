import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useHighKnees } from '../hooks/useHighKnees';
import MonsterChaseVisuals from './MonsterChaseVisuals';
import { GameState } from '../types';
import { useAuth } from '../src/contexts/AuthContext';
import { saveScore } from '../src/services/dbService';

// ============================================
// High Knees Game - Monster Chase
// ยกเข่าสูงเพื่อวิ่งหนีมอนสเตอร์
// ============================================

interface HighKneesGameProps {
    onBack: () => void;
}

const HighKneesGame: React.FC<HighKneesGameProps> = ({ onBack }) => {
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoElementRef = useRef<HTMLVideoElement>(null);

    const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
    const [countdown, setCountdown] = useState<number | null>(null);

    // Game state
    const [distance, setDistance] = useState(0);          // Score = distance traveled
    const [monsterDistance, setMonsterDistance] = useState(50); // 0-100, lower = closer
    const [boostActive, setBoostActive] = useState(false);
    const [boostTimer, setBoostTimer] = useState(0);
    const [showGameOver, setShowGameOver] = useState(false);

    const isRunning = gameState === GameState.PLAYING;
    const gameLoopRef = useRef<number>();

    // Track previous step count to detect new steps
    const prevStepsRef = useRef(0);

    // Audio refs
    const bgMusicRef = useRef<HTMLAudioElement | null>(null);
    const stepSoundRef = useRef<HTMLAudioElement | null>(null);
    const boostSoundRef = useRef<HTMLAudioElement | null>(null);
    const roarSoundRef = useRef<HTMLAudioElement | null>(null);

    // Sync webcam ref
    useEffect(() => {
        if (webcamRef.current && webcamRef.current.video) {
            videoElementRef.current = webcamRef.current.video;
        }
    }, [webcamRef.current, gameState]);

    const { highKneesData, isLoading, resetCount } = useHighKnees(videoElementRef, canvasRef, isRunning);
    const { user } = useAuth();

    // Initialize audio
    useEffect(() => {
        // Background music
        bgMusicRef.current = new Audio('/sounds/highknees/music.mp3');
        bgMusicRef.current.loop = true;
        bgMusicRef.current.volume = 0.25;

        // Running/step sound (plays when detecting steps)
        stepSoundRef.current = new Audio('/sounds/highknees/runsound.mp3');
        stepSoundRef.current.volume = 0.4;
        stepSoundRef.current.loop = true;

        // Use runsound for boost too
        boostSoundRef.current = new Audio('/sounds/highknees/runsound.mp3');
        boostSoundRef.current.volume = 0.6;

        // Use music for roar (will just stop music on game over)
        roarSoundRef.current = null;

        return () => {
            if (bgMusicRef.current) {
                bgMusicRef.current.pause();
                bgMusicRef.current = null;
            }
            if (stepSoundRef.current) {
                stepSoundRef.current.pause();
                stepSoundRef.current = null;
            }
        };
    }, []);

    // Start music on page load
    useEffect(() => {
        const startMusic = () => {
            if (bgMusicRef.current && bgMusicRef.current.paused) {
                bgMusicRef.current.play().catch(() => { });
            }
        };

        startMusic();

        const handleInteraction = () => {
            startMusic();
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('touchstart', handleInteraction);
        };

        document.addEventListener('click', handleInteraction);
        document.addEventListener('touchstart', handleInteraction);

        return () => {
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('touchstart', handleInteraction);
        };
    }, []);

    const playSound = useCallback((audioRef: React.RefObject<HTMLAudioElement>) => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => { });
        }
    }, []);

    // Game time tracking for wave pattern
    const gameTimeRef = useRef(0);

    // Game Loop
    useEffect(() => {
        if (!isRunning) return;

        const gameLoop = () => {
            const speed = highKneesData.averageSpeed;
            const boostedSpeed = boostActive ? speed * 1.5 : speed;

            // ✨ NEW: Calculate distance based on steps (1 step = 10 meters)
            const currentSteps = highKneesData.stepsCount;
            const newSteps = currentSteps - prevStepsRef.current;
            if (newSteps > 0) {
                setDistance(prev => prev + (newSteps * 10)); // 1 step = 10m
                prevStepsRef.current = currentSteps;
            }

            // Track game time (in frames, ~60fps)
            gameTimeRef.current++;

            // ============================================
            // SIMPLE ALTERNATING PATTERN
            // - 10 วินาทีแรก: มอนถอยห่าง (พัก)
            // - 10 วินาทีถัดไป: มอนพุ่งเข้ามา (ไล่!)
            // - สลับกันไปเรื่อยๆ
            // ============================================
            setMonsterDistance(prev => {
                const timeInSeconds = gameTimeRef.current / 60;

                // ทุก 20 วินาที = 1 รอบ (10 พัก + 10 ไล่)
                const cycleTime = timeInSeconds % 20;

                // 0-10 วิ = REST PHASE (มอนถอยห่าง!)
                // 10-20 วิ = CHASE PHASE (มอนพุ่งเข้ามา!)
                const isChasePhase = cycleTime >= 10;

                let newDistance;
                if (isChasePhase) {
                    // CHASE! มอนพุ่งเข้ามาเร็ว
                    // ลด distance (เข้าใกล้)
                    newDistance = prev - 0.35 + (boostedSpeed * 0.4);
                } else {
                    // REST - มอนถอยห่างออกไป!
                    // เพิ่ม distance (ถอยออก)
                    newDistance = prev + 0.25;
                }

                // Clamp: ใกล้สุด 10, ไกลสุด 65
                return Math.max(10, Math.min(65, newDistance));
            });

            // Spawn boost zones randomly
            if (!boostActive && Math.random() < 0.002) {
                setBoostActive(true);
                setBoostTimer(150); // 150 frames = ~2.5 seconds
                playSound(boostSoundRef);
            }

            // Decrease boost timer
            if (boostActive && boostTimer > 0) {
                setBoostTimer(prev => prev - 1);
            } else if (boostActive && boostTimer <= 0) {
                setBoostActive(false);
            }

            gameLoopRef.current = requestAnimationFrame(gameLoop);
        };

        gameLoopRef.current = requestAnimationFrame(gameLoop);

        return () => {
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current);
            }
        };
    }, [isRunning, highKneesData.averageSpeed, highKneesData.stepsCount, boostActive, boostTimer, playSound]);

    // Check game over (monster caught player)
    // Only happens if player completely stops AND monster gets extremely close
    const stillFramesRef = useRef(0);
    useEffect(() => {
        if (gameState !== GameState.PLAYING) return;

        // Count frames player is completely still
        if (highKneesData.averageSpeed < 0.05) {
            stillFramesRef.current++;
        } else {
            stillFramesRef.current = 0;
        }

        // Game over only if: still for 3+ seconds AND monster very close
        // This makes it almost impossible to lose if you keep moving!
        if (stillFramesRef.current > 180 && monsterDistance <= 10) {
            // Stop music on game over
            if (bgMusicRef.current) {
                bgMusicRef.current.pause();
            }
            if (stepSoundRef.current) {
                stepSoundRef.current.pause();
            }
            setGameState(GameState.PAUSED);
            setShowGameOver(true);

            // Save score
            if (user && distance > 0) {
                saveScore(user, Math.floor(distance), 'cumulative', 'highknees');
                saveScore(user, Math.floor(distance), 'endurance', 'highknees');
            }
        }
    }, [monsterDistance, gameState, distance, user, playSound, highKneesData.averageSpeed]);

    // Play/pause running sound based on player speed
    useEffect(() => {
        if (!stepSoundRef.current) return;

        if (gameState === GameState.PLAYING && highKneesData.isRunning) {
            // Playing and running - play sound
            if (stepSoundRef.current.paused) {
                stepSoundRef.current.play().catch(() => { });
            }
            // Adjust speed based on running speed
            stepSoundRef.current.playbackRate = 0.8 + highKneesData.averageSpeed * 0.5;
        } else {
            // Not running or not playing - pause sound
            if (!stepSoundRef.current.paused) {
                stepSoundRef.current.pause();
            }
        }
    }, [gameState, highKneesData.isRunning, highKneesData.averageSpeed]);

    const startCountdown = () => {
        setGameState(GameState.LOADING);
        let count = 3;
        setCountdown(count);

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                setCountdown(count);
            } else if (count === 0) {
                setCountdown(0);
            } else {
                clearInterval(interval);
                setCountdown(null);
                startGame();
            }
        }, 1000);
    };

    const startGame = () => {
        resetCount();
        setDistance(0);
        setMonsterDistance(50);
        setBoostActive(false);
        setShowGameOver(false);
        prevStepsRef.current = 0; // Reset step tracking
        setGameState(GameState.PLAYING);
    };

    const stopGame = async () => {
        setGameState(GameState.PAUSED);
        setShowGameOver(true);

        if (user && distance > 0) {
            await saveScore(user, Math.floor(distance), 'cumulative', 'highknees');
            await saveScore(user, Math.floor(distance), 'endurance', 'highknees');
        }
    };

    const restartGame = () => {
        setShowGameOver(false);
        startCountdown();
    };

    return (
        <div className="game-screen relative h-screen w-screen overflow-hidden bg-slate-900 font-sans">
            {/* Back Button */}
            <button
                onClick={onBack}
                className="absolute top-2 left-2 sm:top-4 sm:left-4 z-50 bg-black/30 hover:bg-black/50 backdrop-blur text-white p-2 sm:p-3 rounded-full transition-all border border-white/10"
                style={{ marginTop: 'env(safe-area-inset-top)' }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
            </button>

            {/* Webcam PiP - Mobile Responsive */}
            <div
                className="absolute top-2 right-2 sm:top-4 sm:right-4 z-40 bg-black rounded-xl sm:rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl group"
                style={{
                    marginTop: 'env(safe-area-inset-top)',
                    width: 'clamp(70px, 20vw, 180px)',
                    aspectRatio: typeof window !== 'undefined' && window.innerWidth < 640 ? '3/4' : '4/3'
                }}
            >
                <Webcam
                    ref={webcamRef}
                    className="absolute w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    mirrored
                    audio={false}
                    disablePictureInPicture={true}
                    forceScreenshotSourceSize={true}
                    imageSmoothing={true}
                    screenshotFormat="image/jpeg"
                    screenshotQuality={1}
                    videoConstraints={{
                        facingMode: "user",
                        width: { ideal: 640 },
                        height: { ideal: 480 }
                    }}
                    onUserMediaError={() => { }}
                    onUserMedia={() => {
                        if (webcamRef.current?.video) {
                            // @ts-ignore
                            videoElementRef.current = webcamRef.current.video;
                        }
                    }}
                />
                <canvas ref={canvasRef} className="absolute w-full h-full object-cover" />

                {/* Steps Counter on PiP */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-0.5 text-center">
                    <span className="text-[10px] sm:text-xs text-white font-bold">🦶 {highKneesData.stepsCount}</span>
                </div>
            </div>

            {/* Game Visuals */}
            <div className="absolute inset-0 z-0">
                <MonsterChaseVisuals
                    playerSpeed={highKneesData.averageSpeed}
                    monsterDistance={monsterDistance}
                    score={distance}
                    isRunning={highKneesData.isRunning}
                    boostActive={boostActive}
                />
            </div>

            {/* Countdown Overlay */}
            {countdown !== null && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="text-6xl sm:text-7xl md:text-9xl font-black text-white drop-shadow-[0_0_50px_rgba(168,85,247,0.8)] animate-bounce">
                        {countdown === 0 ? 'RUN!' : countdown}
                    </div>
                </div>
            )}

            {/* Start/Stop Controls */}
            {(gameState === GameState.IDLE || gameState === GameState.PAUSED) && !showGameOver && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="text-center space-y-6">
                        <div className="text-6xl mb-4">👹🏃</div>
                        <h2 className="text-3xl sm:text-4xl font-black text-white">Monster Chase</h2>
                        <p className="text-slate-300 max-w-xs mx-auto">
                            Lift your knees high to run! <br />
                            Don't let the monster catch you!
                        </p>
                        <button
                            onClick={startCountdown}
                            disabled={isLoading}
                            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-black text-xl rounded-full shadow-lg transition-all disabled:opacity-50"
                        >
                            {isLoading ? 'Loading...' : '▶ START'}
                        </button>
                    </div>
                </div>
            )}

            {/* Game Over Modal */}
            {showGameOver && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-800/90 rounded-3xl p-8 text-center max-w-sm mx-4 border border-white/10">
                        <div className="text-6xl mb-4">👹💀</div>
                        <h2 className="text-3xl font-black text-red-400 mb-2">CAUGHT!</h2>
                        <p className="text-slate-300 mb-4">The monster got you!</p>

                        <div className="bg-black/30 rounded-xl p-4 mb-6">
                            <div className="text-sm text-slate-400 uppercase">Distance</div>
                            <div className="text-4xl font-black text-white font-mono">
                                {Math.floor(distance)}m
                            </div>
                            <div className="text-sm text-slate-400 mt-2">
                                Steps: {highKneesData.stepsCount}
                            </div>
                        </div>

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={onBack}
                                className="px-6 py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-full transition-all"
                            >
                                Exit
                            </button>
                            <button
                                onClick={restartGame}
                                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold rounded-full transition-all"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stop Button (during gameplay) - MOVED TO LEFT */}
            {gameState === GameState.PLAYING && (
                <button
                    onClick={stopGame}
                    className="absolute bottom-6 left-4 z-40 px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white text-sm font-bold rounded-full shadow-lg transition-all border border-red-400/50"
                    style={{ marginBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
                >
                    ⏹ STOP
                </button>
            )}
        </div>
    );
};

export default HighKneesGame;
