import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useMosquitoCounter } from '../src/hooks/useMosquitoCounter';
import MosquitoSwarm from './MosquitoSwarm';
import { GameState } from '../types';
import { useAuth } from '../src/contexts/AuthContext';
import { saveScore } from '../src/services/dbService';

interface MosquitoGameProps {
  onBack: () => void;
}

const MosquitoGame: React.FC<MosquitoGameProps> = ({ onBack }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showSlapEffect, setShowSlapEffect] = useState(false);
  const lastCountRef = useRef(0);

  // Audio refs
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const slapSoundRef = useRef<HTMLAudioElement | null>(null);
  const comboSoundRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    // Background music from file
    bgMusicRef.current = new Audio('/sounds/mosqulto/music.mp3');
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.2;

    // Slap sound from file
    slapSoundRef.current = new Audio('/sounds/mosqulto/slap.mp3');
    slapSoundRef.current.volume = 0.6;

    // Combo sound - reuse slap with higher pitch effect
    comboSoundRef.current = new Audio('/sounds/mosqulto/slap.mp3');
    comboSoundRef.current.volume = 0.8;

    return () => {
      // Cleanup - stop music when component unmounts
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
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

  // React-Webcam Ref Logic
  const videoElementRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (webcamRef.current && webcamRef.current.video) {
      // @ts-ignore
      videoElementRef.current = webcamRef.current.video;
    }
  }, [webcamRef.current, gameState]);

  const { gameData, isLoading, resetCount } = useMosquitoCounter(videoElementRef, canvasRef, isRunning);
  const { user } = useAuth();

  // Start background music as soon as page loads (with user interaction fallback)
  useEffect(() => {
    const startMusic = () => {
      if (bgMusicRef.current && bgMusicRef.current.paused) {
        bgMusicRef.current.play().catch(() => { });
      }
    };

    // Try to play immediately
    startMusic();

    // Also try on first user interaction (for browsers that block autoplay)
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

  // Watch for slaps (count increases)
  useEffect(() => {
    if (gameData.count > lastCountRef.current && gameState === GameState.PLAYING) {
      // Play slap sound
      playSound(slapSoundRef);

      // Show visual effect
      setShowSlapEffect(true);
      setTimeout(() => setShowSlapEffect(false), 200);

      // Play combo sound every 5 slaps
      if (gameData.count % 5 === 0 && gameData.count > 0) {
        setTimeout(() => playSound(comboSoundRef), 100);
      }
    }
    lastCountRef.current = gameData.count;
  }, [gameData.count, gameState, playSound]);

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
    setGameState(GameState.PLAYING);
  };

  const stopGame = async () => {
    setGameState(GameState.PAUSED);
    // Stop music when game ends
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
    }

    if (user && gameData.count > 0) {
      await saveScore(user, gameData.count, 'cumulative', 'mosquito');
      await saveScore(user, gameData.count, 'endurance', 'mosquito');
    }
  };

  return (
    <div className="game-screen relative h-screen w-screen overflow-hidden bg-rose-950 font-sans text-white">

      {/* BACKGROUND: Visual Swarm */}
      <div className="absolute inset-0 z-0">
        <MosquitoSwarm score={gameData.count} isClapping={gameData.isClapping} />
      </div>

      {/* SLAP EFFECT OVERLAY */}
      {showSlapEffect && (
        <div className="absolute inset-0 z-40 pointer-events-none">
          {/* Screen flash */}
          <div className="absolute inset-0 bg-rose-500/30 animate-pulse"></div>

          {/* SLAP! text */}
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2">
            <div className="text-5xl sm:text-6xl md:text-7xl font-black text-white animate-ping drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]">
              💥 SLAP!
            </div>
          </div>

          {/* Dead mosquito particles */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <span className="absolute -left-20 -top-10 animate-ping text-3xl">🦟</span>
              <span className="absolute left-10 -top-5 animate-ping text-2xl delay-75">💀</span>
              <span className="absolute -left-10 top-5 animate-ping text-3xl delay-150">✨</span>
              <span className="absolute left-20 top-10 animate-ping text-2xl delay-100">💥</span>
            </div>
          </div>
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={onBack}
        className="absolute top-2 left-2 sm:top-4 sm:left-4 z-50 bg-black/30 hover:bg-black/50 backdrop-blur text-white p-2 sm:p-3 rounded-full transition-all border border-white/10 hover:border-white/30"
        style={{ marginTop: 'env(safe-area-inset-top)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
      </button>

      {/* WEBCAM LAYER - Use native camera FOV, display as portrait on mobile */}
      <div
        className="absolute top-2 right-2 sm:top-4 sm:right-4 z-40 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-black"
        style={{
          marginTop: 'env(safe-area-inset-top)',
          width: 'clamp(80px, 22vw, 192px)',
          aspectRatio: typeof window !== 'undefined' && window.innerWidth < 640 ? '3/4' : '4/3'
        }}
      >
        <Webcam
          ref={webcamRef}
          className="w-full h-full object-cover transform scale-x-[-1]"
          audio={false}
          mirrored={true}
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
        {/* Canvas Overlay for Debug Skeleton */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
        />
      </div>


      {/* COUNTDOWN OVERLAY */}
      {countdown !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="text-6xl sm:text-7xl md:text-9xl font-black text-rose-500 drop-shadow-[0_0_50px_rgba(244,63,94,0.8)] animate-bounce">
            {countdown === 0 ? 'SWAT!' : countdown}
          </div>
        </div>
      )}

      {/* HUD */}
      <div className="absolute inset-0 z-10 flex flex-col justify-between pointer-events-none">

        {/* Top Center Score */}
        <div className="flex flex-col items-center pt-4 sm:pt-6 md:pt-8" style={{ paddingTop: 'max(16px, calc(env(safe-area-inset-top) + 16px))' }}>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-rose-400 drop-shadow-md italic uppercase tracking-widest">Mosquito Slap</h1>
          <div className="mt-1 sm:mt-2 text-5xl sm:text-6xl md:text-7xl font-mono font-bold text-white drop-shadow-[0_4px_0_#9f1239] flex items-center gap-2 sm:gap-4">
            <span>{gameData.count}</span>
            <span className="text-2xl sm:text-3xl md:text-4xl opacity-50">🦟</span>
          </div>

          {/* Tutorial Hint */}
          {gameState === GameState.PLAYING && gameData.count === 0 && (
            <div className="mt-2 sm:mt-4 bg-black/50 backdrop-blur px-3 sm:px-6 py-1 sm:py-2 rounded-full border border-white/20 animate-pulse">
              <p className="text-xs sm:text-sm font-bold text-rose-200">ℹ️ Clap hands ABOVE your head!</p>
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div
          className="flex justify-center pointer-events-auto bg-gradient-to-t from-black/70 to-transparent pt-4"
          style={{ paddingBottom: 'max(48px, calc(env(safe-area-inset-bottom) + 32px))' }}
        >
          {gameState === GameState.IDLE ? (
            <button
              onClick={startCountdown}
              disabled={isLoading}
              className="bg-rose-600 hover:bg-rose-500 text-white text-lg sm:text-xl md:text-2xl font-black py-3 sm:py-4 px-8 sm:px-12 md:px-16 rounded-2xl sm:rounded-3xl shadow-[0_6px_0_rgb(136,19,55)] sm:shadow-[0_10px_0_rgb(136,19,55)] active:shadow-none active:translate-y-[6px] sm:active:translate-y-[10px] transition-all border-2 sm:border-4 border-rose-800"
            >
              {isLoading ? 'LOADING...' : 'START'}
            </button>
          ) : gameState === GameState.PLAYING ? (
            <button
              onClick={stopGame}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 sm:py-3 px-4 sm:px-6 md:px-8 rounded-full shadow-lg border border-white/10 text-sm sm:text-base"
            >
              FINISH GAME
            </button>
          ) : null}
        </div>
      </div>

    </div>
  );
};

export default MosquitoGame;