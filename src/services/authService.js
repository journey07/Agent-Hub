import { supabase, createSupabaseClient } from '../lib/supabase';

/**
 * Authentication Service
 * Replaces api/login.js with Supabase Auth
 */

// Store rememberMe preference
let currentRememberMe = true;

/**
 * Sign in with email and password
 * @param {string} username - Username
 * @param {string} password - Password
 * @param {boolean} rememberMe - If true, session persists in localStorage. If false, uses sessionStorage (cleared on browser close)
 */
export async function login(username, password, rememberMe = false) {
    try {
        // Store rememberMe preference
        currentRememberMe = rememberMe;
        
        // Clear existing sessions from both storages
        const supabaseKeys = Object.keys(localStorage).filter(key => key.startsWith('sb-'));
        supabaseKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });

        // Create a Supabase client with appropriate storage
        const client = createSupabaseClient(rememberMe);
        
        // Supabase Auth uses email, so we'll construct an email from username
        // For simplicity, we'll use username@dashboard.local
        const email = `${username}@dashboard.local`;

        const { data, error } = await client.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // Store rememberMe preference for session restoration
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            sessionStorage.removeItem('rememberMe');
        } else {
            sessionStorage.setItem('rememberMe', 'false');
            localStorage.removeItem('rememberMe');
        }

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
 * Clears session from both localStorage and sessionStorage
 */
export async function logout() {
    try {
        // Check rememberMe to use appropriate client
        const rememberMe = localStorage.getItem('rememberMe') === 'true' || 
                          sessionStorage.getItem('rememberMe') !== 'false';
        const client = createSupabaseClient(rememberMe);
        
        const { error } = await client.auth.signOut();
        // 세션이 없어도 로그아웃은 성공으로 처리 (이미 로그아웃된 상태)
        if (error && !error.message.includes('session missing')) {
            throw error;
        }
        
        // Clear rememberMe preference
        localStorage.removeItem('rememberMe');
        sessionStorage.removeItem('rememberMe');
        
        // Clear all Supabase-related items from both storages
        const supabaseKeys = Object.keys(localStorage).filter(key => key.startsWith('sb-'));
        supabaseKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        });
        
        return { success: true };
    } catch (error) {
        console.error('Logout failed:', error);
        // 에러가 있어도 로그인 페이지로 보내기 위해 성공으로 처리
        return { success: true };
    }
}

/**
 * Get current session
 * Checks both localStorage and sessionStorage based on rememberMe preference
 */
export async function getCurrentSession() {
    try {
        // Check rememberMe preference
        const rememberMe = localStorage.getItem('rememberMe') === 'true' || 
                          sessionStorage.getItem('rememberMe') !== 'false';
        
        // Use appropriate client based on rememberMe
        const client = createSupabaseClient(rememberMe);
        const { data: { session }, error } = await client.auth.getSession();
        
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
 * Uses appropriate client based on rememberMe preference
 */
export function onAuthStateChange(callback) {
    // Check rememberMe preference
    const rememberMe = localStorage.getItem('rememberMe') === 'true' || 
                      sessionStorage.getItem('rememberMe') !== 'false';
    const client = createSupabaseClient(rememberMe);
    
    return client.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}
