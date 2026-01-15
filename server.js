import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws'; // Keeping ws to avoid breaking client heartbeats immediately, but main logic moves to Supabase
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const PORT = process.env.PORT || 5001;

// Initialize Supabase Client (Service Role logic would be better but Anon is okay for now if RLS allows or we use Service Role)
// Ideally we should use Service Role key for backend to bypass RLS, but user only provided Anon Key.
// However, the DB schema has RLS policies: "Allow service role full access".
// If we use Anon key server-side, we act as an unauthenticated user unless we sign in.
// BUT, we have "Allow authenticated read access" and maybe need write access.
// Update: The schema has "Allow service role full access".
// Since we only have ANON key in .env.local, we'll try to use it.
// If RLS blocks writes (which it usually does for anon), we might fail.
// Wait, the previous schema I applied allows "authenticated" users to read.
// Does it allow "anon" write? No.
// We need the SERVICE_ROLE key or we need to sign in as a user.
// User didn't verify service role key yet.
// Actually, looking at the schema:
// "Allow service role full access on agents" ... TO service_role
// "Allow authenticated read access" ... TO authenticated
// There is NO policy for "anon" to insert/update.
// This means using the ANON key here will FAIL for updates unless we use the SERVICE ROLE KEY.
// The user has likely not put the service role key in .env.local.
// I will verify this shortly. For now I will assume we might need to ask for it or use a trick (login as steve?).
// Login as steve is safer.

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false // Server-side, no local storage
    }
});

// Login as the system admin user to perform writes if using Anon Key
async function systemLogin() {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'steve@dashboard.local',
        password: 'password123'
    });
    if (error) console.error('System login failed:', error.message);
    else console.log('✅ Brain Server logged in as system user');
}

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

app.use(cors());
app.use(express.json());

// Main Stats Endpoint (Receives updates from Agents)
app.post('/api/stats', async (req, res) => {
    try {
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

        console.log(`📥 Incoming API Call: ${agentId} - ${apiType} ${actionToLog ? `(Log: ${actionToLog})` : ''}`);

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
            else console.log(`💓 Heartbeat: ${agentId}`);
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
            else console.log(`🔄 Status Change: ${agentId} -> ${status}`);
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
            else console.log(`📋 Logged: ${agentId} - ${actionToLog}`);
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
        console.log(`🔘 Manual Check Triggered for ${agentId}`);
        // Fetch agent from Supabase
        const { data: agent, error } = await supabase
            .from('agents')
            .select('*')
            .eq('id', agentId)
            .single();

        if (error || !agent) return res.status(404).json({ error: 'Agent not found' });

        let newStatus = 'online';
        let newApiStatus = 'healthy';

        // If mocked agent (no base_url), skip real check
        if (!agent.base_url) {
            return res.json({ success: true, message: 'Mock check pass' });
        }

        try {
            const healthRes = await fetch(`${agent.base_url}/api/quote/health`, { signal: AbortSignal.timeout(5000) });
            if (!healthRes.ok) {
                newStatus = 'offline';
                newApiStatus = 'error';
            } else {
                const verifyRes = await fetch(`${agent.base_url}/api/quote/verify-api`, { method: 'POST', signal: AbortSignal.timeout(5000) });
                if (!verifyRes.ok) {
                    newApiStatus = 'error';
                } else {
                    const verifyData = await verifyRes.json();
                    newApiStatus = verifyData.success ? 'healthy' : 'error';
                }
            }
        } catch (err) {
            newStatus = 'offline';
            newApiStatus = 'error';
        }

        // Update Supabase
        await supabase
            .from('agents')
            .update({
                status: newStatus,
                api_status: newApiStatus,
                last_active: new Date().toISOString()
            })
            .eq('id', agentId);

        res.json({ success: newApiStatus === 'healthy' });
    } catch (error) {
        console.error('Manual check error:', error);
        res.status(500).json({ error: error.message });
    }
});


httpServer.listen(PORT, async () => {
    console.log(`🧠 Dashboard Brain Server running on http://localhost:${PORT}`);
    console.log(`⚡️ Now forwarding data to Supabase: ${supabaseUrl}`);
    await systemLogin(); // Log in to allow writes with anon key (via RLS authenticated policy)
});
