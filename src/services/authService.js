import { supabase } from '../lib/supabase';

/**
 * Authentication Service
 * Replaces api/login.js with Supabase Auth
 */

/**
 * Sign in with email and password
 */
export async function login(username, password) {
    try {
        // Supabase Auth uses email, so we'll construct an email from username
        // For simplicity, we'll use username@dashboard.local
        const email = `${username}@dashboard.local`;

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        return {
            success: true,
            user: data.user,
            session: data.session
        };
    } catch (error) {
        console.error('Login failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Sign out
 */
export async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        // 세션이 없어도 로그아웃은 성공으로 처리 (이미 로그아웃된 상태)
        if (error && !error.message.includes('session missing')) {
            throw error;
        }
        return { success: true };
    } catch (error) {
        console.error('Logout failed:', error);
        // 에러가 있어도 로그인 페이지로 보내기 위해 성공으로 처리
        return { success: true };
    }
}

/**
 * Get current session
 */
export async function getCurrentSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return { session, error: null };
    } catch (error) {
        console.error('Failed to get session:', error);
        return { session: null, error };
    }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return { user, error: null };
    } catch (error) {
        console.error('Failed to get user:', error);
        return { user: null, error };
    }
}

/**
 * Sign up new user (admin only - for creating additional users)
 */
export async function signUp(username, password) {
    try {
        const email = `${username}@dashboard.local`;

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    username
                }
            }
        });

        if (error) throw error;

        return {
            success: true,
            user: data.user
        };
    } catch (error) {
        console.error('Sign up failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}
