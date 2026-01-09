import React, { useEffect, useState } from 'react';
import { getLeaderboard } from '../services/dbService';
import { LeaderboardCategory, LeaderboardLevel, ScoreEntry } from '../../types';
import { useAuth } from '../contexts/AuthContext';

interface LeaderboardProps {
    onBack: () => void;
    initialGameId?: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ onBack, initialGameId = 'climber' }) => {
    const { user } = useAuth();
    const [scores, setScores] = useState<ScoreEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fixLink, setFixLink] = useState<string | null>(null);

    // Default selection
    const [category, setCategory] = useState<LeaderboardCategory>('cumulative');
    const [level, setLevel] = useState<LeaderboardLevel>('world');
    const [gameId, setGameId] = useState<string>(initialGameId);

    // Update gameId if prop changes
    useEffect(() => {
        setGameId(initialGameId);
    }, [initialGameId]);

    useEffect(() => {
        const fetchScores = async () => {
            setLoading(true);
            setError(null);
            setFixLink(null);
            try {
                let locationValue = 'Earth';
                if (level !== 'world') {
                    if (!user?.location) {
                        if (user?.location && user.location[level]) {
                            locationValue = user.location[level];
                        } else {
                            // If we really can't determine location
                            if (level === 'continent') locationValue = 'Unknown';
                            else if (level === 'country') locationValue = 'Unknown';
                            else if (level === 'province') locationValue = 'Unknown';
                            else {
                                setScores([]);
                                return;
                            }
                        }
                    } else {
                        locationValue = user.location[level] || 'Unknown';
                    }
                }

                const data = await getLeaderboard(level, locationValue, category, gameId);
                setScores(data);
            } catch (error: any) {
                console.error("Error fetching leaderboard:", error);

                if (error.code === 'failed-precondition' || error.message?.includes('index')) {
                    setError("Missing Database Index.");
                    const match = error.message?.match(/(https:\/\/console\.firebase\.google\.com[^\s]+)/);
                    if (match) {
                        setFixLink(match[0]);
                    }
                } else {
                    setError("Failed to load rankings.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchScores();
    }, [category, level, user, gameId]);

    // Helper for active tab style
    const getTypeTabClass = (isActive: boolean) =>
        `flex-1 py-3 text-center cursor-pointer transition-all duration-300 font-bold uppercase tracking-wider text-sm ${isActive ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white/10 text-slate-400 hover:bg-white/20'}`;

    const getGameTabClass = (id: string, activeId: string, color: string) => {
        const isActive = id === activeId;
        const colorClasses: { [key: string]: string } = {
            green: isActive ? 'bg-green-600 border-green-400 text-white shadow-lg scale-105' : '',
            red: isActive ? 'bg-red-600 border-red-400 text-white shadow-lg scale-105' : '',
            blue: isActive ? 'bg-blue-600 border-blue-400 text-white shadow-lg scale-105' : '',
            purple: isActive ? 'bg-purple-600 border-purple-400 text-white shadow-lg scale-105' : '',
            indigo: isActive ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg scale-105' : '',
            cyan: isActive ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg scale-105' : '',
            pink: isActive ? 'bg-pink-600 border-pink-400 text-white shadow-lg scale-105' : '',
        };
        return `px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${isActive ? colorClasses[color] : 'border-transparent bg-white/5 text-slate-400 hover:bg-white/10'}`;
    };

    const getLevelTabClass = (isActive: boolean) =>
        `px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border ${isActive ? 'bg-amber-500 border-amber-400 text-white shadow-md' : 'bg-transparent border-white/20 text-slate-400 hover:border-white/50'}`;

    return (
        <div className="scrollable-page bg-slate-900 text-white font-sans p-3 sm:p-4 md:p-8" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))', paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
            <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4 md:space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between pt-2 sm:pt-0">
                    <button
                        onClick={onBack}
                        className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                        </svg>
                    </button>
                    <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                        LEADERBOARD
                    </h2>
                    <div className="w-8 sm:w-10"></div>
                </div>

                {/* GAME SELECTOR */}
                <div className="flex justify-center gap-2 sm:gap-3 md:gap-4 bg-black/40 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-white/5 overflow-x-auto">
                    <button onClick={() => setGameId('climber')} className={getGameTabClass('climber', gameId, 'green')}>
                        🐵 <span className="hidden xs:inline sm:inline">Climber</span>
                    </button>
                    <button onClick={() => setGameId('mosquito')} className={getGameTabClass('mosquito', gameId, 'red')}>
                        🦟 <span className="hidden xs:inline sm:inline">Mosquito</span>
                    </button>
                    <button onClick={() => setGameId('train')} className={getGameTabClass('train', gameId, 'blue')}>
                        💣 <span className="hidden xs:inline sm:inline">Bomb</span>
                    </button>
                    <button onClick={() => setGameId('highknees')} className={getGameTabClass('highknees', gameId, 'purple')}>
                        👹 <span className="hidden xs:inline sm:inline">Monster</span>
                    </button>
                    <button onClick={() => setGameId('wizard')} className={getGameTabClass('wizard', gameId, 'indigo')}>
                        🧙‍♂️ <span className="hidden xs:inline sm:inline">Wizard</span>
                    </button>
                    <button onClick={() => setGameId('ghost')} className={getGameTabClass('ghost', gameId, 'cyan')}>
                        👻 <span className="hidden xs:inline sm:inline">Ghost</span>
                    </button>
                    <button onClick={() => setGameId('laser')} className={getGameTabClass('laser', gameId, 'pink')}>
                        💃 <span className="hidden xs:inline sm:inline">Laser</span>
                    </button>
                </div>

                {/* Score Type Tabs */}
                <div className="flex rounded-xl sm:rounded-2xl overflow-hidden bg-black/30 p-0.5 sm:p-1">
                    <div
                        className={`rounded-lg sm:rounded-xl ${getTypeTabClass(category === 'cumulative')}`}
                        onClick={() => setCategory('cumulative')}
                    >
                        🏆 <span className="hidden xs:inline sm:inline">Total </span>Score
                    </div>
                    <div
                        className={`rounded-lg sm:rounded-xl ${getTypeTabClass(category === 'endurance')}`}
                        onClick={() => setCategory('endurance')}
                    >
                        ⚡ <span className="hidden xs:inline sm:inline">Best </span>Round
                    </div>
                </div>

                {/* Level Tabs */}
                <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 md:gap-4 overflow-x-auto pb-1 sm:pb-2">
                    <div className={getLevelTabClass(level === 'world')} onClick={() => setLevel('world')}>🌎 <span className="hidden sm:inline">World</span><span className="sm:hidden">W</span></div>
                    <div className={getLevelTabClass(level === 'continent')} onClick={() => setLevel('continent')}>🗺️ <span className="hidden sm:inline">Continent</span><span className="sm:hidden">C</span></div>
                    <div className={getLevelTabClass(level === 'country')} onClick={() => setLevel('country')}>🇹🇭 <span className="hidden sm:inline">Country</span><span className="sm:hidden">TH</span></div>
                    <div className={getLevelTabClass(level === 'province')} onClick={() => setLevel('province')}>🏙️ <span className="hidden sm:inline">Province</span><span className="sm:hidden">P</span></div>
                </div>

                {/* Location Badge */}
                <div className="text-center">
                    <span className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 bg-white/5 rounded-full text-[10px] sm:text-xs text-slate-400 border border-white/10">
                        Viewing: <span className="text-emerald-300 font-bold">{user?.location?.[level] || (level === 'world' ? 'Earth' : 'Unknown')}</span>
                    </span>
                </div>

                {/* List */}
                <div className="bg-black/20 rounded-2xl sm:rounded-3xl overflow-hidden border border-white/5 min-h-[300px] sm:min-h-[400px] relative">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-48 sm:h-64 space-y-3 sm:space-y-4">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-500 animate-pulse text-sm sm:text-base">Fetching Rankings...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 text-center h-48 sm:h-64">
                            <div className="text-red-400 text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4">⚠️</div>
                            <p className="text-white font-bold text-base sm:text-lg mb-2">{error}</p>
                            {fixLink ? (
                                <a
                                    href={fixLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500 hover:bg-red-400 text-white rounded-full font-bold text-xs sm:text-sm transition-all"
                                >
                                    🔧 Click here to fix Database
                                </a>
                            ) : (
                                <p className="text-slate-400 text-xs sm:text-sm max-w-xs">Check console for details.</p>
                            )}
                        </div>
                    ) : (() => {
                        // Show only Top 20
                        const top20 = scores.slice(0, 20);

                        // Find current user's position in full list
                        const myIndex = scores.findIndex(s => s.uid === user?.uid);
                        const isInTop20 = myIndex >= 0 && myIndex < 20;
                        const myEntry = myIndex >= 0 ? scores[myIndex] : null;

                        return (
                            <>
                                <ul className={`divide-y divide-white/5 ${myEntry && !isInTop20 ? 'pb-16' : ''}`}>
                                    {top20.map((entry, index) => {
                                        const isMe = user?.uid === entry.uid;
                                        return (
                                            <li
                                                key={index}
                                                className={`flex items-center p-2 sm:p-3 md:p-4 transition-colors ${isMe ? 'bg-emerald-500/10' : 'hover:bg-white/5'}`}
                                            >
                                                {/* Rank */}
                                                <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full font-black text-sm sm:text-base md:text-lg mr-2 sm:mr-3 md:mr-4 ${index === 0 ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)]' :
                                                    index === 1 ? 'bg-slate-300 text-black' :
                                                        index === 2 ? 'bg-orange-700 text-white' :
                                                            'bg-white/5 text-slate-400'
                                                    }`}>
                                                    {index + 1}
                                                </div>

                                                {/* Avatar */}
                                                <img
                                                    src={entry.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${entry.uid}`}
                                                    alt={entry.displayName}
                                                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full border-2 border-white/10 bg-slate-800 object-cover mr-2 sm:mr-3 md:mr-4"
                                                />

                                                {/* Name */}
                                                <div className="flex-1 min-w-0 flex items-center">
                                                    <div className={`font-bold truncate text-sm sm:text-base md:text-lg ${isMe ? 'text-emerald-300' : 'text-white'}`}>
                                                        {entry.displayName} {isMe && <span className="text-[10px] sm:text-xs">(You)</span>}
                                                    </div>
                                                </div>

                                                {/* Score */}
                                                <div className="text-right">
                                                    <div className="font-mono font-black text-lg sm:text-xl md:text-2xl text-white tracking-tight">
                                                        {entry.score.toLocaleString()}
                                                    </div>
                                                </div>
                                            </li>
                                        );
                                    })}

                                    {scores.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-48 sm:h-64 text-slate-500">
                                            <p className="text-3xl sm:text-4xl mb-2">🙈</p>
                                            <p className="text-sm sm:text-base">No scores found here yet.</p>
                                            <p className="text-xs sm:text-sm">Be the first to climb!</p>
                                        </div>
                                    )}
                                </ul>

                                {/* Sticky row for current user if outside Top 20 */}
                                {myEntry && !isInTop20 && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900/95 to-slate-900/80 border-t border-emerald-500/30">
                                        <div className="flex items-center p-2 sm:p-3 md:p-4 bg-emerald-500/20">
                                            {/* Rank */}
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full font-black text-sm sm:text-base md:text-lg mr-2 sm:mr-3 md:mr-4 bg-emerald-600 text-white">
                                                {myIndex + 1}
                                            </div>

                                            {/* Avatar */}
                                            <img
                                                src={myEntry.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${myEntry.uid}`}
                                                alt={myEntry.displayName}
                                                className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full border-2 border-emerald-400/50 bg-slate-800 object-cover mr-2 sm:mr-3 md:mr-4"
                                            />

                                            {/* Name */}
                                            <div className="flex-1 min-w-0 flex items-center">
                                                <div className="font-bold truncate text-sm sm:text-base md:text-lg text-emerald-300">
                                                    {myEntry.displayName} <span className="text-[10px] sm:text-xs">(You)</span>
                                                </div>
                                            </div>

                                            {/* Score */}
                                            <div className="text-right">
                                                <div className="font-mono font-black text-lg sm:text-xl md:text-2xl text-emerald-300 tracking-tight">
                                                    {myEntry.score.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;
