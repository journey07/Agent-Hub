import { supabase } from '../lib/supabase';

/**
 * Fetch recent activity logs for all agents
 * Used for updating activity logs without full refresh
 */
export async function getRecentActivityLogs(limit = 100) {
    try {
        // Fetch logs
        const { data: logRows, error: logsError } = await supabase
            .from('activity_logs')
            .select('id, agent_id, action, status, timestamp, response_time')
            .order('id', { ascending: false })
            .limit(limit);

        if (logsError) throw logsError;

        if (!logRows || logRows.length === 0) {
            return { data: [], error: null };
        }

        // Get unique agent IDs
        const agentIds = [...new Set(logRows.map(log => log.agent_id))];

        // Fetch agent names in batch
        const { data: agentsData } = await supabase
            .from('agents')
            .select('id, name, client_name')
            .in('id', agentIds);

        // Create agent name map
        const agentMap = new Map();
        (agentsData || []).forEach(agent => {
            agentMap.set(agent.id, agent.name || agent.client_name || agent.id);
        });

        // Map logs with agent names
        const activityLogs = logRows.map(log => ({
            ...log,
            type: log.status,
            responseTime: log.response_time,
            agentId: log.agent_id,
            agent: agentMap.get(log.agent_id) || log.agent_id
        }));

        return { data: activityLogs, error: null };
    } catch (error) {
        console.error('Failed to fetch recent activity logs:', error);
        return { data: null, error };
    }
}

/**
 * Agent Service
 * Replaces api/stats.js with Supabase queries
 */

/**
 * Fetch a single agent with complete stats
 * Used for partial updates when only one agent changes
 */
export async function getSingleAgent(agentId) {
    try {
        // Fetch agent
        const { data: agent, error: agentsError } = await supabase
            .from('agents')
            .select('*')
            .eq('id', agentId)
            .single();

        if (agentsError) throw agentsError;
        if (!agent) return { data: null, error: null };

        // Fetch API breakdown
        const { data: breakdownRows } = await supabase
            .from('api_breakdown')
            .select('*')
            .eq('agent_id', agentId);

        const apiBreakdown = {};
        (breakdownRows || []).forEach(row => {
            apiBreakdown[row.api_type] = {
                today: row.today_count,
                total: row.total_count
            };
        });

        // Fetch daily history (last 30 days)
        const { data: dailyHistory } = await supabase
            .from('daily_stats')
            .select('date, tasks, api_calls, breakdown')
            .eq('agent_id', agentId)
            .order('date', { ascending: false })
            .limit(30);

        const parsedHistory = (dailyHistory || []).map(row => ({
            ...row,
            calls: row.api_calls,
            breakdown: row.breakdown || {}
        }));

        // Fetch hourly stats
        const { data: hourlyStats } = await supabase
            .from('hourly_stats')
            .select('hour, tasks, api_calls')
            .eq('agent_id', agentId)
            .order('hour');

        const hourlyData = (hourlyStats && hourlyStats.length > 0)
            ? hourlyStats.map(row => ({
                hour: row.hour,
                tasks: row.tasks,
                apiCalls: row.api_calls
            }))
            : Array.from({ length: 24 }, (_, i) => ({
                hour: i.toString().padStart(2, '0'),
                tasks: 0,
                apiCalls: 0
            }));

        // Fetch activity logs (last 50)
        const { data: logRows } = await supabase
            .from('activity_logs')
            .select('id, action, status, timestamp, response_time')
            .eq('agent_id', agentId)
            .order('id', { ascending: false })
            .limit(50);

        const activityLogs = (logRows || []).map(log => ({
            ...log,
            type: log.status,
            responseTime: log.response_time,
            agentId,
            agent: agent.name
        }));

        const fullAgent = {
            ...agent,
            // Map snake_case to camelCase for frontend compatibility
            totalApiCalls: agent.total_api_calls,
            todayApiCalls: agent.today_api_calls,
            totalTasks: agent.total_tasks,
            todayTasks: agent.today_tasks,
            avgResponseTime: agent.avg_response_time,
            errorRate: agent.error_rate,
            apiStatus: agent.api_status,
            baseUrl: agent.base_url,
            apiKey: agent.api_key,
            lastActive: agent.last_active,
            clientId: agent.client_id,
            isLiveAgent: !!agent.base_url,
            // Additional data
            apiBreakdown,
            dailyHistory: parsedHistory,
            hourlyStats: hourlyData,
            activityLogs
        };

        return { data: fullAgent, error: null };
    } catch (error) {
        console.error(`Failed to fetch agent ${agentId}:`, error);
        return { data: null, error };
    }
}

/**
 * Fetch all agents with their complete stats
 */
export async function getAllAgents() {
    try {
        // Fetch agents
        const { data: agents, error: agentsError } = await supabase
            .from('agents')
            .select('*')
            .order('sort_order', { ascending: true });

        if (agentsError) throw agentsError;

        // For each agent, fetch related data
        const fullStats = await Promise.all(agents.map(async (agent) => {
            const agentId = agent.id;

            // Fetch API breakdown
            const { data: breakdownRows } = await supabase
                .from('api_breakdown')
                .select('*')
                .eq('agent_id', agentId);

            const apiBreakdown = {};
            (breakdownRows || []).forEach(row => {
                apiBreakdown[row.api_type] = {
                    today: row.today_count,
                    total: row.total_count
                };
            });

            // Fetch daily history (last 30 days)
            const { data: dailyHistory } = await supabase
                .from('daily_stats')
                .select('date, tasks, api_calls, breakdown')
                .eq('agent_id', agentId)
                .order('date', { ascending: false })
                .limit(30);

            const parsedHistory = (dailyHistory || []).map(row => ({
                ...row,
                calls: row.api_calls,
                breakdown: row.breakdown || {}
            }));

            // Fetch hourly stats
            const { data: hourlyStats } = await supabase
                .from('hourly_stats')
                .select('hour, tasks, api_calls')
                .eq('agent_id', agentId)
                .order('hour');

            const hourlyData = (hourlyStats && hourlyStats.length > 0)
                ? hourlyStats.map(row => ({
                    hour: row.hour,
                    tasks: row.tasks,
                    apiCalls: row.api_calls
                }))
                : Array.from({ length: 24 }, (_, i) => ({
                    hour: i.toString().padStart(2, '0'),
                    tasks: 0,
                    apiCalls: 0
                }));

            // Fetch activity logs (last 50)
            const { data: logRows } = await supabase
                .from('activity_logs')
                .select('id, action, status, timestamp, response_time')
                .eq('agent_id', agentId)
                .order('id', { ascending: false })
                .limit(50);

            const activityLogs = (logRows || []).map(log => ({
                ...log,
                type: log.status,
                responseTime: log.response_time,
                agentId,
                agent: agent.name
            }));

            return {
                ...agent,
                // Map snake_case to camelCase for frontend compatibility
                totalApiCalls: agent.total_api_calls,
                todayApiCalls: agent.today_api_calls,
                totalTasks: agent.total_tasks,
                todayTasks: agent.today_tasks,
                avgResponseTime: agent.avg_response_time,
                errorRate: agent.error_rate,
                apiStatus: agent.api_status,
                baseUrl: agent.base_url,
                apiKey: agent.api_key,
                lastActive: agent.last_active,
                clientId: agent.client_id,
                isLiveAgent: !!agent.base_url,
                // Additional data
                apiBreakdown,
                dailyHistory: parsedHistory,
                hourlyStats: hourlyData,
                activityLogs
            };
        }));

        return { data: fullStats, error: null };
    } catch (error) {
        console.error('Failed to fetch agents:', error);
        return { data: null, error };
    }
}

/**
 * Update agent stats (replaces POST /api/stats)
 */
export async function updateAgentStats({
    agentId,
    apiType,
    logAction,
    logType,
    logMessage,
    responseTime = 0,
    isError = false,
    shouldCountApi = true,
    shouldCountTask = true,
    model,
    baseUrl,
    account,
    apiKey,
    status
}) {
    try {
        // Check if agent exists
        const { data: agent, error: agentError } = await supabase
            .from('agents')
            .select('*')
            .eq('id', agentId)
            .single();

        if (agentError || !agent) {
            throw new Error('Agent not found');
        }

        // Handle heartbeat (registration/keep-alive)
        if (apiType === 'heartbeat') {
            const { data: updatedAgent } = await supabase
                .from('agents')
                .update({
                    last_active: new Date().toISOString(),
                    model: model || agent.model,
                    base_url: baseUrl || agent.base_url,
                    account: account || agent.account,
                    api_key: apiKey || agent.api_key,
                    status: 'online'
                })
                .eq('id', agentId)
                .select()
                .single();

            return { data: updatedAgent, error: null };
        }

        // Handle status change
        if (apiType === 'status_change') {
            const validStatus = ['online', 'offline', 'error', 'processing'].includes(status)
                ? status
                : 'online';

            const { data: updatedAgent } = await supabase
                .from('agents')
                .update({
                    status: validStatus,
                    last_active: new Date().toISOString()
                })
                .eq('id', agentId)
                .select()
                .single();

            return { data: updatedAgent, error: null };
        }

        // Handle activity log only
        if (apiType === 'activity_log' && logAction) {
            await supabase
                .from('activity_logs')
                .insert({
                    agent_id: agentId,
                    action: logAction,
                    type: 'activity',
                    status: logType || 'info',
                    timestamp: new Date().toISOString(),
                    response_time: responseTime
                });

            // Fetch updated agent data
            const result = await getAllAgents();
            const updatedAgent = result.data?.find(a => a.id === agentId);
            return { data: updatedAgent, error: null };
        }

        // Use the stored function for updating stats
        const { error: funcError } = await supabase.rpc('update_agent_stats', {
            p_agent_id: agentId,
            p_api_type: apiType,
            p_response_time: responseTime,
            p_is_error: isError,
            p_should_count_api: shouldCountApi,
            p_should_count_task: shouldCountTask
        });

        if (funcError) throw funcError;

        // Add activity log
        await supabase
            .from('activity_logs')
            .insert({
                agent_id: agentId,
                action: logMessage || apiType,
                type: 'api_call',
                status: isError ? 'error' : 'success',
                timestamp: new Date().toISOString(),
                response_time: responseTime
            });

        // Fetch and return updated agent data
        const result = await getAllAgents();
        const updatedAgent = result.data?.find(a => a.id === agentId);

        return { data: updatedAgent, error: null };
    } catch (error) {
        console.error('Failed to update agent stats:', error);
        return { data: null, error };
    }
}

/**
 * Manual health check for an agent
 * Includes timeout and better error handling
 */
export async function checkAgentHealth(agentId) {
    try {
        // Call the Brain Server (Vercel Function) instead of the agent directly
        // This avoids CORS issues and ensures the Supabase update happens on the server side
        // In production, use relative path. In development, use localhost if running server.js
        const isDev = import.meta.env.DEV;
        const brainServerUrl = import.meta.env.VITE_BRAIN_SERVER_URL;
        
        let apiUrl;
        if (brainServerUrl) {
            // Custom Brain Server URL provided
            apiUrl = `${brainServerUrl}/api/stats/check-manual`;
        } else if (isDev) {
            // Development: use localhost if server.js is running
            apiUrl = 'http://localhost:5001/api/stats/check-manual';
        } else {
            // Production: use relative path (same domain)
            apiUrl = '/api/stats/check-manual';
        }

        // Add timeout to prevent hanging requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ agentId }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorText = 'Unknown error';
                try {
                    errorText = await response.text();
                } catch (e) {
                    // Ignore error reading response
                }
                throw new Error(`Brain server check failed: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json();
            return {
                success: data.success,
                message: data.message || (data.success ? '연결 확인됨' : '연결 실패')
            };
        } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                throw new Error('요청 시간이 초과되었습니다. 서버가 응답하지 않습니다.');
            }
            throw fetchError;
        }
    } catch (error) {
        console.error('Health check error:', error);
        return { 
            success: false, 
            message: error.message || '상태 체크 실패' 
        };
    }
}
