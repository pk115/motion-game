import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useSquatCounter } from '../hooks/useSquatCounter';
import TreeGame from './TreeGame';
import { GameState } from '../types';
import { useAuth } from '../src/contexts/AuthContext';
import { saveScore } from '../src/services/dbService';

interface SquatClimberGameProps {
    onBack: () => void;
}

const SquatClimberGame: React.FC<SquatClimberGameProps> = ({ onBack }) => {
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [showClimbEffect, setShowClimbEffect] = useState(false);
    const lastScoreRef = useRef(0);

    // Audio refs
    const bgMusicRef = useRef<HTMLAudioElement | null>(null);
    const climbSoundRef = useRef<HTMLAudioElement | null>(null);
    const milestoneSoundRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio on mount
    useEffect(() => {
        // Background music from file
        bgMusicRef.current = new Audio('/sounds/climber/music.mp3');
        bgMusicRef.current.loop = true;
        bgMusicRef.current.volume = 0.2;

        // Climb/squat sound from file
        climbSoundRef.current = new Audio('/sounds/climber/rizz.mp3');
        climbSoundRef.current.volume = 0.5;

        // Milestone sound - reuse rizz with higher volume
        milestoneSoundRef.current = new Audio('/sounds/climber/rizz.mp3');
        milestoneSoundRef.current.volume = 0.8;

        return () => {
            if (bgMusicRef.current) {
                bgMusicRef.current.pause();
                bgMusicRef.current = null;
            }
        };
    }, []);

    // Start background music when page loads
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

    // Play sound helper
    const playSound = useCallback((audioRef: React.RefObject<HTMLAudioElement>) => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => { }); // Ignore autoplay errors
        }
    }, []);

    // Determine if pose detection should run
    const isRunning = gameState === GameState.PLAYING;

    // Custom hook usage
    // We cast the refs because react-webcam exposes the underlying video element differently
    const videoElementRef = useRef<HTMLVideoElement>(null);

    // Sync react-webcam ref to a standard video ref for our hook
    useEffect(() => {
        if (webcamRef.current && webcamRef.current.video) {
            // @ts-ignore - Valid assignment for mutable ref
            videoElementRef.current = webcamRef.current.video;
        }
    }, [webcamRef.current, gameState]);

    const { squatData, isLoading, resetCount } = useSquatCounter(videoElementRef, canvasRef, isRunning);
    const { user } = useAuth();

    // Watch for score changes to play sounds
    useEffect(() => {
        if (squatData.count > lastScoreRef.current && gameState === GameState.PLAYING) {
            // Play climb sound on every squat
            playSound(climbSoundRef);

            // Show climb effect
            setShowClimbEffect(true);
            setTimeout(() => setShowClimbEffect(false), 300);

            // Play milestone sound every 10 squats
            if (squatData.count % 10 === 0 && squatData.count > 0) {
                playSound(milestoneSoundRef);
            }
        }
        lastScoreRef.current = squatData.count;
    }, [squatData.count, gameState, playSound]);

    const startCountdown = () => {
        setGameState(GameState.LOADING); // Use loading state to block interaction during countdown
        let count = 5;
        setCountdown(count);

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                setCountdown(count);
            } else if (count === 0) {
                setCountdown(0); // 0 will represent "GO"
            } else {
                clearInterval(interval);
                setCountdown(null);
                startGame();
            }
        }, 1000);
    };

    const startGame = () => {
        resetCount();
        setGameState(GameState.PLAYING);
    };

    const stopGame = async () => {
        setGameState(GameState.PAUSED);

        if (user && squatData.count > 0) {
            // Save both cumulative (total) and endurance (max in one go)
            await saveScore(user, squatData.count, 'cumulative', 'climber');
            await saveScore(user, squatData.count, 'endurance', 'climber');
        }
    };

    return (
        <div className="game-screen relative h-screen w-screen overflow-hidden bg-slate-900 font-sans">

            {/* Back Button */}
            <button
                onClick={onBack}
                className="absolute top-2 left-2 sm:top-4 sm:left-4 z-50 bg-black/30 hover:bg-black/50 backdrop-blur text-white p-2 sm:p-3 rounded-full transition-all border border-white/10 hover:border-white/30"
                title="Back to Menu"
                style={{ marginTop: 'env(safe-area-inset-top)' }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
            </button>

            {/* Webcam PiP - Top Right - Use native camera FOV, display as portrait on mobile */}
            <div
                className="absolute top-2 right-2 sm:top-4 sm:right-4 z-40 bg-black rounded-xl sm:rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl group"
                style={{
                    marginTop: 'env(safe-area-inset-top)',
                    width: 'clamp(80px, 22vw, 192px)',
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
                        // Use wide resolution for better body tracking - don't restrict aspect ratio
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
                <canvas
                    ref={canvasRef}
                    className="absolute w-full h-full object-cover z-10 pointer-events-none"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-0.5 sm:p-1 text-center">
                    <p className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-wider ${isLoading ? 'text-yellow-400' : 'text-green-400'}`}>
                        {isLoading ? 'Loading...' : 'Active'}
                    </p>
                </div>
            </div>

            {/* BACKGROUND: Game Visuals */}
            <div className="absolute inset-0 z-0">
                <TreeGame score={squatData.count} isSquatting={squatData.isSquatting} />
            </div>

            {/* CLIMB EFFECT OVERLAY */}
            {showClimbEffect && (
                <div className="absolute inset-0 z-30 pointer-events-none">
                    {/* Screen flash */}
                    <div className="absolute inset-0 bg-emerald-400/20 animate-pulse"></div>

                    {/* +1 floating text */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl sm:text-7xl md:text-8xl font-black text-emerald-400 animate-bounce drop-shadow-[0_0_30px_rgba(16,185,129,0.8)]">
                        +1
                    </div>

                    {/* Particles effect */}
                    <div className="absolute left-1/2 bottom-40 -translate-x-1/2">
                        <div className="relative">
                            <span className="absolute -left-10 animate-ping text-2xl">🍃</span>
                            <span className="absolute -right-10 animate-ping text-2xl delay-100">🍃</span>
                            <span className="absolute -left-5 -top-5 animate-ping text-xl delay-200">✨</span>
                            <span className="absolute -right-5 -top-5 animate-ping text-xl delay-300">✨</span>
                        </div>
                    </div>
                </div>
            )}

            {/* COUNTDOWN OVERLAY */}
            {countdown !== null && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="text-6xl sm:text-7xl md:text-9xl font-black text-white drop-shadow-[0_0_50px_rgba(16,185,129,0.8)] animate-bounce">
                        {countdown === 0 ? 'GO!' : countdown}
                    </div>
                </div>
            )}

            {/* FOREGROUND: HUD & Webcam Overlay */}
            {/* We use pointer-events-none on the container so clicks pass through to game (if interactive) or buttons */}
            <div className="absolute inset-0 z-10 flex flex-col justify-between pointer-events-none">

                {/* TOP HUD */}
                <div className="flex justify-end md:justify-between items-start p-2 sm:p-4 md:p-8 pt-14 sm:pt-16 md:pt-8 bg-gradient-to-b from-black/60 to-transparent" style={{ paddingTop: 'max(56px, calc(env(safe-area-inset-top) + 40px))' }}>
                    {/* Score Board - Centered or Left */}
                    <div className="flex flex-col text-white pointer-events-auto mr-auto ml-2 sm:ml-4 md:ml-0">
                        <h1 className="hidden sm:block text-lg sm:text-xl md:text-3xl font-bold text-emerald-300 drop-shadow-md tracking-wider">SQUAT CLIMBER</h1>
                        <div className="mt-1 sm:mt-2 flex items-baseline gap-1 sm:gap-2">
                            <span className="text-4xl sm:text-5xl md:text-6xl font-mono font-bold text-white drop-shadow-xl">{squatData.count}</span>
                            <span className="text-xs sm:text-sm font-semibold opacity-80 uppercase">Squats</span>
                        </div>
                        <div className={`mt-1 inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border ${squatData.isSquatting ? 'bg-green-500/20 border-green-400 text-green-300' : 'bg-blue-500/20 border-blue-400 text-blue-200'}`}>
                            {squatData.isSquatting ? '⬇️ DOWN' : '⬆️ UP'}
                        </div>
                    </div>
                </div>

                {/* BOTTOM HUD */}
                <div
                    className="flex flex-col-reverse md:flex-row justify-between items-center p-3 sm:p-4 md:p-8 gap-2 sm:gap-4 pointer-events-auto bg-gradient-to-t from-black/70 to-transparent"
                    style={{ paddingBottom: 'max(48px, calc(env(safe-area-inset-bottom) + 32px))' }}
                >

                    {/* Game Controls */}
                    <div className="w-full md:w-auto flex justify-center md:justify-start mb-2 sm:mb-0">
                        {gameState === GameState.IDLE ? (
                            <button
                                onClick={startCountdown}
                                disabled={isLoading}
                                className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm sm:text-base md:text-lg font-bold py-3 sm:py-4 px-6 sm:px-8 md:px-12 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)] transform transition hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'LOADING...' : 'START'}
                            </button>
                        ) : gameState === GameState.PLAYING ? (
                            <button
                                onClick={stopGame}
                                className="bg-red-500 hover:bg-red-400 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 md:px-8 rounded-full shadow-lg transform transition hover:scale-105 text-sm sm:text-base"
                            >
                                FINISH
                            </button>
                        ) : gameState === GameState.LOADING && countdown !== null ? (
                            <div className="text-white font-bold animate-pulse text-lg sm:text-xl md:text-2xl">GET READY...</div>
                        ) : (
                            <button
                                onClick={startCountdown}
                                className="bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 md:px-8 rounded-full shadow-lg transform transition hover:scale-105 text-sm sm:text-base"
                            >
                                PLAY AGAIN
                            </button>
                        )}
                    </div>


                </div>
            </div>
        </div>
    );
};

export default SquatClimberGame;