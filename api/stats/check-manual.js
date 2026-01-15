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

        console.log(`🔘 Manual Check Triggered for ${agentId}`);

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

        console.log(`✅ Found agent: ${agentId}, base_url: ${agent.base_url || 'null'}`);

        let newStatus = 'online';
        let newApiStatus = 'healthy';

        // If mocked agent (no base_url), skip real check
        if (!agent.base_url) {
            return res.json({ success: true, message: 'Mock check pass' });
        }

        // Check agent health endpoints
        try {
            const healthUrl = `${agent.base_url}/api/quote/health`;
            console.log(`🔍 Checking health at: ${healthUrl}`);
            
            const healthRes = await fetch(healthUrl, { 
                signal: AbortSignal.timeout(5000) 
            });
            
            if (!healthRes.ok) {
                const errorText = await healthRes.text().catch(() => 'Unknown error');
                console.error(`❌ Health check failed: ${healthRes.status} ${healthRes.statusText} - ${errorText}`);
                newStatus = 'offline';
                newApiStatus = 'error';
            } else {
                console.log(`✅ Health check passed for ${agentId}`);
                
                // Verify API endpoint
                const verifyUrl = `${agent.base_url}/api/quote/verify-api`;
                console.log(`🔍 Verifying API at: ${verifyUrl}`);
                
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
                    console.log(`✅ API verify result: ${newApiStatus}`);
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
        if (newApiStatus === 'healthy' && agent.base_url) {
            try {
                // Call the stats endpoint internally to send heartbeat
                const statsApiUrl = process.env.VERCEL_URL 
                    ? `https://${process.env.VERCEL_URL}/api/stats`
                    : 'http://localhost:5001/api/stats';
                
                const heartbeatResponse = await fetch(statsApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agentId: agentId,
                        apiType: 'heartbeat',
                        baseUrl: agent.base_url,
                        model: agent.model || 'gemini-3-pro-image-preview',
                        account: agent.account || 'admin@worldlocker.com',
                        apiKey: agent.api_key || 'sk-unknown',
                        shouldCountApi: false,
                        shouldCountTask: false,
                        responseTime: 0
                    })
                });

                if (heartbeatResponse.ok) {
                    console.log(`💓 Heartbeat sent via status check for ${agentId}`);
                } else {
                    const errorText = await heartbeatResponse.text().catch(() => 'Unknown error');
                    console.error(`⚠️ Failed to send heartbeat: ${heartbeatResponse.status} - ${errorText}`);
                }
            } catch (hbError) {
                console.error(`⚠️ Failed to send heartbeat:`, hbError.message);
            }
        }

        res.json({ success: newApiStatus === 'healthy' });
    } catch (error) {
        console.error('Manual check error:', error);
        res.status(500).json({ error: error.message });
    }
}
