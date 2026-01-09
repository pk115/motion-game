import React from 'react';

type Lane = 'left' | 'center' | 'right';

interface Props {
    playerLane: Lane;
    bombs: Array<{ id: number, lane: Lane, y: number }>; // y from -10 (top) to 100 (bottom)
    coins: Array<{ id: number, lane: Lane, y: number }>;
}

const BombVisuals: React.FC<Props> = ({ playerLane, bombs, coins }) => {

    // Lane positions: divide screen into 3 equal parts
    // Left: 16.67% (center of first third)
    // Center: 50% (center of middle third)
    // Right: 83.33% (center of last third)
    const getLaneLeft = (lane: Lane) => {
        if (lane === 'left') return '16.67%';
        if (lane === 'center') return '50%';
        if (lane === 'right') return '83.33%';
        return '50%';
    };

    return (
        <div className="relative w-full h-full bg-slate-900 font-sans" style={{ overflow: 'clip' }}>
            {/* Background - Sci-Fi Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-slate-900 to-black">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            </div>

            {/* Lanes - 3 equal columns */}
            <div className="absolute inset-0 flex">
                <div className="w-1/3 h-full border-r border-white/5 bg-gradient-to-b from-black/0 to-orange-500/5 relative">
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/10 text-4xl sm:text-5xl md:text-6xl font-black">L</div>
                </div>
                <div className="w-1/3 h-full border-r border-white/5 bg-gradient-to-b from-black/0 to-orange-500/5 relative">
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/10 text-4xl sm:text-5xl md:text-6xl font-black">C</div>
                </div>
                <div className="w-1/3 h-full bg-gradient-to-b from-black/0 to-orange-500/5 relative">
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/10 text-4xl sm:text-5xl md:text-6xl font-black">R</div>
                </div>
            </div>

            {/* Danger Zone Line */}
            <div className="absolute bottom-24 left-0 right-0 h-1 bg-red-500/50 blur-[2px] animate-pulse"></div>

            {/* Debug: Show bomb count */}
            {bombs.length > 0 && (
                <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs z-50">
                    Bombs: {bombs.length}
                </div>
            )}

            {/* Falling Objects - Bombs */}
            {bombs.map(b => (
                <div
                    key={`bomb-${b.id}`}
                    className="absolute pointer-events-none"
                    style={{
                        left: getLaneLeft(b.lane),
                        top: `${b.y}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 30,
                        willChange: 'top'
                    }}
                >
                    <div className="relative">
                        <span className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl filter drop-shadow-[0_0_20px_rgba(239,68,68,0.9)]">💣</span>
                        <div className="absolute -top-8 sm:-top-10 md:-top-12 left-1/2 -translate-x-1/2 w-1 h-8 sm:h-10 md:h-12 bg-gradient-to-t from-red-500 to-transparent opacity-70"></div>
                    </div>
                </div>
            ))}

            {/* Falling Objects - Coins */}
            {coins.map(c => (
                <div
                    key={`coin-${c.id}`}
                    className="absolute pointer-events-none"
                    style={{
                        left: getLaneLeft(c.lane),
                        top: `${c.y}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 25,
                        willChange: 'top'
                    }}
                >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full bg-yellow-400 border-2 sm:border-3 md:border-4 border-yellow-200 shadow-[0_0_25px_rgba(234,179,8,0.7)] flex items-center justify-center">
                        <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-yellow-800">$</span>
                    </div>
                </div>
            ))}

            {/* Player Character */}
            <div
                className="absolute bottom-8 transition-all duration-200 ease-out z-50 transform -translate-x-1/2"
                style={{
                    left: getLaneLeft(playerLane)
                }}
            >
                {/* Person with Shield */}
                <div className="relative flex flex-col items-center">
                    {/* Shield/Glow Effect */}
                    <div className="absolute -inset-6 rounded-full bg-cyan-400/10 shadow-[0_0_40px_rgba(34,211,238,0.3)] animate-pulse"></div>

                    {/* Person Emoji */}
                    <div className="relative">
                        <span className="text-6xl sm:text-7xl md:text-8xl filter drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">🧍</span>
                    </div>

                    {/* Shield in front */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                        <span className="text-4xl sm:text-5xl filter drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]">🛡️</span>
                    </div>
                </div>
            </div>

            <style>{`
                 @keyframes spin-slow {
                     from { transform: rotate(0deg); }
                     to { transform: rotate(360deg); }
                 }
                 @keyframes blink {
                     0%, 100% { opacity: 1; }
                     50% { opacity: 0.5; }
                 }
             `}</style>

        </div>
    );
};

export default BombVisuals;
