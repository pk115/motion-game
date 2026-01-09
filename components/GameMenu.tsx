import React from 'react';
import { useAuth } from '../src/contexts/AuthContext';

interface GameMenuProps {
  onSelectGame: (gameId: string) => void;
  onViewLeaderboard: (gameId: string) => void;
}

const GameMenu: React.FC<GameMenuProps> = ({ onSelectGame, onViewLeaderboard }) => {
  const { user, signOut } = useAuth();

  return (
    <div className="scrollable-page bg-slate-900 flex flex-col items-center p-3 sm:p-4 md:p-6 font-sans selection:bg-emerald-500 selection:text-white relative pb-8" style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>

      {/* User Profile & Logout - Top Right */}
      {user && (
        <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50 flex items-center gap-2 sm:gap-3 bg-black/80 backdrop-blur-md p-1.5 sm:p-2 rounded-full border border-white/10 pr-3 sm:pr-4" style={{ marginTop: 'env(safe-area-inset-top)' }}>
          {/* Avatar */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-600 flex items-center justify-center overflow-hidden border-2 border-indigo-400 font-bold text-white shadow-lg text-sm sm:text-base">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
            ) : (
              <span>{user.displayName ? user.displayName.charAt(0).toUpperCase() : 'G'}</span>
            )}
          </div>

          {/* Name & Logout */}
          <div className="flex flex-row items-center gap-2">
            <span className="text-white font-medium text-xs sm:text-sm hidden sm:block max-w-[100px] md:max-w-[150px] truncate">
              {user.displayName || 'Guest'}
            </span>
            <button
              onClick={signOut}
              className="bg-red-500/80 hover:bg-red-600 text-white text-[10px] sm:text-xs font-bold py-1 sm:py-1.5 px-2 sm:px-3 rounded-full transition-colors"
            >
              LOGOUT
            </button>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="pt-16 sm:pt-20 md:pt-8 pb-4 sm:pb-6 md:pb-8 flex flex-col items-center" style={{ paddingTop: 'max(64px, calc(env(safe-area-inset-top) + 48px))' }}>
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-1 sm:mb-2 drop-shadow-lg text-center tracking-tight">
          MOTION ARCADE
        </h1>
        <p className="text-slate-400 font-medium tracking-wide uppercase text-[10px] sm:text-xs md:text-sm">Select your challenge</p>
      </div>

      {/* Game Cards Grid - Responsive: 1 col mobile, 2 col tablet, 3 col desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 w-full max-w-7xl px-3 sm:px-4">
        {/* Game 1: Monkey Climber */}
        <div
          onClick={() => onSelectGame('climber')}
          className="group relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-green-600 to-emerald-900 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] border-2 border-slate-800 hover:border-emerald-400 cursor-pointer flex flex-col"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')] opacity-20 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300"></div>

          <div className="absolute inset-0 flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 z-10 text-center">
            <div className="bg-white/10 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4 backdrop-blur-sm group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110">
              <span className="text-3xl sm:text-4xl md:text-5xl filter drop-shadow-lg">🐵</span>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-white mb-0.5 sm:mb-1 tracking-wide group-hover:text-emerald-200">MONKEY CLIMBER</h2>
            <p className="text-emerald-100 text-[10px] sm:text-xs font-medium leading-snug opacity-80 group-hover:opacity-100 mb-2 sm:mb-4 md:mb-6 max-w-[150px] sm:max-w-[180px] hidden sm:block">
              Squat to climb the infinite tree!
            </p>

            <div className="flex gap-2 w-full justify-center px-1 sm:px-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGame('climber');
                }}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs shadow-lg transition-all transform hover:scale-105 active:scale-95 border border-emerald-400/50">
                🎮 PLAY
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewLeaderboard('climber');
                }}
                className="flex-1 bg-black/40 hover:bg-black/60 text-white py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs border border-white/20 hover:border-emerald-400/50 transition-all backdrop-blur-sm">
                🏆 RANK
              </button>
            </div>
          </div>
        </div>

        {/* Game 2: Mosquito Slap */}
        <div
          onClick={() => onSelectGame('mosquito')}
          className="group relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-red-600 to-rose-900 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(244,63,94,0.4)] border-2 border-slate-800 hover:border-rose-400 cursor-pointer flex flex-col"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-20 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300"></div>

          <div className="absolute inset-0 flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 z-10 text-center">
            <div className="bg-white/10 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4 backdrop-blur-sm group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110">
              <span className="text-3xl sm:text-4xl md:text-5xl filter drop-shadow-lg">🦟</span>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-white mb-0.5 sm:mb-1 tracking-wide group-hover:text-rose-200">MOSQUITO SLAP</h2>
            <p className="text-rose-100 text-[10px] sm:text-xs font-medium leading-snug opacity-80 group-hover:opacity-100 mb-2 sm:mb-4 md:mb-6 max-w-[150px] sm:max-w-[180px] hidden sm:block">
              Swat annoying bugs with your hands!
            </p>

            <div className="flex gap-2 w-full justify-center px-1 sm:px-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGame('mosquito');
                }}
                className="flex-1 bg-rose-500 hover:bg-rose-400 text-white py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs shadow-lg transition-all transform hover:scale-105 active:scale-95 border border-rose-400/50">
                🎮 PLAY
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewLeaderboard('mosquito');
                }}
                className="flex-1 bg-black/40 hover:bg-black/60 text-white py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs border border-white/20 hover:border-rose-400/50 transition-all backdrop-blur-sm">
                🏆 RANK
              </button>
            </div>
          </div>
        </div>

        {/* Game 3: Bomb Dodge */}
        <div
          onClick={() => onSelectGame('train')}
          className="group relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-orange-600 to-amber-900 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] border-2 border-slate-800 hover:border-orange-400 cursor-pointer flex flex-col"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300"></div>

          <div className="absolute inset-0 flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 z-10 text-center">
            <div className="bg-white/10 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4 backdrop-blur-sm group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110">
              <span className="text-3xl sm:text-4xl md:text-5xl filter drop-shadow-lg">💣</span>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-white mb-0.5 sm:mb-1 tracking-wide group-hover:text-orange-200">BOMB DODGE</h2>
            <p className="text-orange-100 text-[10px] sm:text-xs font-medium leading-snug opacity-80 group-hover:opacity-100 mb-2 sm:mb-4 md:mb-6 max-w-[150px] sm:max-w-[180px] hidden sm:block">
              Move left and right to survive!
            </p>

            <div className="flex gap-2 w-full justify-center px-1 sm:px-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGame('train');
                }}
                className="flex-1 bg-orange-500 hover:bg-orange-400 text-white py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs shadow-lg transition-all transform hover:scale-105 active:scale-95 border border-orange-400/50">
                🎮 PLAY
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewLeaderboard('train');
                }}
                className="flex-1 bg-black/40 hover:bg-black/60 text-white py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs border border-white/20 hover:border-orange-400/50 transition-all backdrop-blur-sm">
                🏆 RANK
              </button>
            </div>
          </div>
        </div>

        {/* Game 4: High Knees - Monster Chase */}
        <div
          onClick={() => onSelectGame('highknees')}
          className="group relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-purple-600 to-pink-900 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] border-2 border-slate-800 hover:border-purple-400 cursor-pointer flex flex-col"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300"></div>

          <div className="absolute inset-0 flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 z-10 text-center">
            <div className="bg-white/10 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4 backdrop-blur-sm group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110">
              <span className="text-3xl sm:text-4xl md:text-5xl filter drop-shadow-lg">👹🏃</span>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-white mb-0.5 sm:mb-1 tracking-wide group-hover:text-purple-200">MONSTER CHASE</h2>
            <p className="text-purple-100 text-[10px] sm:text-xs font-medium leading-snug opacity-80 group-hover:opacity-100 mb-2 sm:mb-4 md:mb-6 max-w-[150px] sm:max-w-[180px] hidden sm:block">
              High knees to run from the monster!
            </p>

            <div className="flex gap-2 w-full justify-center px-1 sm:px-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGame('highknees');
                }}
                className="flex-1 bg-purple-500 hover:bg-purple-400 text-white py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs shadow-lg transition-all transform hover:scale-105 active:scale-95 border border-purple-400/50">
                🎮 PLAY
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewLeaderboard('highknees');
                }}
                className="flex-1 bg-black/40 hover:bg-black/60 text-white py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs border border-white/20 hover:border-purple-400/50 transition-all backdrop-blur-sm">
                🏆 RANK
              </button>
            </div>
          </div>
        </div>

        {/* Game 5: Wizard Spell - Arm Circles */}
        <div
          onClick={() => onSelectGame('wizard')}
          className="group relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-indigo-600 to-violet-900 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] border-2 border-slate-800 hover:border-indigo-400 cursor-pointer flex flex-col"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300"></div>

          <div className="absolute inset-0 flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 z-10 text-center">
            <div className="bg-white/10 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4 backdrop-blur-sm group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110">
              <span className="text-3xl sm:text-4xl md:text-5xl filter drop-shadow-lg">🧙‍♂️</span>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-white mb-0.5 sm:mb-1 tracking-wide group-hover:text-indigo-200">WIZARD SPELL</h2>
            <p className="text-indigo-100 text-[10px] sm:text-xs font-medium leading-snug opacity-80 group-hover:opacity-100 mb-2 sm:mb-4 md:mb-6 max-w-[150px] sm:max-w-[180px] hidden sm:block">
              Rotate arms to cast magic spells!
            </p>

            <div className="flex gap-2 w-full justify-center px-1 sm:px-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGame('wizard');
                }}
                className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs shadow-lg transition-all transform hover:scale-105 active:scale-95 border border-indigo-400/50">
                🎮 PLAY
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewLeaderboard('wizard');
                }}
                className="flex-1 bg-black/40 hover:bg-black/60 text-white py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs border border-white/20 hover:border-indigo-400/50 transition-all backdrop-blur-sm">
                🏆 RANK
              </button>
            </div>
          </div>
        </div>

        {/* Game 6: Ghost Puncher */}
        <div
          onClick={() => onSelectGame('ghost')}
          className="group relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-slate-700 to-gray-900 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] border-2 border-slate-800 hover:border-cyan-400 cursor-pointer flex flex-col"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300"></div>

          <div className="absolute inset-0 flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 z-10 text-center">
            <div className="bg-white/10 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4 backdrop-blur-sm group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110">
              <span className="text-3xl sm:text-4xl md:text-5xl filter drop-shadow-lg">👻</span>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-white mb-0.5 sm:mb-1 tracking-wide group-hover:text-cyan-200">GHOST PUNCHER</h2>
            <p className="text-cyan-100 text-[10px] sm:text-xs font-medium leading-snug opacity-80 group-hover:opacity-100 mb-2 sm:mb-4 md:mb-6 max-w-[150px] sm:max-w-[180px] hidden sm:block">
              Punch ghosts with combos!
            </p>

            <div className="flex gap-2 w-full justify-center px-1 sm:px-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGame('ghost');
                }}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs shadow-lg transition-all transform hover:scale-105 active:scale-95 border border-cyan-400/50">
                🎮 PLAY
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewLeaderboard('ghost');
                }}
                className="flex-1 bg-black/40 hover:bg-black/60 text-white py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs border border-white/20 hover:border-cyan-400/50 transition-all backdrop-blur-sm">
                🏆 RANK
              </button>
            </div>
          </div>
        </div>

        {/* Game 7: Ninja Dodge - Torso Twist */}
        <div
          onClick={() => onSelectGame('laser')}
          className="group relative h-48 sm:h-64 md:h-80 bg-gradient-to-br from-indigo-600 to-purple-900 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] border-2 border-slate-800 hover:border-indigo-400 cursor-pointer flex flex-col"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-300"></div>

          <div className="absolute inset-0 flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 z-10 text-center">
            <div className="bg-white/10 w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-2 sm:mb-3 md:mb-4 backdrop-blur-sm group-hover:bg-white/20 transition-all duration-300 group-hover:scale-110">
              <span className="text-3xl sm:text-4xl md:text-5xl filter drop-shadow-lg">🥷</span>
            </div>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-white mb-0.5 sm:mb-1 tracking-wide group-hover:text-indigo-200">NINJA DODGE</h2>
            <p className="text-indigo-100 text-[10px] sm:text-xs font-medium leading-snug opacity-80 group-hover:opacity-100 mb-2 sm:mb-4 md:mb-6 max-w-[150px] sm:max-w-[180px] hidden sm:block">
              Twist to dodge ninja stars!
            </p>

            <div className="flex gap-2 w-full justify-center px-1 sm:px-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectGame('laser');
                }}
                className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs shadow-lg transition-all transform hover:scale-105 active:scale-95 border border-indigo-400/50">
                🎮 PLAY
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewLeaderboard('laser');
                }}
                className="flex-1 bg-black/40 hover:bg-black/60 text-white py-1.5 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs border border-white/20 hover:border-indigo-400/50 transition-all backdrop-blur-sm">
                🏆 RANK
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full mt-6 sm:mt-8 md:mt-12 border-t border-white/10 pt-4 sm:pt-6 md:pt-8" style={{ paddingBottom: 'max(24px, calc(env(safe-area-inset-bottom) + 16px))' }}>
        <div className="max-w-4xl mx-auto text-center px-3 sm:px-4">
          <img src="/images/logouncledevmini.png" alt="The Uncle Dev" className="w-10 sm:w-12 md:w-16 mx-auto mb-2 sm:mb-3 md:mb-4 opacity-80 hover:opacity-100 transition-opacity" />
          <h3 className="text-slate-400 uppercase tracking-widest text-[10px] sm:text-xs font-bold mb-3 sm:mb-4 md:mb-6">Developed by TheUncleDev</h3>

          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4">
            <a href="https://linktr.ee/sleepeye" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white/5 hover:bg-green-500/20 rounded-lg transition-colors border border-white/5 hover:border-green-500/50 text-[10px] sm:text-xs md:text-sm text-slate-300 hover:text-white">
              <span className="text-green-400">🌲</span> <span className="hidden sm:inline">Linktree</span><span className="sm:hidden">Link</span>
            </a>

            <a href="https://www.facebook.com/profile.php?id=1000000000000" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white/5 hover:bg-blue-600/20 rounded-lg transition-colors border border-white/5 hover:border-blue-500/50 text-[10px] sm:text-xs md:text-sm text-slate-300 hover:text-white">
              <span className="text-blue-400">🔵</span> <span className="hidden sm:inline">Facebook</span><span className="sm:hidden">FB</span>
            </a>

            <a href="https://www.tiktok.com/@the_uncledev" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white/5 hover:bg-pink-600/20 rounded-lg transition-colors border border-white/5 hover:border-pink-500/50 text-[10px] sm:text-xs md:text-sm text-slate-300 hover:text-white">
              <span className="text-pink-400">🎵</span> TikTok
            </a>

            <a href="https://lin.ee/KNLpKuZ" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-white/5 hover:bg-green-400/20 rounded-lg transition-colors border border-white/5 hover:border-green-400/50 text-[10px] sm:text-xs md:text-sm text-slate-300 hover:text-white">
              <span className="text-green-400">💬</span> Line
            </a>
          </div>

          <div className="mt-4 sm:mt-6 md:mt-8 text-slate-600 text-[10px] sm:text-xs">
            © 2025 Motion Arcade | Gemini AI & MediaPipe
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameMenu;