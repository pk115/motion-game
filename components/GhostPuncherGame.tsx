import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { usePunchDetection } from '../hooks/usePunchDetection';
import GhostPuncherVisuals from './GhostPuncherVisuals';
import { GameState } from '../types';
import { useAuth } from '../src/contexts/AuthContext';
import { saveScore } from '../src/services/dbService';

// ============================================
// Ghost Puncher Game
// ต่อยผี! 👻🥊
// ============================================

type GhostPosition = 'top' | 'left' | 'right' | 'bottom' | 'center';
type PunchType = 'straight' | 'hook' | 'uppercut' | 'none';

interface Ghost {
    id: number;
    position: GhostPosition;
    requiredPunch: PunchType;
    opacity: number;
    hit: boolean;
    spawnTime: number;
}

interface GhostPuncherGameProps {
    onBack: () => void;
}

const GHOST_LIFETIME = 3000; // 3 seconds to punch

const GhostPuncherGame: React.FC<GhostPuncherGameProps> = ({ onBack }) => {
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoElementRef = useRef<HTMLVideoElement>(null);

    const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
    const [countdown, setCountdown] = useState<number | null>(null);

    // Game state
    const [score, setScore] = useState(0);
    const [ghosts, setGhosts] = useState<Ghost[]>([]);
    const [ghostsHit, setGhostsHit] = useState(0);
    const [ghostsMissed, setGhostsMissed] = useState(0);
    const [showGameOver, setShowGameOver] = useState(false);

    const isRunning = gameState === GameState.PLAYING;
    const gameLoopRef = useRef<number>();

    // Set-based workout pattern tracking
    // เรียงเป็นชุด: Hook 10 ครั้ง → Straight 10 ครั้ง → Uppercut 10 ครั้ง → วนซ้ำ
    const PUNCHES_PER_SET = 10;
    const PUNCH_SEQUENCE: PunchType[] = ['hook', 'straight', 'uppercut'];
    const spawnCountRef = useRef(0); // นับจำนวนผีที่เกิดในเซตปัจจุบัน
    const [currentSetIndex, setCurrentSetIndex] = useState(0); // 0=hook, 1=straight, 2=uppercut

    // Audio refs
    const bgMusicRef = useRef<HTMLAudioElement | null>(null);
    const punchSoundRef = useRef<HTMLAudioElement | null>(null);
    const ghostDeadSoundRef = useRef<HTMLAudioElement | null>(null);
    const gameOverSoundRef = useRef<HTMLAudioElement | null>(null);

    // Sync webcam ref
    useEffect(() => {
        if (webcamRef.current && webcamRef.current.video) {
            videoElementRef.current = webcamRef.current.video;
        }
    }, [webcamRef.current, gameState]);

    const { punchData, isLoading, resetCount } = usePunchDetection(videoElementRef, canvasRef, isRunning);
    const { user } = useAuth();

    // Initialize audio
    useEffect(() => {
        bgMusicRef.current = new Audio('/sounds/ghostspubcher/music.mp3');
        bgMusicRef.current.loop = true;
        bgMusicRef.current.volume = 0.3;

        punchSoundRef.current = new Audio('/sounds/ghostspubcher/punch.mp3');
        punchSoundRef.current.volume = 0.5;

        ghostDeadSoundRef.current = new Audio('/sounds/ghostspubcher/gostdead.mp3');
        ghostDeadSoundRef.current.volume = 0.6;

        gameOverSoundRef.current = new Audio('/sounds/ghostspubcher/gameover.mp3');
        gameOverSoundRef.current.volume = 0.5;

        return () => {
            if (bgMusicRef.current) {
                bgMusicRef.current.pause();
                bgMusicRef.current = null;
            }
        };
    }, []);

    // Start music
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

    const playPunchSound = useCallback(() => {
        if (punchSoundRef.current) {
            punchSoundRef.current.currentTime = 0;
            punchSoundRef.current.play().catch(() => { });
        }
    }, []);

    const playGhostDeadSound = useCallback(() => {
        if (ghostDeadSoundRef.current) {
            ghostDeadSoundRef.current.currentTime = 0;
            ghostDeadSoundRef.current.play().catch(() => { });
        }
    }, []);

    const playGameOverSound = useCallback(() => {
        if (gameOverSoundRef.current) {
            gameOverSoundRef.current.currentTime = 0;
            gameOverSoundRef.current.play().catch(() => { });
        }
    }, []);

    // Spawn ghosts - เรียงเป็นชุด (Hook 10 → Straight 10 → Uppercut 10 → วนซ้ำ)
    const spawnGhost = useCallback(() => {
        // หาประเภทหมัดปัจจุบันจากลำดับ
        const currentPunchType = PUNCH_SEQUENCE[currentSetIndex % PUNCH_SEQUENCE.length];

        // กำหนดตำแหน่งผีตามประเภทหมัด
        let position: GhostPosition;
        switch (currentPunchType) {
            case 'hook':
                // สลับซ้าย-ขวา
                position = spawnCountRef.current % 2 === 0 ? 'left' : 'right';
                break;
            case 'straight':
                // สลับบน-กลาง
                position = spawnCountRef.current % 2 === 0 ? 'top' : 'center';
                break;
            case 'uppercut':
                // ล่างเสมอ
                position = 'bottom';
                break;
            default:
                position = 'center';
        }

        const newGhost: Ghost = {
            id: Date.now(),
            position,
            requiredPunch: currentPunchType,
            opacity: 0.9,
            hit: false,
            spawnTime: Date.now()
        };

        setGhosts(prev => [...prev, newGhost]);

        // เพิ่ม counter
        spawnCountRef.current++;

        // ถ้าครบ 10 ครั้ง เปลี่ยนเซต
        if (spawnCountRef.current >= PUNCHES_PER_SET) {
            spawnCountRef.current = 0;
            setCurrentSetIndex(prev => prev + 1);
        }
    }, [currentSetIndex]);

    // Game loop - spawn ghosts and check expiry
    useEffect(() => {
        if (!isRunning) return;

        let lastSpawn = Date.now();
        const spawnInterval = 2000; // New ghost every 2 seconds

        const gameLoop = () => {
            const now = Date.now();

            // Spawn new ghost
            if (now - lastSpawn > spawnInterval) {
                spawnGhost();
                lastSpawn = now;
            }

            // Remove expired ghosts and count misses
            setGhosts(prev => {
                const expired = prev.filter(g => !g.hit && now - g.spawnTime > GHOST_LIFETIME);
                if (expired.length > 0) {
                    setGhostsMissed(m => m + expired.length);
                }
                return prev.filter(g => g.hit || now - g.spawnTime <= GHOST_LIFETIME);
            });

            gameLoopRef.current = requestAnimationFrame(gameLoop);
        };

        gameLoopRef.current = requestAnimationFrame(gameLoop);

        return () => {
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        };
    }, [isRunning, spawnGhost]);

    // Check punch hits
    useEffect(() => {
        if (!isRunning || !punchData.isPunching) return;

        const currentPunch = punchData.lastPunch;
        if (currentPunch === 'none') return;

        // Find matching ghost
        setGhosts(prev => {
            // Find matching ghost - simpler matching now
            const hitGhost = prev.find(g => !g.hit && g.requiredPunch === currentPunch);

            if (hitGhost) {
                playPunchSound();
                playGhostDeadSound();
                setGhostsHit(h => h + 1);

                // ต่อยโดน = 1 คะแนน (ไม่มี combo bonus)
                setScore(s => s + 1);

                return prev.map(g => g.id === hitGhost.id ? { ...g, hit: true } : g);
            }

            return prev;
        });
    }, [isRunning, punchData.isPunching, punchData.lastPunch, playPunchSound, playGhostDeadSound]);

    // No game over - เล่นได้เรื่อยๆ (ลบ game over check ออก)

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
        setGhosts([]);
        setGhostsHit(0);
        setGhostsMissed(0);
        setShowGameOver(false);
        // Reset set tracking
        spawnCountRef.current = 0;
        setCurrentSetIndex(0);
        setGameState(GameState.PLAYING);

        if (bgMusicRef.current) {
            bgMusicRef.current.play().catch(() => { });
        }
    };

    const stopGame = async () => {
        setGameState(GameState.PAUSED);
        setShowGameOver(true);

        if (bgMusicRef.current) bgMusicRef.current.pause();
        playGameOverSound();

        if (user && score > 0) {
            await saveScore(user, score, 'cumulative', 'ghost');
            await saveScore(user, ghostsHit, 'endurance', 'ghost');
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
                className="absolute top-2 right-2 sm:top-4 sm:right-4 z-40 bg-black rounded-xl sm:rounded-2xl overflow-hidden border-2 border-red-500/50 shadow-2xl group"
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
                <canvas ref={canvasRef} className="absolute w-full h-full object-cover z-10 pointer-events-none" />

                {/* Punch count on PiP */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-0.5 text-center">
                    <span className="text-[10px] sm:text-xs text-white font-bold">🥊 {punchData.punchCount}</span>
                </div>
            </div>

            {/* Game Visuals */}
            <div className="absolute inset-0 z-0">
                <GhostPuncherVisuals
                    score={score}
                    combo={punchData.combo}
                    ghosts={ghosts}
                    lastPunch={punchData.lastPunch}
                    isPunching={punchData.isPunching}
                    leftWristPos={punchData.leftWristPos}
                    rightWristPos={punchData.rightWristPos}
                />
            </div>

            {/* Ghosts Hit Counter + Current Set Indicator - Mobile Responsive */}
            {isRunning && (
                <div
                    className="absolute top-2 left-2 sm:top-4 sm:left-4 z-30 space-y-2"
                    style={{ marginTop: 'calc(env(safe-area-inset-top) + 40px)' }}
                >
                    {/* Current Set Indicator */}
                    <div className="bg-black/60 backdrop-blur-lg rounded-lg sm:rounded-xl px-2 py-1 sm:px-4 sm:py-2 border border-orange-500/30">
                        <div className="text-[10px] sm:text-xs text-orange-300">เซตปัจจุบัน</div>
                        <div className="text-sm sm:text-lg font-bold text-orange-400 flex items-center gap-1">
                            <span>
                                {PUNCH_SEQUENCE[currentSetIndex % PUNCH_SEQUENCE.length] === 'hook' && '🤜 HOOK'}
                                {PUNCH_SEQUENCE[currentSetIndex % PUNCH_SEQUENCE.length] === 'straight' && '👊 STRAIGHT'}
                                {PUNCH_SEQUENCE[currentSetIndex % PUNCH_SEQUENCE.length] === 'uppercut' && '✊ UPPERCUT'}
                            </span>
                            <span className="text-xs sm:text-sm text-orange-300">
                                {spawnCountRef.current}/{PUNCHES_PER_SET}
                            </span>
                        </div>
                    </div>

                    {/* Ghosts Hit Counter */}
                    <div className="bg-black/60 backdrop-blur-lg rounded-lg sm:rounded-xl px-2 py-1 sm:px-4 sm:py-2 border border-green-500/30">
                        <div className="text-[10px] sm:text-xs text-green-300">ต่อยโดน</div>
                        <div className="text-lg sm:text-2xl font-bold text-green-400">👻 {ghostsHit}</div>
                    </div>
                </div>
            )}

            {/* Countdown Overlay */}
            {countdown !== null && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="text-6xl sm:text-7xl md:text-9xl font-black text-white drop-shadow-[0_0_50px_rgba(239,68,68,0.8)] animate-bounce">
                        {countdown === 0 ? '👊FIGHT!' : countdown}
                    </div>
                </div>
            )}

            {/* Start Screen */}
            {(gameState === GameState.IDLE || gameState === GameState.PAUSED) && !showGameOver && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="text-center space-y-6">
                        <div className="text-6xl mb-4">👻🥊</div>
                        <h2 className="text-3xl sm:text-4xl font-black text-white">Ghost Puncher</h2>
                        <p className="text-cyan-200 max-w-xs mx-auto">
                            Punch the ghosts before they escape!<br />
                            Match your punch to the ghost position!
                        </p>
                        <div className="text-sm text-cyan-300 space-y-1">
                            <div>👊 Top/Center → Straight Punch</div>
                            <div>🤜🤛 Sides → Hook Punch</div>
                            <div>✊ Bottom → Uppercut</div>
                        </div>
                        <button
                            onClick={startCountdown}
                            disabled={isLoading}
                            className="px-8 py-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white font-black text-xl rounded-full shadow-lg transition-all disabled:opacity-50"
                        >
                            {isLoading ? 'Loading...' : '🥊 FIGHT!'}
                        </button>
                    </div>
                </div>
            )}

            {/* Game Over Modal */}
            {showGameOver && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-800/90 rounded-3xl p-8 text-center max-w-sm mx-4 border border-red-500/30">
                        <div className="text-6xl mb-4">👻💀</div>
                        <h2 className="text-3xl font-black text-red-400 mb-2">Game Over!</h2>

                        <div className="bg-black/30 rounded-xl p-4 mb-6 space-y-3">
                            <div>
                                <div className="text-sm text-slate-400 uppercase">Score</div>
                                <div className="text-4xl font-black text-white font-mono">{score}</div>
                            </div>
                            <div className="flex justify-around">
                                <div>
                                    <div className="text-xs text-slate-400">Ghosts Hit</div>
                                    <div className="text-2xl font-bold text-green-400">{ghostsHit}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400">Max Combo</div>
                                    <div className="text-2xl font-bold text-orange-400">{punchData.combo}</div>
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
                                className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white font-bold rounded-full transition-all"
                            >
                                Fight Again
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

export default GhostPuncherGame;
