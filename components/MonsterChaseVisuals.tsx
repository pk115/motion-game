import React, { useEffect, useState } from 'react';

// ============================================
// Monster Chase Visuals - IMPROVED
// แสดงตัวละครวิ่งหนีมอนสเตอร์
// ============================================

interface MonsterChaseProps {
  playerSpeed: number;      // 0-1 player running speed
  monsterDistance: number;  // 0-100 distance from monster (100 = safe, 0 = caught)
  score: number;            // Distance traveled
  isRunning: boolean;       // Is player actively running
  boostActive: boolean;     // Is boost zone active
}

const MonsterChaseVisuals: React.FC<MonsterChaseProps> = ({
  playerSpeed,
  monsterDistance,
  score,
  isRunning,
  boostActive
}) => {
  const [bgOffset, setBgOffset] = useState(0);
  const [playerFrame, setPlayerFrame] = useState(0);
  const [monsterFrame, setMonsterFrame] = useState(0);

  // Animate background scrolling and character frames
  useEffect(() => {
    const interval = setInterval(() => {
      if (isRunning || playerSpeed > 0.1) {
        setBgOffset(prev => (prev + playerSpeed * 15) % 100);
        setPlayerFrame(prev => (prev + 1) % 4);
      }
      setMonsterFrame(prev => (prev + 1) % 3);
    }, 80);
    return () => clearInterval(interval);
  }, [playerSpeed, isRunning]);

  // Monster danger level
  const dangerLevel = 100 - monsterDistance;
  const dangerColor = dangerLevel > 70 ? 'text-red-500' : dangerLevel > 40 ? 'text-yellow-500' : 'text-green-500';

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-purple-900 via-indigo-900 to-slate-900">

      {/* Stars Background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(60)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              left: `${(i * 17) % 100}%`,
              top: `${(i * 13) % 70}%`,
              animationDelay: `${(i * 0.1) % 2}s`,
              opacity: 0.3 + (i % 5) * 0.15
            }}
          />
        ))}
      </div>

      {/* Moving Ground */}
      <div
        className="absolute bottom-0 left-0 right-0 h-20 sm:h-32 bg-gradient-to-t from-slate-800 to-transparent"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255,255,255,0.05) 50px, rgba(255,255,255,0.05) 52px)`,
          backgroundPosition: `${-bgOffset * 5}px 0`
        }}
      />

      {/* Ground Line */}
      <div
        className="absolute bottom-16 sm:bottom-28 left-0 right-0 h-1 sm:h-2 bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600"
        style={{
          backgroundPosition: `${-bgOffset * 5}px 0`,
          backgroundSize: '100px 100%'
        }}
      />

      {/* Trees/Obstacles scrolling */}
      <div className="absolute bottom-16 sm:bottom-28 left-0 right-0 h-24 sm:h-40 pointer-events-none">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className="absolute bottom-0"
            style={{
              left: `${((i * 18 - bgOffset * 2) % 140) - 15}%`,
              opacity: 0.7,
              transform: `scale(${0.6 + (i % 3) * 0.15})`
            }}
          >
            <span className="text-3xl sm:text-5xl md:text-6xl">{i % 2 === 0 ? '🌲' : '🌳'}</span>
          </div>
        ))}
      </div>

      {/* Boost Zone Indicator */}
      {boostActive && (
        <div className="absolute inset-0 bg-yellow-500/20 animate-pulse pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl animate-bounce">
            ⚡
          </div>
        </div>
      )}

      {/* Monster (chasing from left) - ANIMATED */}
      <div
        className="absolute bottom-20 sm:bottom-32 transition-all duration-500"
        style={{
          left: `${10 + (70 - monsterDistance) * 0.6}%`,
          transform: `scale(${0.9 + dangerLevel * 0.005}) translateY(${monsterFrame === 1 ? -5 : 0}px)`
        }}
      >
        <div className="relative">
          {/* Monster Glow */}
          <div
            className={`absolute -inset-2 sm:-inset-4 rounded-full blur-lg sm:blur-xl ${dangerLevel > 50 ? 'bg-red-600/50 animate-pulse' : 'bg-purple-600/30'}`}
          />
          {/* Monster Emoji */}
          <span
            className="text-5xl sm:text-7xl md:text-8xl filter drop-shadow-[0_0_20px_rgba(139,0,0,0.8)] inline-block"
            style={{
              transform: `rotate(${monsterFrame === 0 ? -5 : monsterFrame === 1 ? 0 : 5}deg)`,
              transition: 'transform 0.1s'
            }}
          >
            👹
          </span>
          {/* Danger Warning */}
          {dangerLevel > 60 && (
            <div className="absolute -top-6 sm:-top-8 left-1/2 -translate-x-1/2 text-red-500 font-bold animate-pulse text-[10px] sm:text-sm whitespace-nowrap">
              ⚠️ DANGER!
            </div>
          )}
        </div>
      </div>

      {/* Player (running on right side) - ANIMATED */}
      <div
        className="absolute bottom-20 sm:bottom-32 right-[20%] sm:right-[25%] transition-all duration-100"
        style={{
          transform: `translateY(${playerFrame % 2 === 0 && isRunning ? -8 : 0}px)`
        }}
      >
        <div className="relative">
          {/* Speed Trail */}
          {playerSpeed > 0.3 && (
            <div className="absolute -left-12 sm:-left-20 top-1/2 -translate-y-1/2 flex gap-0.5 sm:gap-1">
              {[...Array(Math.floor(playerSpeed * 4))].map((_, i) => (
                <div
                  key={i}
                  className="w-2 sm:w-4 h-0.5 sm:h-1 bg-cyan-400/50 rounded-full animate-pulse"
                  style={{ opacity: 1 - i * 0.2, animationDelay: `${i * 0.05}s` }}
                />
              ))}
            </div>
          )}

          {/* Boost Aura */}
          {boostActive && (
            <div className="absolute -inset-4 sm:-inset-6 bg-yellow-400/30 rounded-full animate-ping" />
          )}

          {/* Player */}
          <span
            className={`text-4xl sm:text-6xl md:text-7xl inline-block filter ${boostActive ? 'drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]' : 'drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]'}`}
            style={{
              transform: `scaleX(-1) rotate(${isRunning ? (playerFrame % 2 === 0 ? -6 : 6) : 0}deg)`,
              transition: 'transform 0.08s'
            }}
          >
            🏃
          </span>

          {/* Foot dust */}
          {isRunning && playerSpeed > 0.2 && (
            <div className="absolute -bottom-1 sm:-bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
              {[0, 1].map(i => (
                <span
                  key={i}
                  className="text-sm sm:text-lg animate-bounce"
                  style={{ animationDelay: `${i * 0.1}s`, opacity: 0.4 }}
                >
                  💨
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SCORE - CENTER DISPLAY */}
      <div className="absolute top-[35%] sm:top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center pointer-events-none">
        <div className="text-4xl sm:text-6xl md:text-7xl font-black text-white font-mono drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
          {Math.floor(score)}
          <span className="text-lg sm:text-2xl text-slate-300">m</span>
        </div>
      </div>

      {/* HUD - Top */}
      <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-16 sm:right-20 flex justify-between items-start z-30" style={{ marginTop: 'env(safe-area-inset-top)' }}>
        {/* Monster Danger Meter - Compact */}
        <div className="bg-black/60 backdrop-blur-lg rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-2 border border-white/10">
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-base sm:text-xl">👹</span>
            <div className="w-14 sm:w-20 h-2 sm:h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${dangerLevel > 70 ? 'bg-red-500' : dangerLevel > 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${dangerLevel}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Speed Meter - Below Score */}
      <div className="absolute top-[50%] sm:top-[45%] left-1/2 -translate-x-1/2 z-30">
        <div className="bg-black/60 backdrop-blur-lg rounded-lg sm:rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 border border-white/10">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-sm sm:text-lg">🏃</span>
            <div className="w-16 sm:w-24 h-2 sm:h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-150 ${boostActive ? 'bg-gradient-to-r from-yellow-400 to-orange-400' : 'bg-gradient-to-r from-cyan-400 to-emerald-400'}`}
                style={{ width: `${playerSpeed * 100}%` }}
              />
            </div>
            <span className={`text-xs sm:text-sm font-bold ${dangerColor}`}>
              {Math.floor(playerSpeed * 100)}%
            </span>
          </div>
        </div>
        {!isRunning && playerSpeed < 0.2 && (
          <div className="text-center text-red-400 text-[10px] sm:text-xs mt-1 animate-pulse bg-black/60 rounded px-2 py-0.5">
            ⚠️ Lift knees!
          </div>
        )}
      </div>

      {/* Caught Warning */}
      {monsterDistance < 10 && (
        <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center z-40 animate-pulse px-4">
          <div className="text-xl sm:text-4xl md:text-5xl font-black text-red-500 drop-shadow-lg text-center">
            👹 CATCHING UP! 👹
          </div>
        </div>
      )}
    </div>
  );
};

export default MonsterChaseVisuals;
