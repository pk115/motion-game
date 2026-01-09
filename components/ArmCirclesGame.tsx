import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useArmCircles } from '../hooks/useArmCircles';
import WizardVisuals from './WizardVisuals';
import { GameState } from '../types';
import { useAuth } from '../src/contexts/AuthContext';
import { saveScore } from '../src/services/dbService';

// ============================================
// Arm Circles Game - Wizard Spell
// หมุนแขนเพื่อร่ายเวท 🧙‍♂️
// ============================================

interface ArmCirclesGameProps {
    onBack: () => void;
}

const SPELLS = ['fire', 'ice', 'arcane']; // ตัด lightning และ nature ออก
// คะแนน = จำนวนรอบที่หมุน (1 รอบ = 1 คะแนน)

const ArmCirclesGame: React.FC<ArmCirclesGameProps> = ({ onBack }) => {
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoElementRef = useRef<HTMLVideoElement>(null);

    const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
    const [countdown, setCountdown] = useState<number | null>(null);

    // Game state
    const [score, setScore] = useState(0);
    const [currentSpell, setCurrentSpell] = useState('arcane');
    const [spellsCast, setSpellsCast] = useState(0);
    const [showGameOver, setShowGameOver] = useState(false);

    const isRunning = gameState === GameState.PLAYING;
    const lastTotalRotationsRef = useRef(0);

    // Pattern tracking: Forward 10 → Backward 10 → Repeat
    const REPS_PER_SET = 10;
    const [currentPattern, setCurrentPattern] = useState<'forward' | 'backward'>('forward');
    const [patternProgress, setPatternProgress] = useState(0); // 0-9 in current set

    // Audio refs
    const bgMusicRef = useRef<HTMLAudioElement | null>(null);
    const castSoundRef = useRef<HTMLAudioElement | null>(null);

    // Sync webcam ref
    useEffect(() => {
        if (webcamRef.current && webcamRef.current.video) {
            videoElementRef.current = webcamRef.current.video;
        }
    }, [webcamRef.current, gameState]);

    const { armCirclesData, isLoading, resetCount } = useArmCircles(videoElementRef, canvasRef, isRunning);
    const { user } = useAuth();

    // Initialize audio
    useEffect(() => {
        bgMusicRef.current = new Audio('/sounds/wizard/music.mp3');
        bgMusicRef.current.loop = true;
        bgMusicRef.current.volume = 0.25;

        castSoundRef.current = new Audio('/sounds/wizard/round.mp3');
        castSoundRef.current.volume = 0.5;

        return () => {
            if (bgMusicRef.current) {
                bgMusicRef.current.pause();
                bgMusicRef.current = null;
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

    // Game logic - count all rotations (ไม่เช็คทิศทาง แค่นับรอบ)
    useEffect(() => {
        if (!isRunning) return;

        const totalRots = armCirclesData.totalRotations;
        const newRotations = totalRots - lastTotalRotationsRef.current;

        if (newRotations > 0) {
            // ได้คะแนนทุกครั้งที่หมุน ไม่สนทิศทาง
            setScore(s => s + newRotations);
            setSpellsCast(s => s + newRotations);
            playSound(castSoundRef);

            // Update pattern progress
            setPatternProgress(prev => {
                const newProgress = prev + newRotations;
                console.log('Pattern Progress:', prev, '+', newRotations, '=', newProgress);
                if (newProgress >= REPS_PER_SET) {
                    // Switch pattern after 10 reps
                    const nextPattern = currentPattern === 'forward' ? 'backward' : 'forward';
                    console.log('Switching pattern from', currentPattern, 'to', nextPattern);
                    setCurrentPattern(nextPattern);
                    setCurrentSpell(nextPattern === 'forward' ? 'fire' : 'ice');
                    return newProgress - REPS_PER_SET; // เก็บส่วนเกิน
                }
                return newProgress;
            });
        }

        lastTotalRotationsRef.current = totalRots;
    }, [isRunning, armCirclesData.totalRotations, playSound, currentPattern, REPS_PER_SET]);

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
        setScore(0);
        setSpellsCast(0);
        setCurrentSpell('fire');
        setCurrentPattern('forward');
        setPatternProgress(0);
        lastTotalRotationsRef.current = 0;
        setShowGameOver(false);
        setGameState(GameState.PLAYING);
    };

    const stopGame = async () => {
        setGameState(GameState.PAUSED);
        setShowGameOver(true);

        if (bgMusicRef.current) {
            bgMusicRef.current.pause();
        }

        if (user && score > 0) {
            console.log('🎮 Saving Wizard scores:', { score, spellsCast, user: user.email });
            try {
                await saveScore(user, score, 'cumulative', 'wizard');
                await saveScore(user, spellsCast, 'endurance', 'wizard');
                console.log('✅ Wizard scores saved successfully!');
            } catch (error) {
                console.error('❌ Error saving wizard scores:', error);
            }
        } else {
            console.log('⚠️ Not saving - user:', !!user, 'score:', score);
        }
    };

    const restartGame = () => {
        setShowGameOver(false);
        if (bgMusicRef.current) {
            bgMusicRef.current.play().catch(() => { });
        }
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

            {/* Webcam PiP */}
            <div
                className="absolute top-2 right-2 sm:top-4 sm:right-4 z-40 bg-black rounded-xl overflow-hidden border-2 border-purple-500/50 shadow-2xl"
                style={{
                    marginTop: 'env(safe-area-inset-top)',
                    width: 'clamp(100px, 25vw, 220px)',
                    aspectRatio: '4/3'
                }}
            >
                <Webcam
                    ref={webcamRef}
                    className="absolute w-full h-full object-cover opacity-80"
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

                {/* Rotations on PiP */}
                <div className="absolute bottom-1 left-1 right-1 bg-black/60 rounded px-1 py-0.5 text-center">
                    <span className="text-xs text-white font-bold">🔄 {armCirclesData.totalRotations}</span>
                </div>
            </div>

            {/* Game Visuals */}
            <div className="absolute inset-0 z-0">
                <WizardVisuals
                    leftArmAngle={armCirclesData.leftArmAngle}
                    rightArmAngle={armCirclesData.rightArmAngle}
                    leftRotations={armCirclesData.leftRotations}
                    rightRotations={armCirclesData.rightRotations}
                    leftDirection={armCirclesData.leftDirection}
                    rightDirection={armCirclesData.rightDirection}
                    isRotating={armCirclesData.isRotating}
                    spellCharge={0}
                    score={score}
                    currentSpell={currentSpell}
                    currentPattern={currentPattern}
                    patternProgress={patternProgress}
                    repsPerSet={REPS_PER_SET}
                />
            </div>

            {/* Countdown Overlay */}
            {countdown !== null && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="text-6xl sm:text-7xl md:text-9xl font-black text-white drop-shadow-[0_0_50px_rgba(168,85,247,0.8)] animate-bounce">
                        {countdown === 0 ? '✨CAST!✨' : countdown}
                    </div>
                </div>
            )}

            {/* Start Screen */}
            {(gameState === GameState.IDLE || gameState === GameState.PAUSED) && !showGameOver && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="text-center space-y-6">
                        <div className="text-6xl mb-4">🧙‍♂️✨</div>
                        <h2 className="text-3xl sm:text-4xl font-black text-white">Wizard Spell</h2>
                        <p className="text-purple-200 max-w-xs mx-auto">
                            Rotate your arms to cast spells!<br />
                            Pattern changes every 10 rotations!
                        </p>
                        <div className="text-sm text-purple-300 space-y-1">
                            <div>🔄 หมุนแขนไปทิศทางไหนก็ได้</div>
                            <div>🔥❄️ ทุก 10 รอบ เปลี่ยนเวท</div>
                            <div>✨ หมุน 1 รอบ = 1 คะแนน</div>
                        </div>
                        <button
                            onClick={startCountdown}
                            disabled={isLoading}
                            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-black text-xl rounded-full shadow-lg transition-all disabled:opacity-50"
                        >
                            {isLoading ? 'Loading...' : '✨ START'}
                        </button>
                    </div>
                </div>
            )}

            {/* Game Over Modal */}
            {showGameOver && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-800/90 rounded-3xl p-8 text-center max-w-sm mx-4 border border-purple-500/30">
                        <div className="text-6xl mb-4">🧙‍♂️🌟</div>
                        <h2 className="text-3xl font-black text-purple-400 mb-2">Session Complete!</h2>

                        <div className="bg-black/30 rounded-xl p-4 mb-6 space-y-3">
                            <div>
                                <div className="text-sm text-slate-400 uppercase">Magic Power</div>
                                <div className="text-4xl font-black text-white font-mono">{score}</div>
                            </div>
                            <div className="flex justify-around">
                                <div>
                                    <div className="text-xs text-slate-400">Spells Cast</div>
                                    <div className="text-2xl font-bold text-purple-400">{spellsCast}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400">Total Rotations</div>
                                    <div className="text-2xl font-bold text-cyan-400">{armCirclesData.totalRotations}</div>
                                </div>
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
                                Cast Again
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stop Button */}
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

export default ArmCirclesGame;
