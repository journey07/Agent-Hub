import { initSupabase } from '../lib/supabase.js';

// Initialize Supabase client (will be initialized on first request)
let supabase;
let initializationPromise = null;

async function getSupabaseClient() {
    if (supabase) {
        return supabase;
    }

    if (!initializationPromise) {
        initializationPromise = initSupabase().then(({ supabase: client }) => {
            supabase = client;
            return client;
        }).catch((error) => {
            initializationPromise = null; // Reset on error to allow retry
            throw error;
        });
    }

    return initializationPromise;
}

// CORS headers helper
function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Vercel Serverless Function: Manual Health Check
 * Checks agent health by calling agent's health endpoints
 * 
 * POST /api/stats/check-manual
 * Body: { agentId }
 */
export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        setCorsHeaders(res);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    setCorsHeaders(res);

    const { agentId } = req.body;
    if (!agentId) {
        return res.status(400).json({ error: 'agentId is required' });
    }

    try {
        // Get authenticated Supabase client
        const supabase = await getSupabaseClient();

        // Fetch agent from Supabase
        const { data: agent, error } = await supabase
            .from('agents')
            .select('*')
            .eq('id', agentId)
            .single();

        if (error) {
            console.error(`❌ Supabase query error for ${agentId}:`, error);
            // PGRST116 means no rows returned (not found)
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    error: 'Agent not found',
                    details: `No agent found with id: ${agentId}`,
                    code: error.code
                });
            }
            return res.status(500).json({
                error: 'Database query failed',
                details: error.message,
                code: error.code
            });
        }

        if (!agent) {
            console.error(`❌ Agent ${agentId} query returned null`);
            return res.status(404).json({
                error: 'Agent not found',
                details: `Query returned null for id: ${agentId}`
            });
        }

        let newStatus = 'online';
        let newApiStatus = 'healthy';

        // If mocked agent (no base_url), skip real check
        if (!agent.base_url) {
            return res.json({ success: true, message: 'Mock check pass' });
        }

        // Check agent health endpoints
        try {
            // For options consultation agent (ai-consulting), use the base_url directly (GET request)
            // For quote agent, use /api/quote/health endpoint
            const isOptionsAgent = agent.base_url.includes('/api/ai-consulting');
            const healthUrl = isOptionsAgent ? agent.base_url : `${agent.base_url}/api/quote/health`;

            const healthRes = await fetch(healthUrl, {
                signal: AbortSignal.timeout(5000)
            });

            if (!healthRes.ok) {
                const errorText = await healthRes.text().catch(() => 'Unknown error');
                console.error(`❌ Health check failed: ${healthRes.status} ${healthRes.statusText} - ${errorText}`);
                newStatus = 'offline';
                newApiStatus = 'error';
            } else {
                // Verify API endpoint
                // For options agent, the GET request itself is the health check
                if (!isOptionsAgent) {
                    const verifyUrl = `${agent.base_url}/api/quote/verify-api`;
                    const verifyRes = await fetch(verifyUrl, {
                        method: 'POST',
                        signal: AbortSignal.timeout(5000)
                    });

                    if (!verifyRes.ok) {
                        const errorText = await verifyRes.text().catch(() => 'Unknown error');
                        console.error(`❌ API verify failed: ${verifyRes.status} ${verifyRes.statusText} - ${errorText}`);
                        newApiStatus = 'error';
                    } else {
                        const verifyData = await verifyRes.json();
                        newApiStatus = verifyData.success ? 'healthy' : 'error';
                    }
                } else {
                    // For options agent, receiving 200 OK from GET is enough
                    newApiStatus = 'healthy';
                }
            }
        } catch (err) {
            console.error(`❌ Health check exception for ${agentId}:`, err.message);
            console.error(`   Error type: ${err.name}, Cause: ${err.cause?.message || 'N/A'}`);
            newStatus = 'offline';
            newApiStatus = 'error';
        }

        // Update Supabase with status
        const nowIso = new Date().toISOString();
        const { error: updateError } = await supabase
            .from('agents')
            .update({
                status: newStatus,
                api_status: newApiStatus,
                last_active: nowIso
            })
            .eq('id', agentId);

        if (updateError) {
            console.error(`❌ Failed to update agent status:`, updateError.message);
        }

        // Send heartbeat via /api/stats endpoint (same as agent's heartbeat)
        // This ensures proper activity logging and updates
        // Send heartbeat via direct DB operations (bypass self-fetch to avoid Vercel auth issues)
        if (newApiStatus === 'healthy' && agent.base_url) {
            try {
                // 1. Update Agent Status (Redundant confirmation)
                const { error: hbError } = await supabase
                    .from('agents')
                    .update({
                        last_active: nowIso,
                        model: agent.model || 'gemini-3-pro-image-preview',
                        base_url: agent.base_url,
                        status: 'online'
                    })
                    .eq('id', agentId);

                if (hbError) {
                    console.error(`❌ Heartbeat update error:`, hbError.message);
                } else {
                    console.log(`✅ Heartbeat agent update success for ${agentId}`);
                }

                // 2. Log Heartbeat Activity (Independent of update success)
                console.log(`📝 Preparing to insert heartbeat log for ${agentId}...`);

                // Fetch latest name/client info just in case
                const { data: agentInfo, error: agentInfoError } = await supabase
                    .from('agents')
                    .select('name, client_name, client_id')
                    .eq('id', agentId)
                    .single();

                if (agentInfoError) {
                    console.warn(`⚠️ Could not fetch agent info for logging (using defaults):`, agentInfoError.message);
                }

                const agentName = agentInfo?.name || agentInfo?.client_name || agentId;

                const { error: logError } = await supabase
                    .from('activity_logs')
                    .insert({
                        agent_id: agentId,
                        action: `Heartbeat - ${agentName} (via status check)`,
                        type: 'heartbeat',
                        status: 'success',
                        timestamp: nowIso,
                        response_time: 0
                    });

                if (logError) {
                    console.error(`❌ Log insertion failed:`, logError.message);
                } else {
                    console.log(`✅ Heartbeat log inserted successfully for ${agentId}`);
                }

            } catch (hbError) {
                console.error(`⚠️ Failed to send heartbeat logic:`, hbError.message);
            }
        }

        res.json({ success: newApiStatus === 'healthy' });
    } catch (error) {
        console.error('Manual check error:', error);
        res.status(500).json({ error: error.message });
    }
}
