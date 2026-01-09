import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useTrainDodge } from '../src/hooks/useTrainDodge'; // Reusing logic hook as "Lane Dodge" logic is same
import BombVisuals from './BombVisuals';
import { GameState } from '../types';
import { useAuth } from '../src/contexts/AuthContext';
import { saveScore } from '../src/services/dbService';

interface Props {
  onBack: () => void;
}

type Lane = 'left' | 'center' | 'right';

const TrainDodgeGame: React.FC<Props> = ({ onBack }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null);

  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [countdown, setCountdown] = useState<number | null>(null);

  const isRunning = gameState === GameState.PLAYING;

  // Audio refs
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const boomSoundRef = useRef<HTMLAudioElement | null>(null);
  const cashSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    bgMusicRef.current = new Audio('/sounds/bombdodge/mousic.mp3');
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.2;

    boomSoundRef.current = new Audio('/sounds/bombdodge/boom.mp3');
    boomSoundRef.current.volume = 0.6;

    cashSoundRef.current = new Audio('/sounds/bombdodge/cash.mp3');
    cashSoundRef.current.volume = 0.5;

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
      audioRef.current.play().catch(() => { });
    }
  }, []);

  // Game Loop Logic
  // Instead of Z (depth), we use Y (0 top to 100 bottom)
  const [bombs, setBombs] = useState<Array<{ id: number, lane: Lane, y: number }>>([]);
  const [coins, setCoins] = useState<Array<{ id: number, lane: Lane, y: number }>>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const animRef = useRef<number>();
  const lastSpawnTime = useRef(0);
  const gameSpeed = useRef(0.45); // Even faster starting speed
  const recentBombLanesRef = useRef<Lane[]>([]); // Track recent bomb lanes to ensure safe path

  const { gameState: trackerState, isLoading, resetGame: resetTracker } = useTrainDodge(videoElementRef, canvasRef, isRunning);
  const { user } = useAuth();
  const [showGameOver, setShowGameOver] = useState(false);

  // Use ref to access latest tracking state inside loop
  const playerLaneRef = useRef(trackerState.playerLane);
  useEffect(() => { playerLaneRef.current = trackerState.playerLane; }, [trackerState.playerLane]);
  // Refs for stable access inside game loop
  const gameStateRef = useRef(gameState);
  const scoreRef = useRef(score);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  // Game Loop - Stable function using refs
  const gameLoopRef = useRef<(time: number) => void>();
  gameLoopRef.current = (time: number) => {
    if (gameStateRef.current !== GameState.PLAYING) return;

    // Difficulty scaling - spawn rates (MORE spacing between items)
    const currentScore = scoreRef.current;
    let spawnInterval = 1600; // More spacing between items (was 1200)
    if (currentScore > 30) spawnInterval = 1400;
    if (currentScore > 80) spawnInterval = 1200;
    if (currentScore > 150) spawnInterval = 1000;
    if (currentScore > 300) spawnInterval = 800;

    // Speed increases gradually (MUCH faster fall speed)
    if (currentScore > 30) gameSpeed.current = 0.55;
    if (currentScore > 80) gameSpeed.current = 0.65;
    if (currentScore > 150) gameSpeed.current = 0.75;
    if (currentScore > 300) gameSpeed.current = 0.90;

    // Spawn objects
    if (time - lastSpawnTime.current > spawnInterval) {
      const lanes: Lane[] = ['left', 'center', 'right'];

      // 55% chance for bomb, 45% chance for coin
      const isBomb = Math.random() < 0.55;

      if (isBomb) {
        // ============================================
        // LOGIC: ให้มีช่องหลบเสมอ
        // ============================================
        // ดู lane ที่มี bomb อยู่ใกล้ๆ (y < 40) - เหลือ lane ไหนว่าง
        const activeBombLanes = new Set<Lane>();
        // Get current bombs that are still in dangerous zone
        // We need to check the current state, but we're in a callback
        // So we'll track recent spawned bomb lanes instead

        // Get safe lanes (lanes that DON'T have recent bombs)
        const recentLanes = recentBombLanesRef.current;

        // If we already have bombs in 2 lanes, only spawn in those lanes or coin
        let availableLanes = lanes.filter(l => !recentLanes.includes(l));

        // If no available lanes (all 3 have recent bombs), clear history and pick random
        if (availableLanes.length === 0) {
          recentBombLanesRef.current = [];
          availableLanes = lanes;
        }

        // Pick random lane from available
        const bombLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];

        // Add to recent bombs (keep only last 2)
        recentBombLanesRef.current.push(bombLane);
        if (recentBombLanesRef.current.length > 2) {
          recentBombLanesRef.current.shift();
        }

        setBombs(prev => [...prev, { id: Date.now() + Math.random(), lane: bombLane, y: -10 }]);
      } else {
        // Coin - spawn in random lane (prefer lane without recent bombs for player convenience)
        const safeLanes = lanes.filter(l => !recentBombLanesRef.current.includes(l));
        const coinLane = safeLanes.length > 0
          ? safeLanes[Math.floor(Math.random() * safeLanes.length)]
          : lanes[Math.floor(Math.random() * lanes.length)];
        setCoins(prev => [...prev, { id: Date.now() + Math.random(), lane: coinLane, y: -10 }]);
      }

      lastSpawnTime.current = time;
    }

    // Move Objects
    const speed = gameSpeed.current;

    setBombs(prev => {
      const next: Array<{ id: number; lane: Lane; y: number }> = [];
      let hpLost = 0;

      for (let b of prev) {
        const newY = b.y + speed;
        if (newY > 85 && newY < 92) { // Narrower hitbox for player
          if (b.lane === playerLaneRef.current) {
            hpLost++;
            continue;
          }
        }
        if (newY < 110) next.push({ ...b, y: newY });
      }

      if (hpLost > 0) {
        setLives(l => {
          const newLives = l - hpLost;
          return newLives;
        });
        // Play boom sound
        playSound(boomSoundRef);
      }
      return next;
    });

    setCoins(prev => {
      const next: Array<{ id: number; lane: Lane; y: number }> = [];
      let scoreGain = 0;
      for (let c of prev) {
        const newY = c.y + speed;
        if (newY > 85 && newY < 92) { // Narrower hitbox for player
          if (c.lane === playerLaneRef.current) {
            scoreGain += 10;
            continue;
          }
        }
        if (newY < 110) next.push({ ...c, y: newY });
      }
      if (scoreGain > 0) {
        setScore(s => s + scoreGain);
        // Play cash sound
        playSound(cashSoundRef);
      }
      return next;
    });
    // Note: NO requestAnimationFrame call here - the useEffect handles the loop
  };

  useEffect(() => {
    if (lives <= 0 && gameState === GameState.PLAYING) {
      setGameState(GameState.PAUSED);
      setShowGameOver(true);
    }
  }, [lives, gameState]);

  useEffect(() => {
    if (showGameOver && user && score > 0) {
      saveScore(user, score, 'cumulative', 'train');
      saveScore(user, score, 'endurance', 'train');
    }
  }, [showGameOver, user]);

  // Start/Stop Game Loop - ONLY depends on gameState
  useEffect(() => {
    let animationFrameId: number;

    if (gameState === GameState.PLAYING) {
      const loop = (time: number) => {
        gameLoopRef.current?.(time);
        animationFrameId = requestAnimationFrame(loop);
      };
      animationFrameId = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState]); // Stable dependency - only restarts when gameState changes

  const startCountdown = () => {
    setShowGameOver(false);
    setGameState(GameState.LOADING);
    let count = 3;
    setCountdown(count);
    const interval = setInterval(() => {
      count--;
      if (count > 0) setCountdown(count);
      else if (count === 0) setCountdown(0);
      else {
        clearInterval(interval);
        setCountdown(null);
        setScore(0);
        setLives(3);
        setBombs([]);
        setCoins([]);
        gameSpeed.current = 0.15; // Reset speed
        resetTracker();
        setGameState(GameState.PLAYING);
      }
    }, 1000);
  };

  // ... (render) ...

  return (
    <div className="game-screen relative h-screen w-screen overflow-hidden bg-slate-900 font-sans text-white">
      {/* Game Visuals - z-20 to be above background, below HUD */}
      <div className="absolute inset-0 z-20">
        <BombVisuals
          playerLane={trackerState.playerLane}
          bombs={bombs}
          coins={coins}
        />
      </div>

      {/* Back Button */}
      <button
        onClick={onBack}
        className="absolute top-2 left-2 sm:top-4 sm:left-4 z-50 bg-black/30 p-2 sm:p-3 rounded-full border border-white/20"
        style={{ marginTop: 'env(safe-area-inset-top)' }}
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
      </button>

      {/* Score Panel - Top Right with Portrait Camera */}
      <div
        className="absolute top-2 right-2 sm:top-4 sm:right-4 z-40 bg-black/50 p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl backdrop-blur-md border border-white/10 flex flex-col items-end gap-1 sm:gap-2"
        style={{ marginTop: 'env(safe-area-inset-top)' }}
      >
        <div className="text-xl sm:text-2xl md:text-3xl font-black text-yellow-400 drop-shadow-md">
          ${score}
        </div>
        <div className="flex gap-0.5 sm:gap-1">
          {lives > 0 ? (
            [...Array(Math.max(0, lives))].map((_, i) => <span key={i} className="text-lg sm:text-xl md:text-2xl">❤️</span>)
          ) : (
            <span className="text-lg sm:text-xl md:text-2xl">💀</span>
          )}
        </div>
        {/* Camera - Use native camera FOV */}
        <div
          className="rounded-lg overflow-hidden border border-white/20 relative bg-black"
          style={{
            width: 'clamp(64px, 18vw, 128px)',
            aspectRatio: typeof window !== 'undefined' && window.innerWidth < 640 ? '3/4' : '4/3'
          }}
        >
          <Webcam
            ref={webcamRef}
            className="w-full h-full object-cover scale-x-[-1]"
            mirrored={true}
            audio={false}
            videoConstraints={{
              facingMode: "user",
              // Use wide resolution for better body tracking
              width: { ideal: 640 },
              height: { ideal: 480 }
            }}
            disablePictureInPicture={true}
            forceScreenshotSourceSize={true}
            imageSmoothing={true}
            screenshotFormat="image/jpeg"
            screenshotQuality={1}
            onUserMediaError={() => { }}
            onUserMedia={() => {
              if (webcamRef.current?.video) {
                // @ts-ignore
                videoElementRef.current = webcamRef.current.video;
              }
            }}
          />
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full scale-x-[-1]" />
        </div>
      </div>

      {/* UI Controls */}
      <div
        className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
        style={{ paddingBottom: 'max(48px, calc(env(safe-area-inset-bottom) + 32px))' }}
      >

        {/* START SCREEN */}
        {gameState === GameState.IDLE && !showGameOver && (
          <div className="bg-slate-900/90 p-5 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-orange-500/50 backdrop-blur-xl text-center pointer-events-auto max-w-[90vw] sm:max-w-md md:max-w-lg shadow-[0_0_50px_rgba(249,115,22,0.3)]">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black mb-2 sm:mb-4 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 drop-shadow-sm">BOMB DODGE</h1>
            <p className="text-orange-200 text-sm sm:text-base md:text-lg mb-4 sm:mb-6 md:mb-8 leading-relaxed">
              Bombs are falling! <br />
              Move <strong>Left</strong> and <strong>Right</strong>. <br />
              <span className="hidden sm:inline">Avoid <span className="text-red-400 font-bold">BOMBS</span>. Catch <span className="text-yellow-400 font-bold">COINS</span>.</span>
            </p>
            <button onClick={startCountdown} className="px-6 sm:px-10 md:px-12 py-3 sm:py-4 md:py-5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 rounded-full font-bold text-base sm:text-xl md:text-2xl shadow-xl transition-transform hover:scale-105 border border-white/20">
              🚀 START MISSION
            </button>
          </div>
        )}

        {/* GAME OVER MODAL */}
        {showGameOver && (
          <div className="bg-slate-900/95 p-6 sm:p-10 md:p-12 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-red-500/50 backdrop-blur-2xl text-center pointer-events-auto max-w-[90vw] sm:max-w-sm md:max-w-md shadow-[0_0_100px_rgba(239,68,68,0.5)] transform animate-in fade-in zoom-in duration-300">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-1 sm:mb-2 tracking-wider">MISSION FAILED</h2>
            <div className="text-base sm:text-lg md:text-xl text-red-200 uppercase tracking-widest mb-4 sm:mb-6 md:mb-8">Base Destroyed</div>

            <div className="bg-black/40 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 md:mb-8 border border-white/10">
              <div className="text-xs sm:text-sm text-slate-400 uppercase tracking-wide mb-1">Final Score</div>
              <div className="text-4xl sm:text-5xl md:text-6xl font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                {score}
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3 md:gap-4 justify-center">
              <button onClick={startCountdown} className="flex-1 px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 bg-emerald-600 hover:bg-emerald-500 rounded-lg sm:rounded-xl font-bold text-sm sm:text-lg md:text-xl transition-transform hover:scale-105 shadow-lg border border-white/10">
                🔄 RETRY
              </button>
              <button onClick={onBack} className="flex-1 px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 bg-slate-700 hover:bg-slate-600 rounded-lg sm:rounded-xl font-bold text-sm sm:text-lg md:text-xl transition-transform hover:scale-105 shadow-lg border border-white/10">
                🏠 MENU
              </button>
            </div>
          </div>
        )}

        {/* COUNTDOWN OVERLAY */}
        {countdown !== null && (
          <div className="text-6xl sm:text-7xl md:text-9xl font-black text-red-500 animate-ping drop-shadow-[0_0_20px_rgba(239,68,68,1)]">
            {countdown === 0 ? 'DODGE!' : countdown}
          </div>
        )}
      </div>

    </div>
  );
};

export default TrainDodgeGame;