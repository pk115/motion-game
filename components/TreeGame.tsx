import React, { useEffect, useState, useMemo, useRef } from 'react';

interface TreeGameProps {
    score: number;
    isSquatting: boolean;
}

const TreeGame: React.FC<TreeGameProps> = ({ score, isSquatting }) => {
    // Height per squat point (pixels)
    const CLIMB_STEP = 150;

    // Current "World Height" of the player
    // We want to animate this smoothly.
    const [cameraY, setCameraY] = useState(0);
    const [isClimbing, setIsClimbing] = useState(false);
    const lastScore = useRef(0);

    // Update camera position
    useEffect(() => {
        setCameraY(score * CLIMB_STEP);
    }, [score]);

    // Detect when score increases to trigger climb animation
    useEffect(() => {
        if (score > lastScore.current) {
            setIsClimbing(true);
            const timer = setTimeout(() => setIsClimbing(false), 400);
            lastScore.current = score;
            return () => clearTimeout(timer);
        }
    }, [score]);

    // Viewport calculation for infinite branches
    const VIEWPORT_HEIGHT = 1200; // Render a bit more than screen
    const BRANCH_SPACING = 250;

    const visibleBranches = useMemo(() => {
        const branches = [];
        // We want to see branches relative to the player's position (cameraY).
        // The player is fixed at `bottom: 150px`.
        // Branches should be generated from slightly below the player to above the screen.

        // Determine world Y range currently visible
        // Screen Bottom = World Y: cameraY - 150
        // Screen Top = World Y: cameraY - 150 + ScreenHeight

        const startWorldY = Math.max(0, cameraY - 300);
        const endWorldY = cameraY + VIEWPORT_HEIGHT;

        const startIndex = Math.floor(startWorldY / BRANCH_SPACING);
        const endIndex = Math.ceil(endWorldY / BRANCH_SPACING);

        for (let i = startIndex; i <= endIndex; i++) {
            branches.push({
                id: i,
                worldY: i * BRANCH_SPACING + 200, // +200 offset so first branch isn't on ground
                side: i % 2 === 0 ? 'left' : 'right'
            });
        }
        return branches;
    }, [cameraY]);

    return (
        <div className="relative w-full h-full overflow-hidden bg-sky-300 font-sans select-none">
            {/* Fixed Sky Elements */}
            <div className="absolute top-10 left-10 opacity-50 animate-pulse">
                <CloudIcon size={64} />
            </div>
            <div className="absolute top-40 right-20 opacity-40 animate-pulse delay-700">
                <CloudIcon size={48} />
            </div>

            {/* Infinite Trunk - Fixed Position, Sliding Texture */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-24 md:w-40 bg-amber-800 overflow-hidden shadow-2xl">
                {/* Texture Layer */}
                <div
                    className="w-full h-full opacity-30 transition-all duration-700 ease-out"
                    style={{
                        backgroundImage: "url('https://www.transparenttextures.com/patterns/wood-pattern.png')",
                        backgroundPosition: `0px ${cameraY * 0.5}px`,
                        backgroundSize: '200px'
                    }}
                />
                <div className="absolute inset-y-0 left-0 w-2 bg-black/20" />
                <div className="absolute inset-y-0 right-0 w-2 bg-black/20" />
            </div>

            {/* Dynamic Branches */}
            <div className="absolute inset-0 pointer-events-none">
                <style>
                    {`
                    @keyframes sway {
                        0%, 100% { transform: rotate(0deg); }
                        50% { transform: rotate(2deg); }
                    }
                    @keyframes sway-reverse {
                        0%, 100% { transform: rotate(0deg); }
                        50% { transform: rotate(-2deg); }
                    }
                    @keyframes leaf-flutter {
                        0%, 100% { transform: scale(1) rotate(0deg); }
                        50% { transform: scale(1.05) rotate(3deg); }
                    }
                    @keyframes climb-bounce {
                        0% { transform: translateX(-50%) scaleY(1) translateY(0); }
                        25% { transform: translateX(-50%) scaleY(0.8) translateY(15px); }
                        50% { transform: translateX(-50%) scaleY(1.1) translateY(-20px); }
                        75% { transform: translateX(-50%) scaleY(0.95) translateY(-5px); }
                        100% { transform: translateX(-50%) scaleY(1) translateY(0); }
                    }
                    @keyframes arm-climb-left {
                        0%, 100% { transform: rotate(20deg); }
                        50% { transform: rotate(160deg); }
                    }
                    @keyframes arm-climb-right {
                        0%, 100% { transform: rotate(-20deg); }
                        50% { transform: rotate(-160deg); }
                    }
                    `}
                </style>
                {visibleBranches.map((branch) => {
                    const screenBottom = 150 + (branch.worldY - cameraY);
                    // Determine sway direction based on side
                    const animationName = branch.side === 'left' ? 'sway-reverse' : 'sway';

                    return (
                        <div
                            key={branch.id}
                            className="absolute left-1/2 transition-all duration-700 ease-out origin-center"
                            style={{
                                bottom: `${screenBottom}px`,
                                marginLeft: branch.side === 'left' ? '-100px' : '60px',
                                animation: `${animationName} ${3 + (branch.id % 2)}s ease-in-out infinite`
                            }}
                        >
                            {/* Branch Graphic Container */}
                            <div className="relative group">
                                {/* Main Branch Wood */}
                                <div className={`w-32 h-6 bg-amber-900 rounded-full relative shadow-lg ${branch.side === 'left' ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                                    {/* Wood Texture Detail */}
                                    <div className="absolute top-1 left-2 w-20 h-1 bg-amber-950/30 rounded-full"></div>
                                </div>

                                {/* Leaf Clusters - More detailed and animated */}
                                <div className="absolute -top-6 -left-4 w-40 h-20 animate-[leaf-flutter_4s_ease-in-out_infinite]">
                                    {/* Big Leaf Clump */}
                                    <div className="absolute top-4 left-4 w-32 h-16 bg-green-600 rounded-full opacity-90 shadow-sm border-b-4 border-green-800"></div>
                                    {/* Lighter Highlights */}
                                    <div className="absolute top-2 left-8 w-24 h-12 bg-green-500 rounded-full opacity-80"></div>
                                    <div className="absolute top-6 left-2 w-10 h-6 bg-green-400 rounded-full opacity-60"></div>
                                    {/* Dangling Leaves */}
                                    <div className="absolute bottom-0 left-10 w-4 h-6 bg-green-700 rounded-b-full origin-top animate-[sway_2s_ease-in-out_infinite]"></div>
                                    <div className="absolute bottom-2 left-20 w-3 h-5 bg-green-600 rounded-b-full origin-top animate-[sway-reverse_2.5s_ease-in-out_infinite]"></div>
                                </div>

                                {/* Flowers/Fruits Decorations */}
                                {branch.id % 3 === 0 && (
                                    <div className="absolute -top-4 left-10 w-4 h-4 bg-pink-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(244,114,182,0.6)]">
                                        <div className="absolute inset-0 bg-white/30 rounded-full transform scale-50"></div>
                                    </div>
                                )}
                                {branch.id % 5 === 0 && (
                                    <div className="absolute -top-2 left-24 w-6 h-6 bg-red-500 rounded-full border-b-2 border-red-800 shadow-md transform hover:scale-110 transition-transform">
                                        <div className="absolute top-1 right-2 w-2 h-2 bg-white/40 rounded-full"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Ground Layer - moves down and disappears */}
            <div
                className="absolute left-0 right-0 h-32 bg-green-700 transition-all duration-700 ease-out flex items-start justify-center overflow-hidden"
                style={{
                    bottom: `${150 - cameraY - 32}px`, // Starts just below character feet
                }}
            >
                <div className="w-full h-4 bg-green-800/50" /> {/* Grass shadow */}
            </div>


            {/* Character - Fixed vertically on screen */}
            <div
                className={`absolute left-1/2 -translate-x-1/2 z-20 ${isClimbing ? '' : 'transition-all duration-200'}`}
                style={{
                    bottom: '150px',
                    transform: `translateX(-50%) scaleY(${isSquatting ? 0.75 : 1}) translateY(${isSquatting ? '20px' : '0px'})`,
                    animation: isClimbing ? 'climb-bounce 0.4s ease-out' : 'none'
                }}
            >
                <CharacterSVG isSquatting={isSquatting} isClimbing={isClimbing} />

                {/* Height/Score Badge */}
                <div className="absolute -right-28 top-0 bg-white/90 backdrop-blur px-3 py-1 rounded-full border border-slate-200 shadow-lg flex flex-col items-center">
                    <span className="text-xs text-slate-500 font-bold uppercase">Height</span>
                    <span className="text-lg font-bold text-emerald-600">{Math.floor(score * 10)}m</span>
                </div>
            </div>

        </div>
    );
};

const CloudIcon = ({ size }: { size: number }) => (
    <svg width={size} height={size * 0.6} viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 19C20.3137 19 23 16.3137 23 13C23 9.92789 20.7183 7.39456 17.7669 6.89921C17.3712 3.03756 14.1026 0 10 0C5.58172 0 2 3.58172 2 8C2 8.16666 2.00832 8.33123 2.02456 8.49339C0.844005 9.43224 0 10.9668 0 12.75C0 16.2018 2.79822 19 6.25 19H17Z" />
    </svg>
);

const CharacterSVG = ({ isSquatting, isClimbing = false }: { isSquatting: boolean; isClimbing?: boolean }) => (
    <div className={`relative w-24 h-24 ${isClimbing ? 'scale-110' : ''} transition-transform duration-200`}>
        {/* Tail */}
        <div className={`absolute top-10 left-2 w-8 h-8 rounded-full border-4 border-amber-700 border-t-transparent border-r-transparent -rotate-12 ${isClimbing ? 'animate-bounce' : 'animate-pulse'}`}></div>

        {/* Body - Centered (w-12 = 48px, Container w-24 = 96px, left = (96-48)/2 = 24px = 1.5rem/6) */}
        <div className="absolute bottom-0 left-6 w-12 h-14 bg-amber-700 rounded-2xl shadow-lg z-10"></div>
        <div className="absolute bottom-2 left-8 w-8 h-8 bg-amber-200 rounded-full opacity-30 z-20"></div>

        {/* Head - Bigger & Centered */}
        <div className={`absolute -top-6 left-0 right-0 flex justify-center z-30 ${isClimbing ? 'animate-bounce' : ''}`}>
            <span className="text-7xl filter drop-shadow-xl transform scale-x-[-1]">🐵</span>
        </div>

        {/* Arms (Climbing Animation) */}
        <div
            className={`absolute top-6 left-1 w-4 h-14 bg-amber-700 rounded-full border border-amber-900 origin-top z-0 transition-transform duration-200 ease-out`}
            style={{
                transform: isClimbing ? 'rotate(160deg)' : (isSquatting ? 'rotate(160deg)' : 'rotate(20deg)')
            }}
        ></div>
        <div
            className={`absolute top-6 right-1 w-4 h-14 bg-amber-700 rounded-full border border-amber-900 origin-top z-0 transition-transform duration-200 ease-out`}
            style={{
                transform: isClimbing ? 'rotate(-160deg)' : (isSquatting ? 'rotate(-160deg)' : 'rotate(-20deg)')
            }}
        ></div>

        {/* Legs - Symmetric with climb animation */}
        <div className={`absolute bottom-0 left-5 w-4 h-6 bg-amber-700 rounded-full z-20 ${isClimbing ? 'translate-y-[-5px]' : ''} transition-transform duration-200`}></div>
        <div className={`absolute bottom-0 right-5 w-4 h-6 bg-amber-700 rounded-full z-20 ${isClimbing ? 'translate-y-[-5px]' : ''} transition-transform duration-200`}></div>

        {/* Climb sparkle effect */}
        {isClimbing && (
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                <span className="text-lg animate-ping">✨</span>
                <span className="text-sm animate-ping delay-100">⭐</span>
                <span className="text-lg animate-ping delay-200">✨</span>
            </div>
        )}
    </div>
)

export default TreeGame;