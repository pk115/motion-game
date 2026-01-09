import React, { useEffect, useState, useMemo } from 'react';

interface MosquitoSwarmProps {
    score: number;
    isClapping: boolean;
}

const MosquitoSwarm: React.FC<MosquitoSwarmProps> = ({ score, isClapping }) => {
    // Generate many mosquitoes
    const swarm = useMemo(() => {
        return Array.from({ length: 20 }).map((_, i) => ({
            id: i,
            left: Math.random() * 100, // %
            top: Math.random() * 60 + 10, // %, keep mostly overhead
            duration: Math.random() * 2 + 1, // Animation speed
            delay: Math.random() * 1
        }));
    }, []);

    const [splat, setSplat] = useState<{ x: number, y: number, id: number } | null>(null);

    useEffect(() => {
        if (isClapping) {
            // "Splat" effect when clapping - show near center/top
            setSplat({ x: 50, y: 30, id: Date.now() });

            // Auto hide splat
            const timer = setTimeout(() => {
                setSplat(null);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isClapping]);

    return (
        <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-slate-900 to-rose-950 font-sans select-none">

            {/* Ambient Particles */}
            {swarm.map((bug) => (
                <div
                    key={bug.id}
                    className="absolute w-4 h-4 animate-bounce"
                    style={{
                        left: `${bug.left}%`,
                        top: `${bug.top}%`,
                        animation: `flyAround ${bug.duration}s infinite ease-in-out alternate`
                    }}
                >
                    <div className="text-xl opacity-60">🦟</div>
                </div>
            ))}

            <style>{`
                @keyframes flyAround {
                    0% { transform: translate(0, 0) rotate(0deg); }
                    25% { transform: translate(10px, -20px) rotate(10deg); }
                    50% { transform: translate(-10px, 10px) rotate(-5deg); }
                    75% { transform: translate(20px, 0px) rotate(5deg); }
                    100% { transform: translate(0, 0) rotate(0deg); }
                }
                @keyframes shockwave {
                    0% { transform: scale(0.5); opacity: 1; border-width: 4px; }
                    100% { transform: scale(3); opacity: 0; border-width: 0px; }
                }
            `}</style>

            {/* Clap Shockwave Effect */}
            {isClapping && (
                <div className="absolute top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="w-20 h-20 rounded-full border-4 border-yellow-300 animate-[shockwave_0.3s_ease-out_forwards]"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-6xl font-black text-yellow-300 drop-shadow-[0_0_15px_rgba(253,224,71,0.8)] scale-150 transition-transform">💥</span>
                    </div>
                </div>
            )}

            {/* Character (Static or mirroring?) For now static style match */}
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 transition-transform duration-100"
                style={{ transform: `scale(${isClapping ? 1.05 : 1}) translateX(-50%)` }}>
                <MosquitoCharacter isClapping={isClapping} />
            </div>

            {/* Ground */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-rose-900 border-t-4 border-rose-800 flex justify-center">
                <div className="mt-4 text-rose-800/50 font-black text-6xl tracking-[1em] opacity-20">SWAMP</div>
            </div>
        </div>
    );
};

const MosquitoCharacter = ({ isClapping }: { isClapping: boolean }) => (
    <div className="relative w-24 h-40">
        {/* Head */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 bg-rose-300 rounded-full border-4 border-rose-950 z-20">
            {/* Eyes */}
            <div className="absolute top-5 left-3 w-3 h-3 bg-black rounded-full"></div>
            <div className="absolute top-5 right-3 w-3 h-3 bg-black rounded-full"></div>
            {/* Mouth */}
            <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 w-6 h-3 bg-rose-800 rounded-b-full transition-all ${isClapping ? 'h-5 w-8 -bottom-1' : ''}`}></div>
        </div>

        {/* Body */}
        <div className="absolute top-14 left-1/2 -translate-x-1/2 w-12 h-20 bg-rose-600 rounded-3xl border-4 border-rose-950 z-10"></div>

        {/* Arms */}
        {/* Left Arm */}
        <div className={`absolute top-16 -left-2 w-4 h-24 bg-rose-400 rounded-full border-4 border-rose-950 origin-top transition-transform duration-75 ${isClapping ? 'rotate-[145deg] -translate-y-4' : 'rotate-12'}`}></div>
        {/* Right Arm */}
        <div className={`absolute top-16 -right-2 w-4 h-24 bg-rose-400 rounded-full border-4 border-rose-950 origin-top transition-transform duration-75 ${isClapping ? '-rotate-[145deg] -translate-y-4' : '-rotate-12'}`}></div>

        {/* Clapping Hands Visual at top (only when clapping) */}
        {isClapping && (
            <div className="absolute -top-16 left-1/2 -translate-x-1/2 text-4xl">👋</div>
        )}

        {/* Legs */}
        <div className="absolute bottom-0 left-2 w-4 h-12 bg-rose-800 rounded-full border-4 border-rose-950"></div>
        <div className="absolute bottom-0 right-2 w-4 h-12 bg-rose-800 rounded-full border-4 border-rose-950"></div>
    </div>
);

export default MosquitoSwarm;
