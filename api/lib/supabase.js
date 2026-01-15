import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Get Supabase credentials from environment variables
 * Validates required variables and provides clear error messages
 */
function getSupabaseConfig() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const systemPassword = process.env.SYSTEM_PASSWORD;
    const systemEmail = process.env.SYSTEM_EMAIL || 'steve@dashboard.local';

    // Validate required environment variables
    if (!supabaseUrl) {
        throw new Error(
            '❌ Missing SUPABASE_URL environment variable.\n' +
            '   Please set SUPABASE_URL or VITE_SUPABASE_URL in your .env.local file.'
        );
    }

    if (!supabaseServiceKey && !supabaseAnonKey) {
        throw new Error(
            '❌ Missing Supabase API key.\n' +
            '   Please set either SUPABASE_SERVICE_ROLE_KEY (recommended) or SUPABASE_ANON_KEY in your .env.local file.\n' +
            '   Service Role Key is recommended for backend operations as it bypasses RLS policies.'
        );
    }

    // Warn if using Anon Key (not recommended for production)
    if (!supabaseServiceKey && supabaseAnonKey) {
        console.warn(
            '⚠️  Using SUPABASE_ANON_KEY for backend operations.\n' +
            '   This requires authentication via system user login.\n' +
            '   For production, consider using SUPABASE_SERVICE_ROLE_KEY instead.'
        );
        
        // If using Anon Key, SYSTEM_PASSWORD is required
        if (!systemPassword) {
            throw new Error(
                '❌ Missing SYSTEM_PASSWORD environment variable.\n' +
                '   When using SUPABASE_ANON_KEY, SYSTEM_PASSWORD is required for authentication.\n' +
                '   Please set SYSTEM_PASSWORD in your .env.local file, or use SUPABASE_SERVICE_ROLE_KEY instead.'
            );
        }
    }

    return {
        supabaseUrl,
        supabaseServiceKey,
        supabaseAnonKey,
        supabaseKey: supabaseServiceKey || supabaseAnonKey,
        systemPassword,
        systemEmail,
        isUsingServiceRole: !!supabaseServiceKey
    };
}

/**
 * Create Supabase client with proper configuration
 * @returns {Object} { supabase, config }
 */
export function createSupabaseClient() {
    const config = getSupabaseConfig();

    const supabase = createClient(config.supabaseUrl, config.supabaseKey, {
        auth: {
            persistSession: false // Server-side, no local storage
        }
    });

    return { supabase, config };
}

/**
 * Ensure authenticated access to Supabase
 * If using Service Role Key, no action needed (bypasses RLS)
 * If using Anon Key, logs in as system user for authenticated access
 * 
 * @param {Object} supabase - Supabase client instance
 * @param {Object} config - Configuration object from createSupabaseClient
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function ensureAuthenticated(supabase, config) {
    // Service Role Key bypasses RLS, no login needed
    if (config.isUsingServiceRole) {
        return { success: true };
    }

    // Using Anon Key, need to login for authenticated access
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: config.systemEmail,
            password: config.systemPassword
        });

        if (error) {
            const errorMsg = `System login failed: ${error.message}\n` +
                `   Please verify that:\n` +
                `   1. The system user (${config.systemEmail}) exists in Supabase Auth\n` +
                `   2. SYSTEM_PASSWORD in .env.local matches the user's password\n` +
                `   3. Or use SUPABASE_SERVICE_ROLE_KEY instead (recommended)`;
            
            console.error('❌', errorMsg);
            return { success: false, error: errorMsg };
        }

        console.log(`✅ Authenticated as system user: ${config.systemEmail}`);
        return { success: true };
    } catch (error) {
        const errorMsg = `Authentication error: ${error.message}`;
        console.error('❌', errorMsg);
        return { success: false, error: errorMsg };
    }
}

/**
 * Initialize Supabase client and ensure authentication
 * This is the main function to use in serverless functions and server files
 * 
 * @returns {Promise<{supabase: Object, config: Object, authResult: Object}>}
 */
export async function initSupabase() {
    try {
        const { supabase, config } = createSupabaseClient();
        const authResult = await ensureAuthenticated(supabase, config);
        
        if (!authResult.success) {
            throw new Error(authResult.error);
        }

        return { supabase, config, authResult };
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error.message);
        throw error;
    }
}
