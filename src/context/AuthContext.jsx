import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChange, getCurrentSession, login as loginService, logout as logoutService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check active session on mount
        getCurrentSession().then(({ session }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth state changes
        const { data: { subscription } } = onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const login = async (username, password) => {
        const result = await loginService(username, password);
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
