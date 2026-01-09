import React, { useEffect, useState, useCallback } from 'react';

// ============================================
// Ghost Puncher Visuals
// แสดงผีและเอฟเฟกต์การต่อย
// ============================================

type GhostPosition = 'top' | 'left' | 'right' | 'bottom' | 'center';
type PunchType = 'straight' | 'hook' | 'uppercut' | 'none';

interface Ghost {
    id: number;
    position: GhostPosition;
    requiredPunch: PunchType;
    opacity: number;
    hit: boolean;
}

interface GhostPuncherVisualsProps {
    score: number;
    combo: number;
    ghosts: Ghost[];
    lastPunch: PunchType;
    isPunching: boolean;
    leftWristPos: { x: number; y: number };
    rightWristPos: { x: number; y: number };
    onGhostHit?: (ghostId: number) => void;
}

const GhostPuncherVisuals: React.FC<GhostPuncherVisualsProps> = ({
    score,
    combo,
    ghosts,
    lastPunch,
    isPunching,
    leftWristPos,
    rightWristPos,
    onGhostHit
}) => {
    const [hitEffects, setHitEffects] = useState<Array<{ id: number, x: number, y: number }>>([]);
    const [showPunchLabel, setShowPunchLabel] = useState(false);
    const [currentPunchLabel, setCurrentPunchLabel] = useState<PunchType>('none');

    // Show punch label when punch is detected
    useEffect(() => {
        if (lastPunch !== 'none') {
            setCurrentPunchLabel(lastPunch);
            setShowPunchLabel(true);

            // Hide after 1 second
            const timer = setTimeout(() => {
                setShowPunchLabel(false);
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [lastPunch, isPunching]);

    // Get ghost position style - adjusted for mobile
    const getGhostStyle = (position: GhostPosition) => {
        switch (position) {
            case 'top':
                return { top: '12%', left: '50%', transform: 'translateX(-50%)' };
            case 'left':
                return { top: '40%', left: '8%' };
            case 'right':
                return { top: '40%', right: '8%' };
            case 'bottom':
                return { bottom: '20%', left: '50%', transform: 'translateX(-50%)' };
            case 'center':
            default:
                return { top: '35%', left: '50%', transform: 'translateX(-50%)' };
        }
    };

    // Get fly away direction based on position
    const getFlyAwayStyle = (position: GhostPosition) => {
        switch (position) {
            case 'top':
                return 'animate-fly-up';
            case 'left':
                return 'animate-fly-left';
            case 'right':
                return 'animate-fly-right';
            case 'bottom':
                return 'animate-fly-down';
            case 'center':
            default:
                return 'animate-fly-back';
        }
    };

    // Get required punch icon
    const getPunchIcon = (punch: PunchType) => {
        switch (punch) {
            case 'straight': return '👊';
            case 'hook': return '🤜🤛';
            case 'uppercut': return '✊';
            default: return '👊';
        }
    };

    // Get punch name in Thai
    const getPunchNameThai = (punch: PunchType) => {
        switch (punch) {
            case 'straight': return 'หมัดตรง';
            case 'hook': return 'หมัดฮุค';
            case 'uppercut': return 'อัปเปอร์คัต';
            default: return '';
        }
    };

    // Get punch instruction
    const getPunchInstruction = (punch: PunchType) => {
        switch (punch) {
            case 'straight': return 'STRAIGHT!';
            case 'hook': return 'HOOK!';
            case 'uppercut': return 'UPPERCUT!';
            default: return '';
        }
    };

    // Add hit effect
    const addHitEffect = useCallback((x: number, y: number) => {
        const effect = { id: Date.now(), x, y };
        setHitEffects(prev => [...prev, effect]);
        setTimeout(() => {
            setHitEffects(prev => prev.filter(e => e.id !== effect.id));
        }, 500);
    }, []);

    return (
        <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-slate-900 via-purple-950 to-black">

            {/* Spooky Background */}
            <div className="absolute inset-0 overflow-hidden opacity-30">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-purple-400 rounded-full animate-pulse"
                        style={{
                            left: `${(i * 17) % 100}%`,
                            top: `${(i * 23) % 100}%`,
                            animationDelay: `${i * 0.2}s`,
                            opacity: 0.3 + (i % 4) * 0.1
                        }}
                    />
                ))}
            </div>

            {/* Fog effect */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-purple-900/50 to-transparent" />
            </div>

            {/* Ghosts */}
            {ghosts.map(ghost => (
                <div
                    key={ghost.id}
                    className={`absolute transition-all ${ghost.hit ? getFlyAwayStyle(ghost.position) : 'animate-float'}`}
                    style={{
                        ...getGhostStyle(ghost.position),
                    }}
                >
                    <div className="relative">
                        {/* Ghost Glow */}
                        {!ghost.hit && (
                            <div className="absolute -inset-2 sm:-inset-4 bg-cyan-400/30 rounded-full blur-xl animate-pulse" />
                        )}

                        {/* Ghost Emoji - responsive size */}
                        <span className={`text-4xl sm:text-6xl md:text-7xl filter ${ghost.hit ? 'grayscale' : ''} drop-shadow-[0_0_20px_rgba(34,211,238,0.8)] sm:drop-shadow-[0_0_30px_rgba(34,211,238,0.8)]`}>
                            {ghost.hit ? '💀' : '👻'}
                        </span>

                        {/* Hit explosion - responsive */}
                        {ghost.hit && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-3xl sm:text-5xl animate-ping">💥</span>
                            </div>
                        )}

                        {/* Required Punch Indicator - responsive */}
                        {!ghost.hit && (
                            <div className="absolute -bottom-6 sm:-bottom-8 left-1/2 -translate-x-1/2 bg-black/60 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full whitespace-nowrap">
                                <span className="text-sm sm:text-lg mr-1">{getPunchIcon(ghost.requiredPunch)}</span>
                                <span className="text-[10px] sm:text-xs text-cyan-300 font-bold">{getPunchInstruction(ghost.requiredPunch)}</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Hit Effects */}
            {hitEffects.map(effect => (
                <div
                    key={effect.id}
                    className="absolute pointer-events-none animate-ping"
                    style={{ left: `${effect.x}%`, top: `${effect.y}%` }}
                >
                    <span className="text-6xl">💥</span>
                </div>
            ))}

            {/* Punch Effect Overlay */}
            {isPunching && (
                <div className="absolute inset-0 bg-red-500/10 pointer-events-none animate-pulse" />
            )}

            {/* HUD - Score - Mobile Responsive */}
            <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 z-30" style={{ marginTop: 'env(safe-area-inset-top)' }}>
                <div className="bg-black/60 backdrop-blur-lg rounded-lg sm:rounded-xl px-4 py-2 sm:px-6 sm:py-3 border border-cyan-500/30 text-center">
                    <div className="text-[10px] sm:text-xs text-cyan-300 uppercase tracking-wider">Score</div>
                    <div className="text-2xl sm:text-4xl md:text-5xl font-black text-white font-mono">
                        {score}
                    </div>
                </div>
            </div>

            {/* Combo Display - Mobile Responsive */}
            {combo > 1 && (
                <div className="absolute top-16 sm:top-24 left-1/2 -translate-x-1/2 z-30">
                    <div
                        className="bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1 sm:px-6 sm:py-2 rounded-full animate-bounce"
                        style={{ transform: `scale(${1 + combo * 0.03})` }}
                    >
                        <span className="text-white font-black text-sm sm:text-xl">
                            🔥 {combo} COMBO!
                        </span>
                    </div>
                </div>
            )}

            {/* ===== CURRENT PUNCH TYPE DISPLAY - Mobile Responsive ===== */}
            {showPunchLabel && currentPunchLabel !== 'none' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
                    <div className="animate-punch-label">
                        <div className="bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 px-4 py-2 sm:px-8 sm:py-4 rounded-xl sm:rounded-2xl shadow-2xl border-2 sm:border-4 border-white/30">
                            <div className="text-center">
                                <div className="text-3xl sm:text-5xl mb-1 sm:mb-2">{getPunchIcon(currentPunchLabel)}</div>
                                <div className="text-white font-black text-xl sm:text-3xl tracking-wider drop-shadow-lg">
                                    {getPunchInstruction(currentPunchLabel)}
                                </div>
                                <div className="text-yellow-200 text-sm sm:text-lg font-bold mt-0.5 sm:mt-1">
                                    {getPunchNameThai(currentPunchLabel)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Punch Guide - Mobile Responsive */}
            <div className="absolute bottom-2 sm:bottom-4 left-2 right-2 sm:left-4 sm:right-4 z-30" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="bg-black/60 backdrop-blur-lg rounded-lg sm:rounded-xl px-2 py-1.5 sm:px-4 sm:py-2 border border-purple-500/30">
                    <div className="flex justify-around text-center text-[10px] sm:text-xs">
                        <div className={`transition-transform ${lastPunch === 'straight' ? 'scale-110 sm:scale-125' : ''}`}>
                            <div className="text-lg sm:text-2xl">👊</div>
                            <div className="text-purple-300">Straight</div>
                            <div className="text-slate-400 hidden sm:block">ชกตรง</div>
                        </div>
                        <div className={`transition-transform ${lastPunch === 'hook' ? 'scale-110 sm:scale-125' : ''}`}>
                            <div className="text-lg sm:text-2xl">🤜🤛</div>
                            <div className="text-purple-300">Hook</div>
                            <div className="text-slate-400 hidden sm:block">ตวัดข้าง</div>
                        </div>
                        <div className={`transition-transform ${lastPunch === 'uppercut' ? 'scale-110 sm:scale-125' : ''}`}>
                            <div className="text-lg sm:text-2xl">✊</div>
                            <div className="text-purple-300">Uppercut</div>
                            <div className="text-slate-400 hidden sm:block">ชกขึ้น</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) translateX(-50%); }
                    50% { transform: translateY(-10px) translateX(-50%); }
                }
                .animate-float {
                    animation: float 2s ease-in-out infinite;
                }
                
                /* Ghost fly away animations when hit */
                @keyframes fly-up {
                    0% { transform: translateX(-50%) scale(1); opacity: 1; }
                    100% { transform: translateX(-50%) translateY(-200px) rotate(360deg) scale(0); opacity: 0; }
                }
                @keyframes fly-left {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: translateX(-200px) translateY(-100px) rotate(-360deg) scale(0); opacity: 0; }
                }
                @keyframes fly-right {
                    0% { transform: scale(1); opacity: 1; }
                    100% { transform: translateX(200px) translateY(-100px) rotate(360deg) scale(0); opacity: 0; }
                }
                @keyframes fly-down {
                    0% { transform: translateX(-50%) scale(1); opacity: 1; }
                    100% { transform: translateX(-50%) translateY(200px) rotate(-360deg) scale(0); opacity: 0; }
                }
                @keyframes fly-back {
                    0% { transform: translateX(-50%) scale(1); opacity: 1; }
                    100% { transform: translateX(-50%) scale(3) translateY(-50px); opacity: 0; }
                }
                
                .animate-fly-up { animation: fly-up 0.5s ease-out forwards; }
                .animate-fly-left { animation: fly-left 0.5s ease-out forwards; }
                .animate-fly-right { animation: fly-right 0.5s ease-out forwards; }
                .animate-fly-down { animation: fly-down 0.5s ease-out forwards; }
                .animate-fly-back { animation: fly-back 0.5s ease-out forwards; }
                
                /* Punch label animation */
                @keyframes punch-label {
                    0% { transform: scale(0.5); opacity: 0; }
                    20% { transform: scale(1.2); opacity: 1; }
                    40% { transform: scale(1); }
                    80% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(0.8); opacity: 0; }
                }
                .animate-punch-label {
                    animation: punch-label 1s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default GhostPuncherVisuals;
