import React from 'react';

interface LandingPageProps {
    onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
    return (
        <div className="scrollable-page bg-slate-900 text-white font-sans flex flex-col relative">

            {/* Background Ambience */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[300px] sm:w-[400px] md:w-[600px] h-[300px] sm:h-[400px] md:h-[600px] bg-emerald-500/20 rounded-full blur-[80px] sm:blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-5%] w-[250px] sm:w-[350px] md:w-[500px] h-[250px] sm:h-[350px] md:h-[500px] bg-purple-500/20 rounded-full blur-[80px] sm:blur-[100px] animate-pulse delay-1000"></div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-4 sm:px-6 text-center" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

                <div className="mb-6 sm:mb-8 relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-blue-600 rounded-xl sm:rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative border-2 sm:border-4 border-white/10 bg-black/30 backdrop-blur-md rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-400 tracking-tighter drop-shadow-2xl">
                            MOTION<br />ARCADE
                        </h1>
                    </div>
                </div>

                <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-300 mb-8 sm:mb-10 md:mb-12 max-w-md sm:max-w-lg md:max-w-2xl font-light leading-relaxed px-4">
                    The future of gaming is <span className="text-emerald-400 font-bold">YOU</span>. <br />
                    Control the game with your body movements. <br />
                    <span className="text-[10px] sm:text-xs md:text-sm opacity-60 mt-2 block">Powered by AI Vision</span>
                </p>

                <button
                    onClick={onStart}
                    className="group relative px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 bg-white text-slate-900 rounded-full font-black text-lg sm:text-xl md:text-2xl tracking-widest hover:bg-emerald-400 hover:text-white transition-all duration-300 shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] transform hover:-translate-y-1"
                >
                    ENTER ARCADE
                    <span className="absolute right-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all">→</span>
                </button>

            </div>

            {/* Developer Footer */}
            <div className="relative z-10 bg-black/40 backdrop-blur-md border-t border-white/10 p-4 sm:p-6 md:p-8" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                <div className="max-w-4xl mx-auto text-center">
                    <h3 className="text-slate-400 uppercase tracking-widest text-[10px] sm:text-xs font-bold mb-3 sm:mb-4 md:mb-6">Developed by TheUncleDev</h3>

                    <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4">
                        <a href="https://linktr.ee/sleepeye" target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white/5 hover:bg-green-500/20 rounded-lg transition-colors border border-white/5 hover:border-green-500/50 text-[10px] sm:text-xs md:text-sm">
                            <span className="text-green-400">🌲</span> <span className="hidden xs:inline sm:inline">Linktree</span><span className="xs:hidden sm:hidden">Link</span>
                        </a>

                        <a href="https://www.facebook.com/profile.php?id=1000000000000" target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white/5 hover:bg-blue-600/20 rounded-lg transition-colors border border-white/5 hover:border-blue-500/50 text-[10px] sm:text-xs md:text-sm">
                            <span className="text-blue-400">🔵</span> <span className="hidden xs:inline sm:inline">Facebook</span><span className="xs:hidden sm:hidden">FB</span>
                        </a>

                        <a href="https://www.tiktok.com/@the_uncledev" target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white/5 hover:bg-pink-600/20 rounded-lg transition-colors border border-white/5 hover:border-pink-500/50 text-[10px] sm:text-xs md:text-sm">
                            <span className="text-pink-400">🎵</span> TikTok
                        </a>

                        <a href="https://lin.ee/KNLpKuZ" target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white/5 hover:bg-green-400/20 rounded-lg transition-colors border border-white/5 hover:border-green-400/50 text-[10px] sm:text-xs md:text-sm">
                            <span className="text-green-400">💬</span> Line
                        </a>
                    </div>

                    <div className="mt-4 sm:mt-6 md:mt-8 text-slate-600 text-[10px] sm:text-xs">
                        © 2025 Motion Arcade. BORN TO MOVE.
                    </div>
                </div>
            </div>

        </div>
    );
};

export default LandingPage;
