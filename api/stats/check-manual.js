import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false
    }
});

// Login as system admin if using Anon Key
async function ensureAuthenticated() {
    if (supabaseServiceKey) return;
    
    const { error } = await supabase.auth.signInWithPassword({
        email: 'steve@dashboard.local',
        password: 'password123'
    });
    if (error) {
        console.error('⚠️ System login failed:', error.message);
    }
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
        await ensureAuthenticated();

        console.log(`🔘 Manual Check Triggered for ${agentId}`);

        // Fetch agent from Supabase
        const { data: agent, error } = await supabase
            .from('agents')
            .select('*')
            .eq('id', agentId)
            .single();

        if (error || !agent) {
            return res.status(404).json({ error: 'Agent not found' });
        }

        let newStatus = 'online';
        let newApiStatus = 'healthy';

        // If mocked agent (no base_url), skip real check
        if (!agent.base_url) {
            return res.json({ success: true, message: 'Mock check pass' });
        }

        // Check agent health endpoints
        try {
            const healthRes = await fetch(`${agent.base_url}/api/quote/health`, { 
                signal: AbortSignal.timeout(5000) 
            });
            
            if (!healthRes.ok) {
                newStatus = 'offline';
                newApiStatus = 'error';
            } else {
                // Verify API endpoint
                const verifyRes = await fetch(`${agent.base_url}/api/quote/verify-api`, { 
                    method: 'POST', 
                    signal: AbortSignal.timeout(5000) 
                });
                
                if (!verifyRes.ok) {
                    newApiStatus = 'error';
                } else {
                    const verifyData = await verifyRes.json();
                    newApiStatus = verifyData.success ? 'healthy' : 'error';
                }
            }
        } catch (err) {
            console.error(`❌ Health check failed for ${agentId}:`, err.message);
            newStatus = 'offline';
            newApiStatus = 'error';
        }

        // Update Supabase
        const { error: updateError } = await supabase
            .from('agents')
            .update({
                status: newStatus,
                api_status: newApiStatus,
                last_active: new Date().toISOString()
            })
            .eq('id', agentId);

        if (updateError) {
            console.error(`❌ Failed to update agent status:`, updateError.message);
        }

        res.json({ success: newApiStatus === 'healthy' });
    } catch (error) {
        console.error('Manual check error:', error);
        res.status(500).json({ error: error.message });
    }
}
