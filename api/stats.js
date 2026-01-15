import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client for Brain Server
// Use Service Role Key if available, otherwise use Anon Key + login
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Prefer Service Role Key (bypasses RLS), fallback to Anon Key
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false // Server-side, no local storage
    }
});

// Login as system admin if using Anon Key (needed for RLS authenticated policy)
async function ensureAuthenticated() {
    if (supabaseServiceKey) {
        // Service Role Key bypasses RLS, no login needed
        return;
    }
    
    // Using Anon Key, need to login for authenticated access
    const { error } = await supabase.auth.signInWithPassword({
        email: 'steve@dashboard.local',
        password: 'password123'
    });
    if (error) {
        console.error('⚠️ System login failed (may still work if RLS allows):', error.message);
    }
}

// CORS headers helper
function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Vercel Serverless Function: Main Stats Endpoint
 * Receives updates from Agents and stores in Supabase
 * 
 * POST /api/stats
 * Body: { agentId, apiType, responseTime, isError, ... }
 */
export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        setCorsHeaders(res);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    setCorsHeaders(res);

    try {
        // Ensure we have authenticated access (if using Anon Key)
        await ensureAuthenticated();

        const {
            agentId,
            apiType,
            responseTime,
            isError,
            shouldCountApi = true,
            shouldCountTask = true,
            model,
            baseUrl,
            account,
            apiKey,
            status,
            logAction,
            logMessage,
            logType
        } = req.body;

        const actionToLog = logAction || logMessage;

        console.log(`📥 Incoming API Call: ${agentId} - ${apiType} ${actionToLog ? `(Log: ${actionToLog})` : ''}`);

        // 1. Handle Heartbeat (Registration)
        if (apiType === 'heartbeat') {
            const nowIso = new Date().toISOString();

            const { error: hbError } = await supabase
                .from('agents')
                .update({
                    last_active: nowIso,
                    model: model,
                    base_url: baseUrl, // Important for toggle
                    status: 'online'
                })
                .eq('id', agentId);

            if (hbError) {
                console.error(`❌ Heartbeat Error [${agentId}]:`, hbError.message);
                return res.status(500).json({ success: false, error: hbError.message });
            }

            // Fetch agent info to include project/client name in the log
            const { data: agentInfo, error: agentError } = await supabase
                .from('agents')
                .select('name, client_name, client_id')
                .eq('id', agentId)
                .single();

            if (agentError) {
                console.error(`⚠️ Failed to fetch agent info for heartbeat log [${agentId}]:`, agentError.message);
            } else {
                const projectLabel =
                    agentInfo.client_name ||
                    agentInfo.client_id ||
                    agentInfo.name ||
                    agentId;

                // Write heartbeat into activity_logs so it appears in Recent Activity
                const { error: logError } = await supabase
                    .from('activity_logs')
                    .insert({
                        agent_id: agentId,
                        action: `Heartbeat - ${projectLabel}`,
                        type: 'heartbeat',
                        status: 'success',
                        timestamp: nowIso,
                        response_time: responseTime || 0
                    });

                if (logError) {
                    console.error(`⚠️ Failed to log heartbeat activity [${agentId}]:`, logError.message);
                }
            }

            console.log(`💓 Heartbeat: ${agentId}`);
            return res.json({ success: true });
        }

        // 2. Handle specific status change
        if (apiType === 'status_change') {
            const { error: stError } = await supabase
                .from('agents')
                .update({
                    status: status,
                    last_active: new Date().toISOString()
                })
                .eq('id', agentId);

            if (stError) {
                console.error(`❌ Status Change Error [${agentId}]:`, stError.message);
                return res.status(500).json({ success: false, error: stError.message });
            }
            console.log(`🔄 Status Change: ${agentId} -> ${status}`);
            return res.json({ success: true });
        }

        // 3. Handle Regular Stats Update via RPC
        // If it's just a log, we might skip the stats update RPC
        if (!logAction && apiType !== 'activity_log' && apiType !== 'heartbeat' && apiType !== 'status_change') {
            const { error: rpcError } = await supabase.rpc('update_agent_stats', {
                p_agent_id: agentId,
                p_api_type: apiType,
                p_response_time: responseTime || 0,
                p_is_error: isError || false,
                p_should_count_api: shouldCountApi,
                p_should_count_task: shouldCountTask
            });
            if (rpcError) {
                console.error(`❌ RPC Stats Error [${agentId}]:`, rpcError.message);
                // Don't fail the request, just log the error
            }
        }

        // 4. Handle Activity Log
        if (actionToLog) {
            const { error: logError } = await supabase
                .from('activity_logs')
                .insert({
                    agent_id: agentId,
                    action: actionToLog,
                    type: apiType === 'activity_log' ? 'log' : apiType,
                    status: logType || (isError ? 'error' : 'success'),
                    timestamp: new Date().toISOString(),
                    response_time: responseTime || 0
                });
            if (logError) {
                console.error(`❌ Activity Log Error [${agentId}]:`, logError.message);
            } else {
                console.log(`📋 Logged: ${agentId} - ${actionToLog}`);
            }
        }

        // Supabase Realtime handles frontend updates automatically
        res.json({ success: true });

    } catch (error) {
        console.error('Error processing stats:', error);
        res.status(500).json({ error: error.message });
    }
}
