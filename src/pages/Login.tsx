import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { Brain, Loader2, Sparkles } from 'lucide-react';

const Login: React.FC = () => {
    const { signIn } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignIn = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await signIn();
        } catch (err: any) {
            console.error('Sign in error:', err);
            if (err.code !== 'auth/popup-closed-by-user') {
                setError('Failed to sign in. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#080B12] flex items-center justify-center relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute inset-0">
                <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]" />
            </div>

            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-[0.015]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 flex flex-col items-center gap-8 p-12 max-w-md w-full mx-4"
            >
                {/* Logo */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.5 }}
                    className="relative"
                >
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_40px_rgba(16,217,160,0.1)]">
                        <Brain className="w-9 h-9 text-emerald-400" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-violet-400/20 border border-violet-400/30 flex items-center justify-center">
                        <Sparkles className="w-2.5 h-2.5 text-violet-400" />
                    </div>
                </motion.div>

                {/* Title */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="text-center"
                >
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                        Welcome to <span className="text-emerald-400">Memree</span>
                    </h1>
                    <p className="text-white/40 text-sm leading-relaxed">
                        Your AI-powered study ecosystem.<br />
                        Sign in to access your personal vault and study tools.
                    </p>
                </motion.div>

                {/* Features */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="grid grid-cols-3 gap-3 w-full"
                >
                    {[
                        { emoji: '🗄️', label: 'Vault', sub: '5 GB Storage' },
                        { emoji: '🧠', label: 'AI Tutor', sub: 'Study Assistant' },
                        { emoji: '⚡', label: 'Orb Tools', sub: 'Quick Access' },
                    ].map((item) => (
                        <div key={item.label} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                            <span className="text-xl">{item.emoji}</span>
                            <span className="text-white/70 text-[11px] font-bold">{item.label}</span>
                            <span className="text-white/25 text-[9px]">{item.sub}</span>
                        </div>
                    ))}
                </motion.div>

                {/* Sign in button */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    className="w-full"
                >
                    <button
                        onClick={handleSignIn}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-white text-gray-900 font-bold text-sm hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        )}
                        {isLoading ? 'Signing in...' : 'Continue with Google'}
                    </button>

                    {error && (
                        <p className="text-red-400 text-xs text-center mt-3">{error}</p>
                    )}
                </motion.div>

                <p className="text-white/15 text-[10px] text-center">
                    Your data is private and only accessible to you.<br />
                    Secured by Firebase Authentication.
                </p>
            </motion.div>
        </div>
    );
};

export default Login;
