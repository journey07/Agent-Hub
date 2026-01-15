import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws'; // Keeping ws to avoid breaking client heartbeats immediately, but main logic moves to Supabase
import cors from 'cors';
import { initSupabase } from './api/lib/supabase.js';

const PORT = process.env.PORT || 5001;

// Initialize Supabase Client with proper authentication
let supabase;
let supabaseInitialized = false;

async function initializeSupabase() {
    try {
        const { supabase: client } = await initSupabase();
        supabase = client;
        supabaseInitialized = true;
        console.log('✅ Brain Server Supabase client initialized');
    } catch (error) {
        console.error('❌ Failed to initialize Supabase:', error.message);
        console.error('   Server will continue but database operations may fail.');
        console.error('   Please check your .env.local file and ensure all required variables are set.');
        process.exit(1); // Exit on initialization failure
    }
}

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

app.use(cors());
app.use(express.json());

// Ensure Supabase is initialized before handling requests
app.use(async (req, res, next) => {
    if (!supabaseInitialized) {
        await initializeSupabase();
    }
    next();
});

// Main Stats Endpoint (Receives updates from Agents)
app.post('/api/stats', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(503).json({ 
                error: 'Database not initialized',
                message: 'Supabase client failed to initialize. Please check server logs.'
            });
        }
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
            logMessage, // Added to handle trackApiCall logs
            logType
        } = req.body;

        const actionToLog = logAction || logMessage;

        // 1. Handle Heartbeat (Registration)
        if (apiType === 'heartbeat') {
            const { error: hbError } = await supabase
                .from('agents')
                .update({
                    last_active: new Date().toISOString(),
                    model: model,
                    base_url: baseUrl, // Important for toggle
                    status: 'online'
                })
                .eq('id', agentId);

            if (hbError) console.error(`❌ Heartbeat Error [${agentId}]:`, hbError.message);
            return res.json({ success: !hbError });
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

            if (stError) console.error(`❌ Status Change Error [${agentId}]:`, stError.message);
            return res.json({ success: !stError });
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
            if (rpcError) console.error(`❌ RPC Stats Error [${agentId}]:`, rpcError.message);
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
            if (logError) console.error(`❌ Activity Log Error [${agentId}]:`, logError.message);
        }

        // No need to broadcast via WebSocket anymore! 
        // Supabase Realtime handles it for the frontend.
        res.json({ success: true });

    } catch (error) {
        console.error('Error processing stats:', error);
        res.status(500).json({ error: error.message });
    }
});

// Manual Health Check Trigger
app.post('/api/stats/check-manual', async (req, res) => {
    const { agentId } = req.body;
    if (!agentId) return res.status(400).json({ error: 'agentId is required' });

    try {
        if (!supabase) {
            return res.status(503).json({ 
                error: 'Database not initialized',
                message: 'Supabase client failed to initialize. Please check server logs.'
            });
        }

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

        try {
            const healthUrl = `${agent.base_url}/api/quote/health`;
            const healthRes = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });
            
            if (!healthRes.ok) {
                const errorText = await healthRes.text().catch(() => 'Unknown error');
                console.error(`❌ Health check failed: ${healthRes.status} ${healthRes.statusText} - ${errorText}`);
                newStatus = 'offline';
                newApiStatus = 'error';
            } else {
                // Verify API endpoint
                const verifyUrl = `${agent.base_url}/api/quote/verify-api`;
                const verifyRes = await fetch(verifyUrl, { method: 'POST', signal: AbortSignal.timeout(5000) });
                
                if (!verifyRes.ok) {
                    const errorText = await verifyRes.text().catch(() => 'Unknown error');
                    console.error(`❌ API verify failed: ${verifyRes.status} ${verifyRes.statusText} - ${errorText}`);
                    newApiStatus = 'error';
                } else {
                    const verifyData = await verifyRes.json();
                    newApiStatus = verifyData.success ? 'healthy' : 'error';
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
                // In server.js, we can call the handler directly or use the same logic
                const heartbeatData = {
                    agentId: agentId,
                    apiType: 'heartbeat',
                    baseUrl: agent.base_url,
                    model: agent.model || 'gemini-3-pro-image-preview',
                    account: agent.account || 'admin@worldlocker.com',
                    apiKey: agent.api_key || 'sk-unknown',
                    shouldCountApi: false,
                    shouldCountTask: false,
                    responseTime: 0
                };

                // Process heartbeat using the same logic as /api/stats
                const { error: hbError } = await supabase
                    .from('agents')
                    .update({
                        last_active: nowIso,
                        model: heartbeatData.model,
                        base_url: heartbeatData.baseUrl,
                        status: 'online'
                    })
                    .eq('id', agentId);

                if (hbError) {
                    console.error(`❌ Heartbeat update error:`, hbError.message);
                } else {
                    // Log heartbeat activity
                    const { data: agentInfo } = await supabase
                        .from('agents')
                        .select('name, client_name, client_id')
                        .eq('id', agentId)
                        .single();
                    
                    const agentName = agentInfo?.name || agentInfo?.client_name || agentId;
                    await supabase
                        .from('activity_logs')
                        .insert({
                            agent_id: agentId,
                            action: `Heartbeat - ${agentName} (via status check)`,
                            type: 'heartbeat',
                            status: 'success',
                            timestamp: nowIso,
                            response_time: 0
                        });
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
});


httpServer.listen(PORT, async () => {
    console.log(`🧠 Dashboard Brain Server starting on http://localhost:${PORT}`);
    await initializeSupabase();
    console.log(`⚡️ Server ready and connected to Supabase`);
});
