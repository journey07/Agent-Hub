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
            userName // 사용자명 (users 테이블의 name 컬럼 값)
        } = req.body;

        const actionToLog = logAction || logMessage;

        console.log(`📥 Incoming API Call: ${agentId} - ${apiType} ${actionToLog ? `(Log: ${actionToLog})` : ''} ${userName ? `[User: ${userName}]` : '[No User]'}`);

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
            // "Quote:"로 시작하는 메시지에 "Calculated" 추가
            let finalAction = actionToLog;
            if (finalAction.startsWith('Quote:') && !finalAction.startsWith('Calculated Quote:')) {
                finalAction = `Calculated ${finalAction}`;
            }
            
            const logData = {
                agent_id: agentId,
                action: finalAction,
                type: apiType === 'activity_log' ? 'log' : apiType,
                status: logType || (isError ? 'error' : 'success'),
                timestamp: new Date().toISOString(),
                response_time: responseTime || 0,
                user_name: userName || null
            };
            
            console.log(`📝 Inserting log to activity_logs:`, JSON.stringify(logData, null, 2));
            
            const { error: logError, data: logDataResult } = await supabase
                .from('activity_logs')
                .insert(logData)
                .select();
                
            if (logError) {
                console.error(`❌ Activity Log Error [${agentId}]:`, logError);
                console.error('Log data that failed:', logData);
            } else {
                console.log(`✅ Logged successfully: ${agentId} - ${actionToLog} [User: ${userName || 'null'}]`);
                console.log('Inserted log ID:', logDataResult?.[0]?.id);
            }
        }

        // Supabase Realtime handles frontend updates automatically
        res.json({ success: true });

    } catch (error) {
        console.error('Error processing stats:', error);
        res.status(500).json({ error: error.message });
    }
}
