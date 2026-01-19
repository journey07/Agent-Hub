import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChange, getCurrentSession, login as loginService, logout as logoutService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session on mount
        getCurrentSession()
            .then(({ session, error }) => {
                if (error) {
                    console.error('Failed to get session:', error);
                    // Don't block the app if session check fails
                }
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            })
            .catch((error) => {
                console.error('Error getting session:', error);
                // Set loading to false even on error to prevent infinite loading
                setLoading(false);
            });

        // Listen for auth state changes
        try {
            const { data: { subscription } } = onAuthStateChange((event, session) => {
                console.log('Auth state changed:', event);
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            });

            return () => {
                subscription?.unsubscribe();
            };
        } catch (error) {
            console.error('Error setting up auth state listener:', error);
            // Set loading to false even if listener setup fails
            setLoading(false);
        }
    }, []);

    const login = async (username, password, rememberMe = false) => {
        const result = await loginService(username, password, rememberMe);
        if (result.success) {
            setSession(result.session);
            setUser(result.user);
        }
        return result;
    };

    const logout = async () => {
        const result = await logoutService();
        if (result.success) {
            setSession(null);
            setUser(null);
        }
        return result;
    };

    const value = {
        user,
        session,
        loading,
        login,
        logout,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
