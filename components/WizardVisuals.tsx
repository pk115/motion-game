import React, { useEffect, useState } from 'react';

// ============================================
// Wizard Spell Visuals
// แสดงพ่อมดร่ายเวท
// ============================================

interface WizardVisualsProps {
    leftArmAngle: number;       // 0-360
    rightArmAngle: number;      // 0-360
    leftRotations: number;      // จำนวนรอบซ้าย
    rightRotations: number;     // จำนวนรอบขวา
    leftDirection: 'forward' | 'backward' | 'none';
    rightDirection: 'forward' | 'backward' | 'none';
    isRotating: boolean;
    spellCharge: number;        // 0-100 พลังเวท
    score: number;
    currentSpell: string;       // ชนิดเวท
    currentPattern?: 'forward' | 'backward'; // แพทเทิร์นปัจจุบัน
    patternProgress?: number;   // ความคืบหน้าในเซต (0-9)
    repsPerSet?: number;        // จำนวนครั้งต่อเซต (default 10)
}

const WizardVisuals: React.FC<WizardVisualsProps> = ({
    leftArmAngle,
    rightArmAngle,
    leftRotations,
    rightRotations,
    leftDirection,
    rightDirection,
    isRotating,
    spellCharge,
    score,
    currentSpell,
    currentPattern = 'forward',
    patternProgress = 0,
    repsPerSet = 10
}) => {
    const [particles, setParticles] = useState<Array<{ id: number, x: number, y: number, color: string }>>([]);
    const [spellCast, setSpellCast] = useState(false);

    // Spell colors based on type (เหลือแค่ fire, ice, arcane)
    const getSpellColor = (spell: string) => {
        switch (spell) {
            case 'fire': return { primary: '#F59E0B', secondary: '#EF4444', emoji: '🔥' };
            case 'ice': return { primary: '#06B6D4', secondary: '#3B82F6', emoji: '❄️' };
            default: return { primary: '#A855F7', secondary: '#EC4899', emoji: '✨' };
        }
    };

    const spellStyle = getSpellColor(currentSpell);

    // Generate magic particles when rotating
    useEffect(() => {
        if (!isRotating) return;

        const interval = setInterval(() => {
            const newParticle = {
                id: Date.now() + Math.random(),
                x: 50 + (Math.random() - 0.5) * 30,
                y: 50 + (Math.random() - 0.5) * 30,
                color: Math.random() > 0.5 ? spellStyle.primary : spellStyle.secondary
            };
            setParticles(prev => [...prev.slice(-20), newParticle]);
        }, 100);

        return () => clearInterval(interval);
    }, [isRotating, spellStyle]);

    // Spell cast effect when score increases
    useEffect(() => {
        if (score > 0 && !spellCast) {
            setSpellCast(true);
            setTimeout(() => setSpellCast(false), 500);
        }
    }, [score, spellCast]);

    return (
        <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-indigo-950 via-purple-900 to-slate-900">

            {/* Magic Stars Background */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(80)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full"
                        style={{
                            left: `${(i * 13) % 100}%`,
                            top: `${(i * 17) % 100}%`,
                            opacity: 0.2 + (i % 5) * 0.15,
                            animation: `twinkle ${2 + (i % 3)}s infinite`,
                            animationDelay: `${(i * 0.1) % 2}s`
                        }}
                    />
                ))}
            </div>

            {/* Magic Circle on Ground */}
            <div
                className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full border-4 opacity-50"
                style={{
                    borderColor: spellStyle.primary,
                    boxShadow: `0 0 30px ${spellStyle.primary}, inset 0 0 30px ${spellStyle.secondary}`,
                    transform: `translateX(-50%) perspective(500px) rotateX(70deg)`,
                    animation: isRotating ? 'pulse 0.5s infinite' : 'none'
                }}
            />

            {/* Floating Particles */}
            {particles.map(p => (
                <div
                    key={p.id}
                    className="absolute w-2 h-2 rounded-full animate-ping"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        backgroundColor: p.color,
                        boxShadow: `0 0 10px ${p.color}`
                    }}
                />
            ))}

            {/* Wizard */}
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2">
                <div className="relative">
                    {/* Magic Aura */}
                    {isRotating && (
                        <div
                            className="absolute -inset-16 rounded-full animate-pulse"
                            style={{
                                background: `radial-gradient(circle, ${spellStyle.primary}40 0%, transparent 70%)`
                            }}
                        />
                    )}

                    {/* Left Arm Magic Circle */}
                    <div
                        className="absolute -left-24 top-0 w-16 h-16 rounded-full border-2 flex items-center justify-center"
                        style={{
                            borderColor: spellStyle.secondary,
                            boxShadow: `0 0 20px ${spellStyle.secondary}`,
                            transform: `rotate(${leftArmAngle}deg)`,
                            opacity: leftDirection !== 'none' ? 1 : 0.3
                        }}
                    >
                        <span className="text-2xl">{leftDirection === 'forward' ? '🔄' : leftDirection === 'backward' ? '🔃' : '○'}</span>
                    </div>

                    {/* Right Arm Magic Circle */}
                    <div
                        className="absolute -right-24 top-0 w-16 h-16 rounded-full border-2 flex items-center justify-center"
                        style={{
                            borderColor: spellStyle.secondary,
                            boxShadow: `0 0 20px ${spellStyle.secondary}`,
                            transform: `rotate(${rightArmAngle}deg)`,
                            opacity: rightDirection !== 'none' ? 1 : 0.3
                        }}
                    >
                        <span className="text-2xl">{rightDirection === 'forward' ? '🔄' : rightDirection === 'backward' ? '🔃' : '○'}</span>
                    </div>

                    {/* Wizard Emoji */}
                    <span className="text-7xl sm:text-8xl md:text-9xl filter drop-shadow-[0_0_30px_rgba(168,85,247,0.8)]">
                        🧙‍♂️
                    </span>
                </div>
            </div>

            {/* Spell Cast Effect */}
            {spellCast && (
                <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
                    <div
                        className="text-9xl animate-ping"
                        style={{ filter: `drop-shadow(0 0 50px ${spellStyle.primary})` }}
                    >
                        {spellStyle.emoji}
                    </div>
                </div>
            )}

            {/* HUD - Score */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
                <div className="bg-black/50 backdrop-blur-lg rounded-xl px-6 py-3 border border-purple-500/30 text-center">
                    <div className="text-xs text-purple-300 uppercase tracking-wider">Magic Power</div>
                    <div className="text-4xl sm:text-5xl font-black text-white font-mono">
                        {score}
                    </div>
                </div>
            </div>

            {/* Total Rotations Display (แทนที่ Spell Charge Bar) */}
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30">
                <div className="bg-black/50 backdrop-blur-lg rounded-xl px-6 py-3 border border-purple-500/30 text-center">
                    <div className="text-xs text-purple-300 uppercase tracking-wider">รอบที่หมุน</div>
                    <div className="text-3xl font-bold text-white flex items-center gap-2 justify-center">
                        <span>🔄</span>
                        <span className="font-mono">{leftRotations + rightRotations}</span>
                    </div>
                </div>
            </div>

            {/* Current Pattern & Progress */}
            <div className="absolute top-44 left-1/2 -translate-x-1/2 z-30">
                <div className="bg-black/60 backdrop-blur-lg rounded-xl px-6 py-3 border-2 border-purple-500/50 text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-3xl">{spellStyle.emoji}</span>
                        <div>
                            <div className="text-xs text-purple-300 uppercase">Current Set</div>
                            <div className="text-white font-black text-lg capitalize">{currentPattern === 'forward' ? '🔥 Fire' : '❄️ Ice'}</div>
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <div className="text-yellow-400 font-bold text-xl">
                            {patternProgress} / {repsPerSet}
                        </div>
                        <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                                style={{ width: `${(patternProgress / repsPerSet) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Rotation Counters */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between z-30">
                {/* Left Arm */}
                <div className="bg-black/50 backdrop-blur-lg rounded-xl px-4 py-2 border border-cyan-500/30">
                    <div className="text-xs text-cyan-300 uppercase">Left Arm</div>
                    <div className="text-2xl font-bold text-white">🔄 {leftRotations}</div>
                </div>

                {/* Right Arm */}
                <div className="bg-black/50 backdrop-blur-lg rounded-xl px-4 py-2 border border-pink-500/30">
                    <div className="text-xs text-pink-300 uppercase">Right Arm</div>
                    <div className="text-2xl font-bold text-white">🔄 {rightRotations}</div>
                </div>
            </div>

            {/* CSS Animations */}
            <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
      `}</style>
        </div>
    );
};

export default WizardVisuals;
