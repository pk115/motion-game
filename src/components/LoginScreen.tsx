import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen: React.FC = () => {
    const { signInWithGoogle, signInAsGuest } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [nickname, setNickname] = useState('');

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError(null);
        try {
            await signInWithGoogle();
        } catch (err) {
            setError('Failed to sign in with Google');
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        if (!nickname.trim()) {
            setError('Please enter a nickname');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await signInAsGuest(nickname);
        } catch (err: any) {
            console.error("Guest login error:", err);
            if (err.code === 'auth/admin-restricted-operation' || err.message?.includes('admin-restricted-operation')) {
                setError('⚠️ ENABLE GUEST MODE: Go to Firebase Console > Authentication > Sign-in method > Enable Anonymous');
            } else {
                setError(err.message || 'Failed to sign in as Guest');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="scrollable-page bg-slate-900 flex items-center justify-center p-3 sm:p-4 relative font-sans" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

            {/* Ambient Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[300px] sm:w-[400px] md:w-[600px] h-[300px] sm:h-[400px] md:h-[600px] bg-emerald-500/20 rounded-full blur-[80px] sm:blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[300px] sm:w-[400px] md:w-[600px] h-[300px] sm:h-[400px] md:h-[600px] bg-purple-600/20 rounded-full blur-[80px] sm:blur-[100px] animate-pulse delay-700"></div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-[95vw] sm:max-w-md bg-black/40 backdrop-blur-xl border border-white/10 p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-2xl transform transition-all animate-fade-in-up">

                <div className="text-center mb-5 sm:mb-6 md:mb-8">
                    <img
                        src="/images/logouncledevmini.png"
                        alt="Logo"
                        className="w-20 sm:w-24 md:w-32 mx-auto mb-3 sm:mb-4 drop-shadow-2xl hover:scale-105 transition-transform duration-300"
                    />
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-1 sm:mb-2 drop-shadow-sm tracking-tight">
                        PLAYER LOGIN
                    </h1>
                    <p className="text-slate-400 text-[10px] sm:text-xs md:text-sm font-medium uppercase tracking-widest">Identify Yourself</p>
                </div>

                {error && (
                    <div className="mb-4 sm:mb-5 md:mb-6 bg-red-500/10 border border-red-500/50 text-red-200 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl text-center text-xs sm:text-sm font-semibold">
                        ⚠️ {error}
                    </div>
                )}

                <div className="space-y-4 sm:space-y-5 md:space-y-6">
                    {/* Google Login Button */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full group relative flex items-center justify-center gap-2 sm:gap-3 bg-white text-slate-900 font-bold py-3 sm:py-3.5 md:py-4 px-4 sm:px-6 rounded-xl sm:rounded-2xl transition-all duration-300 transform hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base"
                    >
                        {/* Google Icon SVG */}
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        {loading ? 'Connecting...' : 'Continue with Google'}
                    </button>

                    <div className="flex items-center gap-3 sm:gap-4 text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                        <div className="h-px bg-white/10 flex-1"></div>
                        <span>OR</span>
                        <div className="h-px bg-white/10 flex-1"></div>
                    </div>

                    {/* Guest Login Section */}
                    <div className="bg-slate-800/50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5">
                        <label className="block text-slate-400 text-[10px] sm:text-xs font-bold uppercase mb-1.5 sm:mb-2 ml-0.5 sm:ml-1">
                            Guest Access
                        </label>
                        <input
                            type="text"
                            placeholder="Enter Codename (Nickname)"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            disabled={loading}
                            className="w-full bg-slate-900/80 border border-slate-700 text-white placeholder-slate-600 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-medium mb-3 sm:mb-4 text-sm sm:text-base"
                        />
                        <button
                            onClick={handleGuestLogin}
                            disabled={loading || !nickname.trim()}
                            className={`w-full font-bold py-2.5 sm:py-3 md:py-3.5 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all duration-300 transform flex items-center justify-center gap-2 text-sm sm:text-base
                                ${!nickname.trim()
                                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 hover:scale-[1.02] shadow-lg hover:shadow-emerald-500/25 ring-1 ring-white/10'}
                            `}
                        >
                            <span>🚀</span>
                            {loading ? 'Initializing...' : 'PLAY AS GUEST'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-4 sm:bottom-6 text-slate-600 text-[8px] sm:text-[10px] uppercase tracking-widest font-semibold opacity-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                Secure Connection • Motion Arcade v1.0
            </div>

        </div>
    );
};

export default LoginScreen;
