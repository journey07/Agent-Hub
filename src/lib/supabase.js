import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables - throw error if missing
if (!supabaseUrl || !supabaseAnonKey) {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
    if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');
    
    const errorMessage = `❌ Missing required environment variables: ${missingVars.join(', ')}\n\n` +
        `Please create a .env.local file in the Dashboard directory with:\n` +
        `VITE_SUPABASE_URL=your_supabase_url\n` +
        `VITE_SUPABASE_ANON_KEY=your_supabase_anon_key\n\n` +
        `Check ENV_SETUP.md or INTEGRATION_SETUP.md for details.`;
    
    console.error(errorMessage);
    
    // Store error for UI display
    if (typeof window !== 'undefined') {
        window.__SUPABASE_CONFIG_ERROR__ = errorMessage;
    }
    
    // Don't throw here - let the app show the error UI
}

// Custom storage implementation for remember me functionality
class RememberMeStorage {
    constructor(rememberMe = true) {
        this.rememberMe = rememberMe;
        this.storage = rememberMe ? localStorage : sessionStorage;
    }

    getItem(key) {
        return this.storage.getItem(key);
    }

    setItem(key, value) {
        this.storage.setItem(key, value);
    }

    removeItem(key) {
        this.storage.removeItem(key);
        // Also remove from the other storage to prevent conflicts
        const otherStorage = this.rememberMe ? sessionStorage : localStorage;
        otherStorage.removeItem(key);
    }
}

// Create a single supabase client for interacting with your database
// Default to localStorage (rememberMe = true)
// Note: If env vars are missing, this will create an invalid client
// The app should check for this and show an error UI
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co', 
    supabaseAnonKey || 'placeholder-key', 
    {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: new RememberMeStorage(true) // Default to localStorage
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        },
        // Realtime 연결 디버깅
        log_level: 'info'
    }
});

/**
 * Create a Supabase client with custom storage based on rememberMe setting
 * @param {boolean} rememberMe - If true, uses localStorage. If false, uses sessionStorage.
 */
export function createSupabaseClient(rememberMe = true) {
    return createClient(
        supabaseUrl || 'https://placeholder.supabase.co', 
        supabaseAnonKey || 'placeholder-key', 
        {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: new RememberMeStorage(rememberMe)
        },
        realtime: {
            params: {
                eventsPerSecond: 10
            },
            log_level: 'info'
        }
    });
}

// Helper function to check connection status
export async function testConnection() {
    try {
        const { data, error } = await supabase.from('agents').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log('✅ Supabase connection successful');
        return true;
    } catch (error) {
        console.error('❌ Supabase connection failed:', error.message);
        return false;
    }
}
