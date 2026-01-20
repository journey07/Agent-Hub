import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { clients } from '../data/mockData';
import { checkAgentHealth } from '../services/agentService';
import { supabase } from '../lib/supabase';
import { safeAsyncWithRetry } from '../utils/errorHandler';
import { getTodayInKorea, getTodayInKoreaString } from '../utils/formatters';
import { useAuth } from './AuthContext';
import { useAgentsData, useActivityLogs, useInvalidateAgents } from '../hooks/useAgentsData';

const AgentContext = createContext(null);

export function AgentProvider({ children }) {
    const { session, isAuthenticated } = useAuth();

    // Use React Query hooks for data fetching
    const { data: rawAgents, isLoading: isLoadingAgents, error: agentsError } = useAgentsData();
    const { data: rawActivityLogs, isLoading: isLoadingLogs } = useActivityLogs(100);
    const { invalidateAll, invalidateAgents, invalidateAgent, invalidateLogs, addLogOptimistically } = useInvalidateAgents();

    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);

    // Combine loading states
    const isLoading = isLoadingAgents || isLoadingLogs;

    // Sort agents (worldlocker first)
    const agents = useMemo(() => {
        if (!rawAgents || rawAgents.length === 0) return [];
        return [...rawAgents].sort((a, b) => {
            if (a.id === 'agent-worldlocker-001') return -1;
            if (b.id === 'agent-worldlocker-001') return 1;
            return 0;
        });
    }, [rawAgents]);

    // Activity logs from React Query
    const activityLogs = useMemo(() => {
        return rawActivityLogs || [];
    }, [rawActivityLogs]);

    // Calculate real-time stats (memoized)
    const stats = useMemo(() => {
        return {
            totalAgents: agents.length,
            activeAgents: agents.filter(a => a.status === 'online' || a.status === 'processing').length,
            offlineAgents: agents.filter(a => a.status === 'offline').length,
            errorAgents: agents.filter(a => a.status === 'error' || a.apiStatus === 'error').length,
            totalClients: clients.length,
            todayApiCalls: agents.reduce((sum, a) => sum + (a.todayApiCalls || 0), 0),
            todayTasks: agents.reduce((sum, a) => sum + (a.todayTasks || 0), 0),
            totalApiCalls: agents.reduce((sum, a) => sum + (a.totalApiCalls || 0), 0),
            avgResponseTime: Math.round(agents.reduce((sum, a) => sum + (a.avgResponseTime || 0), 0) / (agents.length || 1))
        };
    }, [agents]);

    // Calculate weekly API usage data (last 7 days) - memoized
    const weeklyApiUsage = useMemo(() => {
        const today = getTodayInKorea();
        const dates = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date);
        }

        const dailyAggregates = new Map();
        dates.forEach(date => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateKey = `${year}-${month}-${day}`;
            const dateStr = `${month}/${day}`;
            dailyAggregates.set(dateKey, {
                date: dateStr,
                calls: 0,
                tasks: 0
            });
        });

        agents.forEach(agent => {
            if (agent.dailyHistory && Array.isArray(agent.dailyHistory)) {
                agent.dailyHistory.forEach(day => {
                    let dateKey = day.date;
                    if (dateKey instanceof Date) {
                        dateKey = dateKey.toISOString().split('T')[0];
                    } else if (typeof dateKey === 'string') {
                        dateKey = dateKey.split('T')[0];
                    }
                    if (dailyAggregates.has(dateKey)) {
                        const calls = day.calls || day.api_calls || 0;
                        const tasks = day.tasks || 0;
                        dailyAggregates.get(dateKey).calls += calls;
                        dailyAggregates.get(dateKey).tasks += tasks;
                    }
                });
            }
        });

        return dates.map(date => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateKey = `${year}-${month}-${day}`;
            return dailyAggregates.get(dateKey) || {
                date: `${month}/${day}`,
                calls: 0,
                tasks: 0
            };
        });
    }, [agents]);

    // Calculate hourly traffic data (today) - memoized
    const hourlyTraffic = useMemo(() => {
        const hourlyAggregates = new Map();
        for (let i = 0; i < 24; i++) {
            const hourStr = i.toString().padStart(2, '0');
            hourlyAggregates.set(hourStr, {
                hour: hourStr,
                calls: 0,
                tasks: 0
            });
        }

        const todayKorea = getTodayInKoreaString();

        agents.forEach(agent => {
            if (agent.hourlyStats && Array.isArray(agent.hourlyStats)) {
                agent.hourlyStats.forEach(hourData => {
                    if (hourData.updated_at && hourData.updated_at !== todayKorea) {
                        return;
                    }

                    let hourStr = hourData.hour;
                    if (hourStr === null || hourStr === undefined) {
                        return;
                    }
                    if (typeof hourStr === 'number') {
                        hourStr = hourStr.toString().padStart(2, '0');
                    } else if (typeof hourStr === 'string') {
                        hourStr = hourStr.padStart(2, '0');
                    }
                    if (hourlyAggregates.has(hourStr)) {
                        hourlyAggregates.get(hourStr).calls += (hourData.apiCalls || hourData.api_calls || 0);
                        hourlyAggregates.get(hourStr).tasks += (hourData.tasks || 0);
                    }
                });
            }
        });

        return Array.from(hourlyAggregates.values());
    }, [agents]);

    // 자정(00:00) 감지 및 자동 리셋 함수
    const checkAndResetIfNeeded = useCallback(async () => {
        const lastCheckedDateKey = 'dashboard_last_checked_date';
        const storedDate = localStorage.getItem(lastCheckedDateKey);

        if (!storedDate) {
            const todayKorea = getTodayInKoreaString();
            localStorage.setItem(lastCheckedDateKey, todayKorea);
            return false;
        }

        const todayKorea = getTodayInKoreaString();

        if (storedDate === todayKorea) {
            return false;
        }

        try {
            console.log('🔄 날짜 변경 감지 - 통계 리셋 시작:', storedDate, '->', todayKorea);

            const { error: resetError } = await supabase.rpc('reset_today_stats_for_all_agents');

            if (resetError) {
                console.error('❌ DB 리셋 실패:', resetError);
            } else {
                console.log('✅ DB 리셋 완료');
            }

            localStorage.setItem(lastCheckedDateKey, todayKorea);

            return true;
        } catch (error) {
            console.error('❌ 자정 리셋 중 오류:', error);
            localStorage.setItem(lastCheckedDateKey, todayKorea);
            return false;
        }
    }, []);

    // 자정 리셋 체크 및 데이터 새로고침
    useEffect(() => {
        async function checkMidnightReset() {
            const wasReset = await checkAndResetIfNeeded();
            if (wasReset) {
                // Invalidate all queries to trigger refetch
                invalidateAll();
            }
        }

        checkMidnightReset();

        // 1분마다 날짜 체크
        const midnightCheckInterval = setInterval(async () => {
            const wasReset = await checkAndResetIfNeeded();
            if (wasReset) {
                invalidateAll();
            }
        }, 60000);

        return () => clearInterval(midnightCheckInterval);
    }, [checkAndResetIfNeeded, invalidateAll]);

    // Batch update queue for debouncing multiple rapid updates
    const updateQueueRef = useRef(new Set());
    const updateTimerRef = useRef(null);

    const queueAgentUpdate = useCallback((agentId) => {
        updateQueueRef.current.add(agentId);

        if (updateTimerRef.current) {
            clearTimeout(updateTimerRef.current);
        }

        updateTimerRef.current = setTimeout(() => {
            const agentIds = Array.from(updateQueueRef.current);
            updateQueueRef.current.clear();

            // Invalidate queries for updated agents
            agentIds.forEach(id => invalidateAgent(id));
        }, 300);
    }, [invalidateAgent]);

    // Realtime subscriptions
    useEffect(() => {
        if (!isAuthenticated || !session) {
            setIsConnected(false);
            return;
        }

        const channel = supabase
            .channel('dashboard-realtime', {
                config: {
                    broadcast: { self: true },
                    presence: { key: '' }
                }
            })
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'agents',
                    filter: undefined
                },
                (payload) => {
                    if (payload.eventType === 'UPDATE' && payload.new?.id) {
                        queueAgentUpdate(payload.new.id);
                    } else if (payload.eventType === 'INSERT' && payload.new?.id) {
                        invalidateAgents();
                    } else if (payload.eventType === 'DELETE' && payload.old?.id) {
                        invalidateAgents();
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'activity_logs',
                    filter: undefined
                },
                (payload) => {
                    if (payload.eventType === 'INSERT' && payload.new) {
                        // Optimistic update: immediately add log to cache for instant UI update
                        const newLog = {
                            id: payload.new.id,
                            agent_id: payload.new.agent_id,
                            agent: payload.new.agent_id, // Will be updated by background refetch
                            action: payload.new.action || '',
                            type: (payload.new.type === 'log' || payload.new.type === 'activity' || !payload.new.type)
                                ? (payload.new.status || payload.new.type)
                                : payload.new.type,
                            status: payload.new.status || 'success',
                            timestamp: payload.new.timestamp || new Date().toISOString(),
                            responseTime: payload.new.response_time || 0,
                            userName: payload.new.user_name || null
                        };

                        // Immediately update cache for instant display
                        addLogOptimistically(newLog);

                        // Background refetch to get agent name and validate data
                        invalidateLogs();

                        if (payload.new.agent_id) {
                            queueAgentUpdate(payload.new.agent_id);
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'api_breakdown',
                    filter: undefined
                },
                (payload) => {
                    if (payload.new?.agent_id) {
                        queueAgentUpdate(payload.new.agent_id);
                    } else if (payload.old?.agent_id) {
                        queueAgentUpdate(payload.old.agent_id);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'daily_stats',
                    filter: undefined
                },
                (payload) => {
                    if (payload.new?.agent_id) {
                        queueAgentUpdate(payload.new.agent_id);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'hourly_stats',
                    filter: undefined
                },
                (payload) => {
                    if (payload.new?.agent_id) {
                        queueAgentUpdate(payload.new.agent_id);
                    }
                }
            )
            .subscribe(async (status, err) => {
                if (status === 'SUBSCRIBED') {
                    setIsConnected(true);
                } else if (status === 'CLOSED') {
                    console.error('❌ Realtime 연결 끊어짐');
                    setIsConnected(false);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Realtime 구독 실패:', err);
                    setIsConnected(false);
                } else if (status === 'TIMED_OUT') {
                    console.error('⏱️ Realtime 연결 시간 초과');
                    setIsConnected(false);
                } else if (status !== 'SUBSCRIBED') {
                    setIsConnected(false);
                }
            });

        return () => {
            if (updateTimerRef.current) {
                clearTimeout(updateTimerRef.current);
            }
            supabase.removeChannel(channel);
        };
    }, [isAuthenticated, queueAgentUpdate, invalidateAgents, invalidateLogs, addLogOptimistically]);
    // Note: session removed from dependencies to prevent reconnection on auth state changes

    // Toggle agent status (on/off)
    const toggleAgent = useCallback(async (agentId) => {
        const agent = agents.find(a => a.id === agentId);
        if (!agent) return;

        if (agent.baseUrl) {
            try {
                const response = await fetch(`${agent.baseUrl}/api/quote/agent-toggle`, {
                    method: 'POST'
                });
                if (response.ok) {
                    const data = await response.json();

                    await supabase
                        .from('agents')
                        .update({ status: data.status })
                        .eq('id', agentId);

                    // Realtime will handle the update
                    return;
                }
            } catch (error) {
                console.error('Failed to toggle live agent:', error);
                return;
            }
        }

        const newStatus = agent.status === 'online' || agent.status === 'processing'
            ? 'offline'
            : 'online';

        await supabase
            .from('agents')
            .update({ status: newStatus })
            .eq('id', agentId);

        // Realtime will handle the update
    }, [agents]);

    // Get agent by ID
    const getAgentById = useCallback((agentId) => {
        return agents.find(agent => agent.id === agentId);
    }, [agents]);

    // Get agents by client
    const getAgentsByClient = useCallback((clientId) => {
        return agents.filter(agent => agent.clientId === clientId);
    }, [agents]);

    // Get agents by status
    const getAgentsByStatus = useCallback((status) => {
        return agents.filter(agent => agent.status === status);
    }, [agents]);

    // Check agent health with retry
    const checkHealth = useCallback(async (agentId) => {
        const result = await safeAsyncWithRetry(
            async () => {
                const healthResult = await checkAgentHealth(agentId);
                if (!healthResult.success) {
                    throw new Error(healthResult.message || 'Health check failed');
                }
                return healthResult;
            },
            {
                context: `에이전트 ${agentId} 상태 확인`,
                retryOptions: {
                    maxRetries: 2,
                    initialDelay: 500,
                    maxDelay: 2000
                }
            }
        );

        if (result.success) {
            return result.data;
        } else {
            return {
                success: false,
                message: result.error || '상태 확인 실패'
            };
        }
    }, []);

    // Clear error function
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    // Update error state when agentsError changes
    useEffect(() => {
        if (agentsError) {
            setError(agentsError);
        }
    }, [agentsError]);

    const value = {
        agents,
        clients,
        stats,
        activityLogs,
        weeklyApiUsage,
        hourlyTraffic,
        isConnected,
        isLoading,
        error,
        toggleAgent,
        getAgentById,
        getAgentsByClient,
        getAgentsByStatus,
        checkAgentHealth: checkHealth,
        clearError
    };

    return (
        <AgentContext.Provider value={value}>
            {children}
        </AgentContext.Provider>
    );
}

export function useAgents() {
    const context = useContext(AgentContext);
    if (!context) {
        throw new Error('useAgents must be used within an AgentProvider');
    }
    return context;
}

export default AgentContext;
