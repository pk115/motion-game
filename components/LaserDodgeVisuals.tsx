import React, { useEffect, useState } from 'react';

// ============================================
// Monster Dodge Visuals
// บิดตัวหลบมอนสเตอร์! 🥷👻
// ============================================

type MonsterSide = 'left' | 'right';

interface Monster {
    id: number;
    side: MonsterSide;
    isActive: boolean;
    dodged: boolean;
    hit: boolean;
    scored: boolean;
    spawnTime: number;
}

interface LaserDodgeVisualsProps {
    score: number;
    combo: number;
    twistAngle: number;
    twistDirection: 'left' | 'right' | 'center';
    twistIntensity: number;
    monsters: Monster[];
    health: number;      // 0-100
    perfectDodges: number;
}

const LaserDodgeVisuals: React.FC<LaserDodgeVisualsProps> = ({
    score,
    combo,
    twistAngle,
    twistDirection,
    twistIntensity,
    monsters,
    health,
    perfectDodges
}) => {
    const [particles, setParticles] = useState<Array<{ id: number, x: number, y: number, type: string }>>([]);
    const [lastDodgeId, setLastDodgeId] = useState<number | null>(null);

    // Spawn particles on dodge
    useEffect(() => {
        const dodgedMonster = monsters.find(m => m.dodged && !m.hit);
        if (dodgedMonster && dodgedMonster.id !== lastDodgeId) {
            setLastDodgeId(dodgedMonster.id);

            const newParticles = [...Array(5)].map((_, i) => ({
                id: Date.now() + i,
                x: 50 + (Math.random() - 0.5) * 30,
                y: 75 + (Math.random() - 0.5) * 10,
                type: '✨'
            }));
            setParticles(prev => [...prev, ...newParticles]);

            // Remove after animation
            setTimeout(() => {
                setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
            }, 1000);
        }
    }, [monsters, lastDodgeId]);

    // Calculate player body rotation
    const bodyRotation = twistAngle * 0.6;
    const bodyX = twistAngle * 0.3; // Slight horizontal movement

    return (
        <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-indigo-900 via-blue-900 to-indigo-950">

            {/* Night Sky Background with Stars */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(30)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                        style={{
                            left: `${(i * 13) % 100}%`,
                            top: `${(i * 7) % 60}%`,
                            opacity: 0.5 + (i % 10) * 0.05,
                            animationDelay: `${i * 0.1}s`
                        }}
                    />
                ))}
            </div>

            {/* Moon */}
            <div
                className="absolute top-8 right-12 w-16 h-16 sm:w-24 sm:h-24 rounded-full"
                style={{
                    background: 'radial-gradient(circle at 30% 30%, #FEF3C7, #FCD34D)',
                    boxShadow: '0 0 60px rgba(252, 211, 77, 0.4)'
                }}
            />

            {/* Dojo Floor */}
            <div
                className="absolute bottom-0 left-0 right-0 h-32 sm:h-40 z-0"
                style={{
                    background: 'linear-gradient(to bottom, rgba(79, 70, 229, 0.3) 0%, rgba(99, 102, 241, 0.5) 50%, rgba(79, 70, 229, 0.3) 100%)',
                    borderTop: '3px solid rgba(139, 92, 246, 0.6)'
                }}
            >
                {/* Floor pattern */}
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}
                />
            </div>



            {/* ===== MONSTERS (Ghosts/Monsters appearing from sides) ===== */}
            {monsters.map(monster => {
                if (!monster.isActive) return null; // Don't show inactive monsters

                const isLeft = monster.side === 'left';

                return (
                    <div
                        key={monster.id}
                        className="absolute w-full pointer-events-none"
                        style={{
                            top: '50%',
                            transform: 'translateY(-50%)',
                            zIndex: 30,
                        }}
                    >
                        {/* Monster from LEFT side */}
                        {isLeft && (
                            <div
                                className="absolute left-2 sm:left-4 flex items-center gap-2 sm:gap-4 animate-fade-in"
                                style={{
                                    opacity: monster.dodged ? 0.3 : monster.hit ? 0 : 1,
                                    transition: 'opacity 0.3s'
                                }}
                            >
                                {/* Monster/Ghost */}
                                <div className="flex items-center">
                                    <span
                                        className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl filter drop-shadow-[0_0_20px_rgba(220,38,38,0.8)] animate-pulse"
                                        style={{
                                            animation: 'pulse 1s ease-in-out infinite'
                                        }}
                                    >
                                        🧟
                                    </span>
                                </div>

                                {/* Direction hint */}
                                <div className="bg-black/70 px-2 py-1 sm:px-4 sm:py-2 rounded-full flex items-center gap-1 sm:gap-2 border-2 border-pink-400/50">
                                    <span className="text-xl sm:text-2xl animate-bounce">👈</span>
                                    <span className="text-pink-400 text-sm sm:text-lg md:text-xl font-bold whitespace-nowrap">บิดซ้าย!</span>
                                </div>
                            </div>
                        )}

                        {/* Monster from RIGHT side */}
                        {!isLeft && (
                            <div
                                className="absolute right-2 sm:right-4 flex items-center flex-row-reverse gap-2 sm:gap-4 animate-fade-in"
                                style={{
                                    opacity: monster.dodged ? 0.3 : monster.hit ? 0 : 1,
                                    transition: 'opacity 0.3s'
                                }}
                            >
                                {/* Monster/Ghost */}
                                <div className="flex items-center">
                                    <span
                                        className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl filter drop-shadow-[0_0_20px_rgba(220,38,38,0.8)] animate-pulse"
                                        style={{
                                            animation: 'pulse 1s ease-in-out infinite'
                                        }}
                                    >
                                        🧟
                                    </span>
                                </div>

                                {/* Direction hint */}
                                <div className="bg-black/70 px-2 py-1 sm:px-4 sm:py-2 rounded-full flex items-center gap-1 sm:gap-2 border-2 border-cyan-400/50">
                                    <span className="text-cyan-400 text-sm sm:text-lg md:text-xl font-bold whitespace-nowrap">บิดขวา!</span>
                                    <span className="text-xl sm:text-2xl animate-bounce">👉</span>
                                </div>
                            </div>
                        )}

                        {/* Dodged effect */}
                        {monster.dodged && !monster.hit && (
                            <div className="absolute left-1/2 -translate-x-1/2 text-center animate-bounce">
                                <span className="text-3xl sm:text-4xl">💨</span>
                                <div className="text-green-400 text-lg sm:text-xl font-bold">DODGE!</div>
                            </div>
                        )}
                    </div>
                );
            })}


            {/* ===== PLAYER CHARACTER (Ninja) ===== */}
            <div
                className="absolute bottom-20 sm:bottom-24 md:bottom-32 left-1/2 transition-all duration-100 z-10"
                style={{
                    transform: `translateX(calc(-50% + ${bodyX}px)) rotate(${bodyRotation}deg)`,
                }}
            >
                <div className="relative">
                    {/* Twist Aura */}
                    {twistIntensity > 0.3 && (
                        <div
                            className="absolute -inset-6 sm:-inset-8 rounded-full animate-pulse"
                            style={{
                                background: twistDirection === 'left'
                                    ? 'radial-gradient(circle, rgba(6,182,212,0.6) 0%, transparent 70%)'
                                    : twistDirection === 'right'
                                        ? 'radial-gradient(circle, rgba(236,72,153,0.6) 0%, transparent 70%)'
                                        : 'none',
                                filter: 'blur(8px)'
                            }}
                        />
                    )}

                    {/* Perfect Dodge Burst */}
                    {twistIntensity > 0.7 && (
                        <div className="absolute -inset-8 sm:-inset-12">
                            <div className="absolute inset-0 animate-ping">
                                <span className="text-3xl sm:text-4xl absolute top-0 left-1/2 -translate-x-1/2">⚡</span>
                                <span className="text-3xl sm:text-4xl absolute bottom-0 left-1/2 -translate-x-1/2">⚡</span>
                            </div>
                        </div>
                    )}

                    {/* Ninja Body Container */}
                    <div className="relative flex flex-col items-center">
                        {/* Direction Arrow */}
                        <div className="absolute -top-6 sm:-top-8 left-1/2 -translate-x-1/2 text-2xl sm:text-3xl">
                            {twistDirection === 'left' && <span className="text-cyan-400 animate-pulse">◀</span>}
                            {twistDirection === 'right' && <span className="text-pink-400 animate-pulse">▶</span>}
                        </div>

                        {/* Ninja Emoji */}
                        <span
                            className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl filter"
                            style={{
                                filter: `drop-shadow(0 0 20px ${twistDirection === 'left' ? 'rgba(6,182,212,0.8)' :
                                    twistDirection === 'right' ? 'rgba(236,72,153,0.8)' :
                                        'rgba(99,102,241,0.5)'
                                    })`
                            }}
                        >
                            🥷
                        </span>

                        {/* Twist Intensity Text */}
                        {twistIntensity > 0.5 && (
                            <div className="absolute -bottom-5 sm:-bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                <span className="text-yellow-400 font-black text-xs sm:text-sm animate-bounce">
                                    {twistIntensity > 0.8 ? '★ PERFECT!' : '✓ GOOD!'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Dodge Particles */}
            {particles.map(particle => (
                <div
                    key={particle.id}
                    className="absolute animate-ping pointer-events-none"
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                    }}
                >
                    <span className="text-2xl">{particle.type}</span>
                </div>
            ))}

            {/* ===== HUD ===== */}

            {/* Score - Top Center */}
            <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 z-30" style={{ marginTop: 'env(safe-area-inset-top)' }}>
                <div className="bg-black/60 backdrop-blur-lg rounded-lg sm:rounded-xl px-4 py-2 sm:px-6 sm:py-3 border border-indigo-500/30 text-center">
                    <div className="text-[10px] sm:text-xs text-indigo-300 uppercase tracking-wider">Score</div>
                    <div className="text-2xl sm:text-4xl md:text-5xl font-black text-white font-mono">
                        {score}
                    </div>
                </div>
            </div>

            {/* Combo Display */}
            {combo > 1 && (
                <div className="absolute top-16 sm:top-24 left-1/2 -translate-x-1/2 z-30">
                    <div
                        className={`px-4 py-1 sm:px-6 sm:py-2 rounded-full ${combo % 10 === 0
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse'
                                : 'bg-gradient-to-r from-indigo-500 to-purple-500 animate-bounce'
                            }`}
                        style={{ transform: `scale(${1 + Math.min(combo * 0.02, 0.5)})` }}
                    >
                        <span className="text-white font-black text-sm sm:text-lg">
                            {combo % 10 === 0 ? '❤️ +HP! ' : '🥷 '}{combo} COMBO!
                        </span>
                    </div>
                </div>
            )}

            {/* Health Bar - Top Left */}
            <div
                className="absolute top-2 left-2 sm:top-4 sm:left-4 z-30 w-24 sm:w-32"
                style={{ marginTop: 'calc(env(safe-area-inset-top) + 40px)' }}
            >
                <div className="bg-black/60 backdrop-blur-lg rounded-lg sm:rounded-xl px-2 py-1.5 sm:px-3 sm:py-2 border border-red-500/30">
                    <div className="text-[10px] sm:text-xs text-red-300 mb-1">❤️ HP</div>
                    <div className="w-full h-2 sm:h-3 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-300 ${health > 50 ? 'bg-green-500' : health > 25 ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`}
                            style={{ width: `${health}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Perfect Counter - Top Right (under webcam) */}
            <div
                className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20"
                style={{ marginTop: 'calc(env(safe-area-inset-top) + 100px)' }}
            >
                <div className="bg-black/60 backdrop-blur-lg rounded-lg sm:rounded-xl px-2 py-1 sm:px-4 sm:py-2 border border-yellow-500/30 text-center">
                    <div className="text-[10px] sm:text-xs text-yellow-300">Perfect</div>
                    <div className="text-lg sm:text-2xl font-bold text-yellow-400">⭐ {perfectDodges}</div>
                </div>
            </div>

            {/* Twist Meter - Bottom Center */}
            <div className="absolute bottom-2 sm:bottom-4 left-2 right-2 sm:left-4 sm:right-4 z-30 max-w-xs mx-auto" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="bg-black/60 backdrop-blur-lg rounded-lg sm:rounded-xl px-3 py-2 sm:px-4 sm:py-3 border border-indigo-500/30">
                    <div className="flex items-center justify-between mb-1 text-[10px] sm:text-xs">
                        <span className="text-cyan-400 font-bold">◀ บิดซ้าย</span>
                        <span className="text-slate-400">TWIST</span>
                        <span className="text-pink-400 font-bold">บิดขวา ▶</span>
                    </div>
                    <div className="relative w-full h-3 sm:h-4 bg-slate-700 rounded-full overflow-hidden">
                        {/* Center marker */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/50 z-10" />
                        {/* Twist threshold markers */}
                        <div className="absolute left-1/4 top-0 bottom-0 w-px bg-white/20" />
                        <div className="absolute right-1/4 top-0 bottom-0 w-px bg-white/20" />
                        {/* Twist indicator */}
                        <div
                            className="absolute top-0 bottom-0 w-4 sm:w-5 rounded-full transition-all duration-75"
                            style={{
                                left: `${50 + (twistAngle / 90) * 45}%`,
                                transform: 'translateX(-50%)',
                                backgroundColor: twistDirection === 'left' ? '#06B6D4' : twistDirection === 'right' ? '#EC4899' : '#6366F1',
                                boxShadow: `0 0 10px ${twistDirection === 'left' ? '#06B6D4' : twistDirection === 'right' ? '#EC4899' : '#6366F1'}`
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: scale(0.8);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default LaserDodgeVisuals;
