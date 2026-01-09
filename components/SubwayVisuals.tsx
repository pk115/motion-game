import React from 'react';

type Lane = 'left' | 'center' | 'right';

interface Props {
    playerLane: Lane;
    bombs: Array<{ id: number, lane: Lane, y: number }>; // y from -10 (top) to 100 (bottom)
    coins: Array<{ id: number, lane: Lane, y: number }>;
}

const BombVisuals: React.FC<Props> = ({ playerLane, bombs, coins }) => {

    const getLaneLeft = (lane: Lane) => {
        if (lane === 'left') return '25%';
        if (lane === 'center') return '50%';
        if (lane === 'right') return '75%';
        return '50%';
    };

    return (
        <div className="relative w-full h-full bg-slate-900 overflow-hidden font-sans">
            {/* Background - Sci-Fi Grid */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-slate-900 to-black">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            </div>

            {/* Lanes */}
            <div className="absolute inset-0 flex">
                <div className="w-1/4 h-full border-r border-white/5 bg-gradient-to-b from-black/0 to-orange-900/10"></div> {/* Spacer */}
                <div className="w-1/4 h-full border-r border-white/5 bg-gradient-to-b from-black/0 to-orange-500/5 relative">
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/10 text-6xl font-black">L</div>
                </div>
                <div className="w-1/4 h-full border-r border-white/5 bg-gradient-to-b from-black/0 to-orange-500/5 relative">
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/10 text-6xl font-black">C</div>
                </div>
                <div className="w-1/4 h-full border-r border-white/5 bg-gradient-to-b from-black/0 to-orange-500/5 relative">
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/10 text-6xl font-black">R</div>
                </div>
            </div>

            {/* Danger Zone Line */}
            <div className="absolute bottom-24 left-0 right-0 h-1 bg-red-500/50 blur-[2px] animate-pulse"></div>

            {/* Falling Objects */}
            {bombs.map(b => (
                <div
                    key={`b-${b.id}`}
                    className="absolute transition-all duration-[50ms] ease-linear"
                    style={{
                        left: getLaneLeft(b.lane),
                        top: `${b.y}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 20
                    }}
                >
                    <div className="relative">
                        <span className="text-6xl filter drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-spin-slow">💣</span>
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-1 h-10 bg-gradient-to-t from-red-500 to-transparent opacity-50"></div>
                    </div>
                </div>
            ))}

            {coins.map(c => (
                <div
                    key={`c-${c.id}`}
                    className="absolute transition-all duration-[50ms] ease-linear"
                    style={{
                        left: getLaneLeft(c.lane),
                        top: `${c.y}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10
                    }}
                >
                    <div className="w-12 h-12 rounded-full bg-yellow-400 border-2 border-yellow-200 shadow-[0_0_20px_rgba(234,179,8,0.6)] animate-pulse flex items-center justify-center">
                        <span className="text-2xl font-bold text-yellow-800">$</span>
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
                {/* Robot / Character */}
                <div className="relative w-24 h-32">
                    {/* Shield/Forcefield */}
                    <div className="absolute -inset-4 rounded-full border-2 border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_30px_rgba(34,211,238,0.2)] animate-pulse"></div>

                    {/* Body */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-20 bg-slate-200 rounded-2xl border-4 border-slate-400"></div>
                    {/* Head */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-xl border-4 border-slate-400 z-10">
                        <div className="absolute top-3 left-2 w-2 h-2 bg-cyan-500 rounded-full animate-blink"></div>
                        <div className="absolute top-3 right-2 w-2 h-2 bg-cyan-500 rounded-full animate-blink"></div>
                    </div>
                    {/* Wheels/Legs */}
                    <div className="absolute -bottom-2 left-2 w-4 h-4 bg-black rounded-full animate-spin"></div>
                    <div className="absolute -bottom-2 right-2 w-4 h-4 bg-black rounded-full animate-spin"></div>
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
