import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from './firebase';
import {
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    GoogleAuthProvider,
    onAuthStateChanged,
    User,
    signOut
} from 'firebase/auth';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: () => Promise<void>;
    signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signIn: async () => { },
    signOutUser: async () => { }
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log('[AuthContext] Initializing Firebase auth listener...');

        // Check for redirect result on mount
        getRedirectResult(auth).catch((err) => {
            console.error('[AuthContext] Redirect result error:', err);
        });

        const unsubscribe = onAuthStateChanged(
            auth,
            (currentUser) => {
                console.log('[AuthContext] Auth state changed:', currentUser ? 'User signed in' : 'No user');
                setUser(currentUser);
                setLoading(false);
                setError(null);
            },
            (err) => {
                console.error('[AuthContext] Auth error:', err);
                setLoading(false);
                setError(err.message);
            }
        );

        return () => unsubscribe();
    }, []);

    const signIn = async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
            await signInWithPopup(auth, provider);
        } catch (err: any) {
            console.error('[AuthContext] Popup error, falling back to redirect:', err);
            if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
                await signInWithRedirect(auth, provider);
            } else {
                throw err;
            }
        }
    };

    const signOutUser = async () => {
        await signOut(auth);
    };

    // Show loading state with visible indicator
    if (loading) {
        return (
            <AuthContext.Provider value={{ user, loading, signIn, signOutUser }}>
                <div className="min-h-screen bg-[#080B12] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                        <p className="text-white/60 text-sm">Initializing Cerebra...</p>
                    </div>
                </div>
            </AuthContext.Provider>
        );
    }

    // Show error state if auth failed
    if (error) {
        return (
            <AuthContext.Provider value={{ user, loading, signIn, signOutUser }}>
                <div className="min-h-screen bg-[#080B12] flex items-center justify-center p-4">
                    <div className="max-w-md bg-red-500/10 border border-red-500/20 rounded-lg p-6 text-center">
                        <h2 className="text-white font-bold text-lg mb-2">Authentication Error</h2>
                        <p className="text-white/70 text-sm mb-4">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            </AuthContext.Provider>
        );
    }

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signOutUser }}>
            {children}
        </AuthContext.Provider>
    );
};
