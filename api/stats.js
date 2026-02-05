import { initSupabase } from './lib/supabase.js';

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
        // Get authenticated Supabase client
        const supabase = await getSupabaseClient();

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
            logType,
            userName, // 사용자명 (users 테이블의 name 컬럼 값)
            imageUrl
        } = req.body;

        const actionToLog = logAction || logMessage;

        // Validate agentId for activity logs
        if (actionToLog && !agentId) {
            console.error('❌ Missing agentId for activity log:', actionToLog);
            return res.status(400).json({ error: 'agentId is required for activity logs' });
        }

        console.log(`📥 Incoming API Call: ${agentId || 'NO_AGENT_ID'} - ${apiType} ${actionToLog ? `(Log: ${actionToLog})` : ''} ${userName ? `[User: ${userName}]` : '[No User]'}`);

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

            // Fetch agent info to include agent name in the log
            const { data: agentInfo, error: agentError } = await supabase
                .from('agents')
                .select('name, client_name, client_id')
                .eq('id', agentId)
                .single();

            if (agentError) {
                console.error(`⚠️ Failed to fetch agent info for heartbeat log [${agentId}]:`, agentError.message);
                // 에이전트 정보를 가져오지 못해도 기본값으로 로그 생성
                const { error: logError } = await supabase
                    .from('activity_logs')
                    .insert({
                        agent_id: agentId,
                        action: `Heartbeat - ${agentId}`,
                        type: 'heartbeat',
                        status: 'success',
                        timestamp: nowIso,
                        response_time: responseTime || 0,
                        user_name: userName || null
                    });
                if (logError) {
                    console.error(`⚠️ Failed to log heartbeat activity [${agentId}]:`, logError.message);
                }
            } else {
                // 에이전트 이름 우선 사용, 없으면 client_name, 없으면 agentId
                const agentName = agentInfo.name || agentInfo.client_name || agentId;

                // Write heartbeat into activity_logs so it appears in Recent Activity
                const { error: logError } = await supabase
                    .from('activity_logs')
                    .insert({
                        agent_id: agentId,
                        action: `Heartbeat - ${agentName}`,
                        type: 'heartbeat',
                        status: 'success',
                        timestamp: nowIso,
                        response_time: responseTime || 0,
                        user_name: userName || null
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
        // Skip RPC only for pure activity logs (apiType === 'activity_log') or special types
        // API calls with logAction should still trigger RPC (e.g., parse-consultation with completion log)
        if (apiType && apiType !== 'activity_log' && apiType !== 'heartbeat' && apiType !== 'status_change') {
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
        // IMPORTANT: This handles login logs and other activity logs from agents
        if (actionToLog) {
            // Validate required fields
            if (!agentId) {
                const errorMsg = `❌ Cannot save activity log: agentId is missing. Action: ${actionToLog}`;
                console.error(errorMsg);
                console.error('Full request body:', JSON.stringify(req.body, null, 2));
                // Don't return error - just log it, so the request doesn't fail
                // The agent might retry if we return error
            } else {
                // "Quote:"로 시작하는 메시지에 "Calculated" 추가
                let finalAction = actionToLog;
                if (finalAction.startsWith('Quote:') && !finalAction.startsWith('Calculated Quote:')) {
                    finalAction = `Calculated ${finalAction}`;
                }

                const logData = {
                    agent_id: agentId,
                    action: finalAction,
                    type: logType || (apiType === 'activity_log' ? 'log' : apiType),
                    status: logType || (isError ? 'error' : 'success'),
                    timestamp: new Date().toISOString(),
                    response_time: responseTime || 0,
                    user_name: userName || null,
                    image_url: imageUrl || req.body.imageUrl || null
                };

                console.log(`📝 [LOGIN LOG] Attempting to insert log:`, JSON.stringify(logData, null, 2));

                try {
                    const { error: logError, data: logDataResult } = await supabase
                        .from('activity_logs')
                        .insert(logData)
                        .select();

                    if (logError) {
                        console.error(`❌ [LOGIN LOG] Failed to insert log [${agentId}]:`, logError);
                        console.error('Failed log data:', JSON.stringify(logData, null, 2));
                        console.error('Error code:', logError.code);
                        console.error('Error message:', logError.message);
                        console.error('Error details:', logError.details);
                        console.error('Error hint:', logError.hint);
                    } else {
                        const insertedId = logDataResult?.[0]?.id;
                        console.log(`✅ [LOGIN LOG] Successfully saved: ${agentId} - "${finalAction}" [User: ${userName || 'null'}] [ID: ${insertedId}]`);
                    }
                } catch (insertError) {
                    console.error(`❌ [LOGIN LOG] Exception during insert [${agentId}]:`, insertError);
                    console.error('Exception stack:', insertError.stack);
                    console.error('Log data that caused exception:', JSON.stringify(logData, null, 2));
                }
            }
        } else {
            // Log when actionToLog is missing (for debugging)
            if (apiType === 'activity_log') {
                console.warn(`⚠️ [LOGIN LOG] Received activity_log but no actionToLog. Request body:`, JSON.stringify(req.body, null, 2));
            }
        }

        // Supabase Realtime handles frontend updates automatically
        res.json({ success: true });

    } catch (error) {
        console.error('Error processing stats:', error);
        res.status(500).json({ error: error.message });
    }
}
