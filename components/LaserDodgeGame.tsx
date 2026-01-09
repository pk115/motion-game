import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useTorsoTwist } from '../hooks/useTorsoTwist';
import LaserDodgeVisuals from './LaserDodgeVisuals';
import { GameState } from '../types';
import { useAuth } from '../src/contexts/AuthContext';
import { saveScore } from '../src/services/dbService';

// ============================================
// Laser Dodge Game - Torso Twist
// หมุนตัวหลบเลเซอร์! 💃⚡
// ============================================

type MonsterSide = 'left' | 'right';

interface Monster {
    id: number;
    side: MonsterSide;  // Which side the monster appears from
    isActive: boolean;   // Is currently showing/threatening
    dodged: boolean;
    hit: boolean;
    scored: boolean;
    spawnTime: number;   // When it spawned
}

interface LaserDodgeGameProps {
    onBack: () => void;
}

const MONSTER_DURATION = 2000; // How long monster stays visible (ms)
const MONSTER_SPAWN_INTERVAL = 2500; // Time between spawns

const LaserDodgeGame: React.FC<LaserDodgeGameProps> = ({ onBack }) => {
    const webcamRef = useRef<Webcam>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoElementRef = useRef<HTMLVideoElement>(null);

    const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
    const [countdown, setCountdown] = useState<number | null>(null);

    // Game state
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(0);
    const [monsters, setMonsters] = useState<Monster[]>([]);
    const [health, setHealth] = useState(100);
    const [perfectDodges, setPerfectDodges] = useState(0);
    const [showGameOver, setShowGameOver] = useState(false);
    const [nextSide, setNextSide] = useState<MonsterSide>('left'); // Alternating spawn

    const isRunning = gameState === GameState.PLAYING;
    const gameLoopRef = useRef<number>();

    // Audio refs
    const bgMusicRef = useRef<HTMLAudioElement | null>(null);
    const dodgeSoundRef = useRef<HTMLAudioElement | null>(null);
    const hitSoundRef = useRef<HTMLAudioElement | null>(null);
    const zombieSpawnRef = useRef<HTMLAudioElement | null>(null);
    const gameOverSoundRef = useRef<HTMLAudioElement | null>(null);

    // Sync webcam ref
    useEffect(() => {
        if (webcamRef.current && webcamRef.current.video) {
            videoElementRef.current = webcamRef.current.video;
        }
    }, [webcamRef.current, gameState]);

    const { twistData, isLoading, resetCount } = useTorsoTwist(videoElementRef, canvasRef, isRunning);
    const { user } = useAuth();

    // Refs to avoid recreating game loop on every twist/combo change
    const twistDataRef = useRef(twistData);
    const comboRef = useRef(combo);

    // Update refs when values change (but don't restart game loop)
    useEffect(() => {
        twistDataRef.current = twistData;
    }, [twistData]);

    useEffect(() => {
        comboRef.current = combo;
    }, [combo]);

    // Initialize audio
    useEffect(() => {
        bgMusicRef.current = new Audio('/sounds/ninjadodge/music.mp3');
        bgMusicRef.current.loop = true;
        bgMusicRef.current.volume = 0.3;

        dodgeSoundRef.current = new Audio('/sounds/ninjadodge/dodge.mp3');
        dodgeSoundRef.current.volume = 0.4;

        hitSoundRef.current = new Audio('/sounds/ninjadodge/gameover.mp3');
        hitSoundRef.current.volume = 0.3;

        zombieSpawnRef.current = new Audio('/sounds/ninjadodge/openzombe.mp3');
        zombieSpawnRef.current.volume = 0.4;

        gameOverSoundRef.current = new Audio('/sounds/ninjadodge/gameover.mp3');
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

    const playSound = useCallback((ref: React.RefObject<HTMLAudioElement>) => {
        if (ref.current) {
            ref.current.currentTime = 0;
            ref.current.play().catch(() => { });
        }
    }, []);

    // Spawn monsters (alternating sides)
    const spawnMonster = useCallback(() => {
        const newMonster: Monster = {
            id: Date.now(),
            side: nextSide,
            isActive: true,
            dodged: false,
            hit: false,
            scored: false,
            spawnTime: Date.now()
        };

        setMonsters(prev => [...prev, newMonster]);

        // Play zombie spawn sound
        playSound(zombieSpawnRef);

        // Alternate side for next spawn
        setNextSide(nextSide === 'left' ? 'right' : 'left');
    }, [nextSide, playSound]);

    // Game loop
    useEffect(() => {
        if (!isRunning) return;

        let lastSpawn = Date.now();

        const gameLoop = () => {
            const now = Date.now();

            // Spawn new monster - CONSISTENT INTERVAL (no speed increase)
            if (now - lastSpawn > MONSTER_SPAWN_INTERVAL) {
                spawnMonster();
                lastSpawn = now;
            }

            // Update monsters and check collisions
            setMonsters(prev => {
                return prev.map(monster => {
                    if (monster.scored) return monster;

                    const timeAlive = now - monster.spawnTime;

                    // Monster disappears after MONSTER_DURATION
                    if (timeAlive > MONSTER_DURATION && monster.isActive) {
                        // Monster is disappearing - check if player dodged
                        if (!monster.scored) {
                            const playerDir = twistDataRef.current.twistDirection;
                            const intensity = twistDataRef.current.twistIntensity;
                            const isPerfect = twistDataRef.current.isPerfectDodge;

                            // Monster from LEFT = need to twist LEFT to dodge (บิดตัวไปทางซ้าย)
                            // Monster from RIGHT = need to twist RIGHT to dodge (บิดตัวไปทางขวา)
                            // NOTE: Swapped because camera detection is mirrored
                            let dodged = false;
                            let perfect = false;

                            // intensity > 0.2 หมายถึง twist > 30° (normal dodge threshold)
                            if (monster.side === 'left' && playerDir === 'left' && intensity > 0.2) {
                                dodged = true;
                                perfect = isPerfect; // isPerfectDodge = twist > 50°
                            } else if (monster.side === 'right' && playerDir === 'right' && intensity > 0.2) {
                                dodged = true;
                                perfect = isPerfect;
                            }

                            if (dodged) {
                                playSound(dodgeSoundRef);

                                // Simple scoring: 1 point per dodge
                                setScore(s => s + 1);

                                // Increment combo
                                const newCombo = comboRef.current + 1;
                                setCombo(newCombo);

                                // Track perfect dodges
                                if (perfect) {
                                    setPerfectDodges(p => p + 1);
                                }

                                // HP bonus every 10 combo (if HP < 100)
                                if (newCombo % 10 === 0) {
                                    setHealth(h => {
                                        if (h < 100) {
                                            return Math.min(100, h + 10); // +10 HP, max 100
                                        }
                                        return h;
                                    });
                                }

                                return { ...monster, dodged: true, scored: true, isActive: false };
                            } else {
                                // Didn't dodge - take damage
                                if (intensity > 0.1) {
                                    // Partial twist - minor damage
                                    setHealth(h => Math.max(0, h - 15));
                                } else {
                                    // No twist - full damage
                                    setHealth(h => Math.max(0, h - 25));
                                    playSound(hitSoundRef);
                                }
                                setCombo(0);
                                return { ...monster, hit: true, scored: true, isActive: false };
                            }
                        }
                    }

                    return monster;
                }).filter(monster => {
                    // Remove monsters that have been gone for a while
                    const timeAlive = now - monster.spawnTime;
                    return timeAlive < MONSTER_DURATION + 500; // Keep for a bit after disappearing
                });
            });

            gameLoopRef.current = requestAnimationFrame(gameLoop);
        };

        gameLoopRef.current = requestAnimationFrame(gameLoop);

        return () => {
            if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
        };
    }, [isRunning, spawnMonster, playSound]);

    // Check game over
    useEffect(() => {
        if (health <= 0 && gameState === GameState.PLAYING) {
            setGameState(GameState.PAUSED);
            setShowGameOver(true);

            if (bgMusicRef.current) bgMusicRef.current.pause();
            playSound(gameOverSoundRef);

            if (user && score > 0) {
                saveScore(user, score, 'cumulative', 'laser');
                saveScore(user, perfectDodges, 'endurance', 'laser');
            }
        }
    }, [health, gameState, score, perfectDodges, user, playSound]);

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
        setCombo(0);
        setMonsters([]);
        setNextSide('left'); // Start from left
        setHealth(100);
        setPerfectDodges(0);
        setShowGameOver(false);
        setGameState(GameState.PLAYING);

        if (bgMusicRef.current) {
            bgMusicRef.current.play().catch(() => { });
        }
    };

    const stopGame = async () => {
        setGameState(GameState.PAUSED);
        setShowGameOver(true);

        if (bgMusicRef.current) bgMusicRef.current.pause();
        playSound(gameOverSoundRef);

        if (user && score > 0) {
            await saveScore(user, score, 'cumulative', 'laser');
            await saveScore(user, perfectDodges, 'endurance', 'laser');
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

            {/* Webcam PiP */}
            <div
                className="absolute top-2 right-2 sm:top-4 sm:right-4 z-40 bg-black rounded-xl overflow-hidden border-2 border-pink-500/50 shadow-2xl"
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
                    videoConstraints={{
                        facingMode: "user",
                        width: { ideal: 640 },
                        height: { ideal: 480 }
                    }}
                    disablePictureInPicture={false}
                    forceScreenshotSourceSize={false}
                    imageSmoothing={true}
                    onUserMedia={() => { }}
                    onUserMediaError={() => { }}
                    screenshotFormat="image/jpeg"
                    screenshotQuality={0.92}
                    minScreenshotWidth={0}
                    minScreenshotHeight={0}
                />
                <canvas ref={canvasRef} className="absolute w-full h-full object-cover" />

                {/* Twist count on PiP */}
                <div className="absolute bottom-1 left-1 right-1 bg-black/60 rounded px-1 py-0.5 text-center">
                    <span className="text-xs text-white font-bold">🔄 {twistData.twistCount}</span>
                </div>
            </div>

            {/* Game Visuals */}
            <div className="absolute inset-0 z-0">
                <LaserDodgeVisuals
                    score={score}
                    combo={combo}
                    twistAngle={twistData.twistAngle}
                    twistDirection={twistData.twistDirection}
                    twistIntensity={twistData.twistIntensity}
                    monsters={monsters}
                    health={health}
                    perfectDodges={perfectDodges}
                />
            </div>

            {/* Countdown Overlay */}
            {countdown !== null && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="text-6xl sm:text-7xl md:text-9xl font-black text-white drop-shadow-[0_0_50px_rgba(139,92,246,0.8)] animate-bounce">
                        {countdown === 0 ? '🥷 GO!' : countdown}
                    </div>
                </div>
            )}

            {/* Start Screen */}
            {(gameState === GameState.IDLE || gameState === GameState.PAUSED) && !showGameOver && (
                <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm pb-24">
                    <div className="text-center space-y-6">
                        <div className="text-6xl mb-4">🥷👻</div>
                        <h2 className="text-3xl sm:text-4xl font-black text-white">Monster Dodge</h2>
                        <p className="text-indigo-200 max-w-xs mx-auto">
                            บิดตัวหลบมอนสเตอร์!<br />
                            บิดให้ลึกจะได้คะแนน Perfect!
                        </p>
                        <div className="text-sm text-indigo-300 space-y-1">
                            <div>👻 ผีจากซ้าย → บิดตัวซ้าย</div>
                            <div>👻 ผีจากขวา → บิดตัวขวา</div>
                            <div>✨ บิดลึก (&gt;50°) = Perfect Dodge!</div>
                        </div>
                        <button
                            onClick={startCountdown}
                            disabled={isLoading}
                            className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-black text-xl rounded-full shadow-lg transition-all disabled:opacity-50"
                        >
                            {isLoading ? 'Loading...' : '🥷 START!'}
                        </button>
                    </div>
                </div>
            )}

            {/* Stop Button */}
            {gameState === GameState.PLAYING && (
                <button
                    onClick={stopGame}
                    className="absolute bottom-10 left-4 z-40 px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white text-sm font-bold rounded-full shadow-lg transition-all border border-red-400/50"
                    style={{ marginBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
                >
                    ⏹ STOP
                </button>
            )}

            {/* Game Over Modal */}
            {showGameOver && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-800/90 rounded-3xl p-8 text-center max-w-sm mx-4 border border-indigo-500/30">
                        <div className="text-6xl mb-4">🥷💀</div>
                        <h2 className="text-3xl font-black text-indigo-400 mb-2">Mission Complete!</h2>

                        <div className="bg-black/30 rounded-xl p-4 mb-6 space-y-3">
                            <div>
                                <div className="text-sm text-slate-400 uppercase">Score</div>
                                <div className="text-4xl font-black text-white font-mono">{score}</div>
                            </div>
                            <div className="flex justify-around">
                                <div>
                                    <div className="text-xs text-slate-400">Perfect</div>
                                    <div className="text-2xl font-bold text-yellow-400">⭐ {perfectDodges}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400">Max Combo</div>
                                    <div className="text-2xl font-bold text-indigo-400">{combo}</div>
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
                                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold rounded-full transition-all"
                            >
                                Play Again
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LaserDodgeGame;

