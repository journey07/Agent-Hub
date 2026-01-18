import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { clients } from '../data/mockData';
import { getAllAgents, getSingleAgent, getRecentActivityLogs, updateAgentStats, checkAgentHealth } from '../services/agentService';
import { supabase } from '../lib/supabase';
import { safeAsync, safeAsyncWithRetry, getUserFriendlyMessage } from '../utils/errorHandler';
import { getTodayInKorea, getTodayInKoreaString } from '../utils/formatters';
import { useAuth } from './AuthContext';
import { queryClient } from '../lib/queryClient';

const AgentContext = createContext(null);

export function AgentProvider({ children }) {
    const { session, isAuthenticated } = useAuth();
    
    const [agents, setAgents] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Calculate real-time stats
    const calculateStats = (currentAgents) => {
        return {
            totalAgents: currentAgents.length,
            activeAgents: currentAgents.filter(a => a.status === 'online' || a.status === 'processing').length,
            offlineAgents: currentAgents.filter(a => a.status === 'offline').length,
            errorAgents: currentAgents.filter(a => a.status === 'error' || a.apiStatus === 'error').length,
            totalClients: clients.length,
            todayApiCalls: currentAgents.reduce((sum, a) => sum + (a.todayApiCalls || 0), 0),
            todayTasks: currentAgents.reduce((sum, a) => sum + (a.todayTasks || 0), 0),
            totalApiCalls: currentAgents.reduce((sum, a) => sum + (a.totalApiCalls || 0), 0),
            avgResponseTime: Math.round(currentAgents.reduce((sum, a) => sum + (a.avgResponseTime || 0), 0) / (currentAgents.length || 1))
        };
    };

    // Calculate weekly API usage data (last 7 days) from all agents' daily_stats
    const calculateWeeklyApiUsage = (currentAgents) => {
        // Get last 7 days dates using Korean timezone (24시 기준 = 자정 00:00)
        const today = getTodayInKorea();
        const dates = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date);
        }

        // Aggregate daily stats from all agents
        const dailyAggregates = new Map();
        dates.forEach(date => {
            // Use Korean timezone for date key
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

        // Sum up stats from all agents' dailyHistory
        let totalDataPoints = 0;
        currentAgents.forEach(agent => {
            if (agent.dailyHistory && Array.isArray(agent.dailyHistory)) {
                agent.dailyHistory.forEach(day => {
                    // Handle both string and Date object formats
                    let dateKey = day.date;
                    if (dateKey instanceof Date) {
                        dateKey = dateKey.toISOString().split('T')[0];
                    } else if (typeof dateKey === 'string') {
                        // Ensure it's in YYYY-MM-DD format
                        dateKey = dateKey.split('T')[0];
                    }
                    if (dailyAggregates.has(dateKey)) {
                        const calls = day.calls || day.api_calls || 0;
                        const tasks = day.tasks || 0;
                        dailyAggregates.get(dateKey).calls += calls;
                        dailyAggregates.get(dateKey).tasks += tasks;
                        totalDataPoints++;
                    }
                });
            }
        });


        // Convert to array and ensure all 7 days are present
        const result = dates.map(date => {
            // Use Korean timezone for date key
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

        return result;
    };

    // Calculate hourly traffic data (today) from all agents' hourly_stats
    // 오늘 날짜(한국 시간대)의 데이터만 집계 - 24시 리셋
    const calculateHourlyTraffic = (currentAgents) => {
        // Initialize 24 hours with zeros
        const hourlyAggregates = new Map();
        for (let i = 0; i < 24; i++) {
            const hourStr = i.toString().padStart(2, '0');
            hourlyAggregates.set(hourStr, {
                hour: hourStr,
                calls: 0,
                tasks: 0
            });
        }

        // 오늘 날짜 (한국 시간대 기준)
        const todayKorea = getTodayInKoreaString();

        // Sum up stats from all agents' hourlyStats (오늘 날짜만)
        currentAgents.forEach(agent => {
            if (agent.hourlyStats && Array.isArray(agent.hourlyStats)) {
                agent.hourlyStats.forEach(hourData => {
                    // 오늘 날짜가 아닌 데이터는 제외 (24시 리셋)
                    if (hourData.updated_at && hourData.updated_at !== todayKorea) {
                        return;
                    }
                    
                    // Ensure hour is a string in '00'-'23' format
                    let hourStr = hourData.hour;
                    if (hourStr === null || hourStr === undefined) {
                        return; // Skip invalid entries
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

        // Convert to array
        return Array.from(hourlyAggregates.values());
    };

    const [stats, setStats] = useState(() => calculateStats([]));
    const [weeklyApiUsage, setWeeklyApiUsage] = useState(() => calculateWeeklyApiUsage([]));
    const [hourlyTraffic, setHourlyTraffic] = useState(() => calculateHourlyTraffic([]));

    // Simple function to refresh all data including charts
    // Now with React Query caching support
    const refreshAllData = useCallback(async () => {
        const queryKey = ['agents', 'all'];
        
        // Check cache first
        const cachedData = queryClient.getQueryData(queryKey);
        if (cachedData) {
            // Use cached data immediately for fast UI update
            const sortedAgents = [...cachedData].sort((a, b) => {
                if (a.id === 'agent-worldlocker-001') return -1;
                if (b.id === 'agent-worldlocker-001') return 1;
                return 0;
            });
            const allLogs = cachedData.flatMap(agent => agent.activityLogs || []);
            const sortedLogs = allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            setAgents(sortedAgents);
            setStats(calculateStats(sortedAgents));
            setWeeklyApiUsage(calculateWeeklyApiUsage(sortedAgents));
            setHourlyTraffic(calculateHourlyTraffic(sortedAgents));
            setActivityLogs(sortedLogs);
            setIsConnected(true);
        }

        // Fetch fresh data (will update cache and state)
        const result = await safeAsync(
            async () => {
                const { data, error } = await getAllAgents();
                if (error) throw error;
                
                // Cache the data
                queryClient.setQueryData(queryKey, data, {
                    updatedAt: Date.now()
                });
                
                return data;
            },
            '전체 데이터 새로고침'
        );

        if (result.success && result.data && result.data.length > 0) {
            // Extract and aggregate activityLogs from all agents
            const allLogs = result.data.flatMap(agent => agent.activityLogs || []);
            const sortedLogs = allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            const sortedAgents = [...result.data].sort((a, b) => {
                if (a.id === 'agent-worldlocker-001') return -1;
                if (b.id === 'agent-worldlocker-001') return 1;
                return 0;
            });

            setAgents(sortedAgents);
            setStats(calculateStats(sortedAgents));
            setWeeklyApiUsage(calculateWeeklyApiUsage(sortedAgents));
            setHourlyTraffic(calculateHourlyTraffic(sortedAgents));
            setActivityLogs(sortedLogs);
            setIsConnected(true);
            setError(null);
        } else if (!result.success) {
            console.warn('Background refresh failed:', result.error);
        }
    }, []);

    // 자정(00:00) 감지 및 자동 리셋 함수
    // 한국 시간대 기준으로 날짜가 바뀌면 DB를 즉시 리셋하고 데이터 새로고침
    // 최적화: localStorage 먼저 읽고, 날짜가 같으면 불필요한 연산 생략
    const checkAndResetIfNeeded = useCallback(async () => {
        const lastCheckedDateKey = 'dashboard_last_checked_date';
        const storedDate = localStorage.getItem(lastCheckedDateKey);
        
        // 날짜가 저장되어 있지 않으면 초기 설정만 하고 리셋 불필요
        if (!storedDate) {
            const todayKorea = getTodayInKoreaString();
            localStorage.setItem(lastCheckedDateKey, todayKorea);
            return false;
        }

        // 오늘 날짜 확인 (날짜 비교를 위해만 호출)
        const todayKorea = getTodayInKoreaString();

        // 날짜가 바뀌지 않았으면 리셋 불필요
        if (storedDate === todayKorea) {
            return false;
        }

        // 날짜가 바뀌었으면 (자정이 지났으면) 리셋 실행
        try {
            console.log('🔄 날짜 변경 감지 - 통계 리셋 시작:', storedDate, '->', todayKorea);
            
            // DB에서 즉시 리셋 (모든 에이전트의 today 통계 리셋)
            const { error: resetError } = await supabase.rpc('reset_today_stats_for_all_agents');
            
            if (resetError) {
                console.error('❌ DB 리셋 실패:', resetError);
            } else {
                console.log('✅ DB 리셋 완료');
            }

            // 날짜 업데이트 (리셋 후 즉시 업데이트)
            localStorage.setItem(lastCheckedDateKey, todayKorea);
            
            return true; // 리셋이 발생했음을 반환
        } catch (error) {
            console.error('❌ 자정 리셋 중 오류:', error);
            // 오류가 나도 날짜는 업데이트 (다음 체크에서 다시 시도)
            localStorage.setItem(lastCheckedDateKey, todayKorea);
            return false;
        }
    }, []);

    // Load initial data from Supabase with error handling and retry
    // 초기 로드 시 날짜 체크 및 리셋 포함
    useEffect(() => {
        async function fetchInitialData() {
            setIsLoading(true);
            setError(null);

            // 1. 먼저 날짜 체크 및 리셋 (필요한 경우)
            const wasReset = await checkAndResetIfNeeded();
            
            // 2. 데이터 새로고침 (리셋되었든 안 되었든 최신 데이터 가져오기)
            await refreshAllData();

            setIsLoading(false);
        }

        fetchInitialData();
    }, [refreshAllData, checkAndResetIfNeeded]);

    // 자정(00:00) 감지 및 자동 리셋
    // 1분마다 날짜 체크하여 자정이 지났는지 확인
    useEffect(() => {
        // 1분마다 날짜 체크 (자정 감지)
        const midnightCheckInterval = setInterval(async () => {
            const wasReset = await checkAndResetIfNeeded();
            
            // 리셋이 발생했으면 데이터 새로고침
            if (wasReset) {
                await refreshAllData();
            }
        }, 60000); // 1분마다 체크

        return () => clearInterval(midnightCheckInterval);
    }, [checkAndResetIfNeeded, refreshAllData]);

    // Optimized polling: Refresh data every 5 seconds
    // 차트와 통계만 업데이트 (경량화)
    // Now with React Query caching support
    const refreshStatsOnly = useCallback(async () => {
        const queryKey = ['agents', 'stats-only'];
        
        // Check cache first for fast UI update
        const cachedData = queryClient.getQueryData(queryKey);
        if (cachedData?.agents) {
            const sortedAgents = [...cachedData.agents].sort((a, b) => {
                if (a.id === 'agent-worldlocker-001') return -1;
                if (b.id === 'agent-worldlocker-001') return 1;
                return 0;
            });
            setAgents(sortedAgents);
            setStats(calculateStats(sortedAgents));
            setWeeklyApiUsage(calculateWeeklyApiUsage(sortedAgents));
            setHourlyTraffic(calculateHourlyTraffic(sortedAgents));
            if (cachedData.logs) {
                setActivityLogs(cachedData.logs);
            }
        }

        const result = await safeAsync(
            async () => {
                // 에이전트 기본 정보만 가져오기 (경량)
                const { data: agents, error } = await supabase
                    .from('agents')
                    .select('id, name, status, today_api_calls, today_tasks, total_api_calls, total_tasks, avg_response_time, error_rate, last_active, client_name, client_id, base_url')
                    .order('sort_order', { ascending: true });

                if (error) throw error;

                // 차트용 데이터만 가져오기 (모든 에이전트의 daily_stats, hourly_stats)
                const { data: allDailyStats } = await supabase
                    .from('daily_stats')
                    .select('agent_id, date, tasks, api_calls')
                    .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 최근 7일만

                // 오늘 날짜만 가져오기 (한국 시간대 기준, 24시 리셋)
                const todayKorea = getTodayInKoreaString();
                
                const { data: allHourlyStats } = await supabase
                    .from('hourly_stats')
                    .select('agent_id, hour, tasks, api_calls, updated_at')
                    .eq('updated_at', todayKorea);

                // 로그도 함께 가져오기 (Realtime 실패 시 대비)
                const logsResult = await getRecentActivityLogs(100);

                // 에이전트별로 데이터 매핑
                const agentsWithStats = (agents || []).map(agent => {
                    const agentDailyStats = (allDailyStats || []).filter(s => s.agent_id === agent.id);
                    const agentHourlyStats = (allHourlyStats || []).filter(s => s.agent_id === agent.id);

                    return {
                        ...agent,
                        totalApiCalls: agent.total_api_calls,
                        todayApiCalls: agent.today_api_calls,
                        totalTasks: agent.total_tasks,
                        todayTasks: agent.today_tasks,
                        avgResponseTime: agent.avg_response_time,
                        errorRate: agent.error_rate,
                        apiStatus: agent.api_status,
                        baseUrl: agent.base_url,
                        lastActive: agent.last_active,
                        clientId: agent.client_id,
                        isLiveAgent: !!agent.base_url,
                        dailyHistory: agentDailyStats.map(s => ({
                            date: s.date,
                            calls: s.api_calls,
                            tasks: s.tasks
                        })),
                        hourlyStats: agentHourlyStats.map(s => ({
                            hour: s.hour,
                            apiCalls: s.api_calls,
                            tasks: s.tasks,
                            updated_at: s.updated_at  // 오늘 날짜 필터링용
                        }))
                    };
                });

                const data = { agents: agentsWithStats, logs: logsResult.data || [] };
                
                // Cache the data
                queryClient.setQueryData(queryKey, data, {
                    updatedAt: Date.now()
                });
                
                return data;
            },
            '경량 통계 새로고침'
        );

        if (result.success && result.data) {
            const sortedAgents = [...result.data.agents].sort((a, b) => {
                if (a.id === 'agent-worldlocker-001') return -1;
                if (b.id === 'agent-worldlocker-001') return 1;
                return 0;
            });

            setAgents(sortedAgents);
            setStats(calculateStats(sortedAgents));
            setWeeklyApiUsage(calculateWeeklyApiUsage(sortedAgents));
            setHourlyTraffic(calculateHourlyTraffic(sortedAgents));
            
            // 로그도 업데이트 (Realtime 실패 시 대비)
            if (result.data.logs && result.data.logs.length > 0) {
                setActivityLogs(result.data.logs);
            }
            
            setIsConnected(true);
        }
    }, []);

    // Fallback polling: Realtime이 완전히 실패할 경우를 대비한 백업 (연결이 끊어졌을 때만)
    useEffect(() => {
        if (isConnected) {
            return;
        }

        // Realtime이 끊어졌을 때만 fallback으로 주기적 업데이트 (30초마다)
        const fallbackIntervalId = setInterval(() => {
            refreshStatsOnly();
        }, 30000);

        return () => clearInterval(fallbackIntervalId);
    }, [isConnected, refreshStatsOnly]);

    // Refresh data function (full refresh - used for initial load and fallback)
    const refreshData = useCallback(async () => {
        const result = await safeAsync(
            async () => {
                const { data, error } = await getAllAgents();
                if (error) throw error;
                return data;
            },
            '데이터 새로고침'
        );

        if (result.success && result.data && result.data.length > 0) {
            const sortedAgents = [...result.data].sort((a, b) => {
                if (a.id === 'agent-worldlocker-001') return -1;
                if (b.id === 'agent-worldlocker-001') return 1;
                return 0;
            });
            setAgents(sortedAgents);
            setStats(calculateStats(sortedAgents));
            setWeeklyApiUsage(calculateWeeklyApiUsage(sortedAgents));
            setHourlyTraffic(calculateHourlyTraffic(sortedAgents));

            // Update logs
            const allLogs = result.data.flatMap(agent => agent.activityLogs || []);
            const sortedLogs = allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setActivityLogs(sortedLogs);
            setError(null);
        } else if (!result.success) {
            // Only set error for critical failures, not for background refreshes
            console.warn('Background refresh failed:', result.error);
        }
    }, []);

    // Update single agent (partial update) with error handling
    // Invalidates cache when agent is updated
    const updateSingleAgent = useCallback(async (agentId) => {
        const result = await safeAsync(
            async () => {
                const { data: updatedAgent, error } = await getSingleAgent(agentId);
                if (error) throw error;
                
                // Update cache for single agent
                queryClient.setQueryData(['agents', agentId], updatedAgent);
                
                return updatedAgent;
            },
            `에이전트 ${agentId} 업데이트`
        );

        if (result.success && result.data) {
            const updatedAgent = result.data;
            
            // Invalidate related caches to trigger refetch
            queryClient.invalidateQueries({ queryKey: ['agents', 'all'] });
            queryClient.invalidateQueries({ queryKey: ['agents', 'stats-only'] });
            
            setAgents(prev => {
                const existingIndex = prev.findIndex(a => a.id === agentId);
                let sorted;
                if (existingIndex >= 0) {
                    // Update existing agent
                    const updated = [...prev];
                    updated[existingIndex] = updatedAgent;
                    // Maintain sort order
                    sorted = updated.sort((a, b) => {
                        if (a.id === 'agent-worldlocker-001') return -1;
                        if (b.id === 'agent-worldlocker-001') return 1;
                        return 0;
                    });
                } else {
                    // New agent, add to list
                    sorted = [...prev, updatedAgent].sort((a, b) => {
                        if (a.id === 'agent-worldlocker-001') return -1;
                        if (b.id === 'agent-worldlocker-001') return 1;
                        return 0;
                    });
                }
                // Update stats and charts with the new agent data
                setStats(calculateStats(sorted));
                setWeeklyApiUsage(calculateWeeklyApiUsage(sorted));
                setHourlyTraffic(calculateHourlyTraffic(sorted));
                return sorted;
            });

            // Update activity logs if this agent has new logs
            if (updatedAgent.activityLogs && updatedAgent.activityLogs.length > 0) {
                setActivityLogs(prev => {
                    const existingIds = new Set(prev.map(log => log.id));
                    const newLogs = updatedAgent.activityLogs.filter(log => !existingIds.has(log.id));
                    if (newLogs.length > 0) {
                        const combined = [...newLogs, ...prev];
                        return combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    }
                    return prev;
                });
            }
        } else if (!result.success) {
            // Silent fail for background updates to avoid spamming errors
            console.warn(`Background update failed for agent ${agentId}:`, result.error);
        }
    }, []);

    // Update activity logs only (when new log is added) with error handling
    const updateActivityLogs = useCallback(async () => {
        const result = await safeAsync(
            async () => {
                const { data: logs, error } = await getRecentActivityLogs(100);
                if (error) throw error;
                return logs;
            },
            '활동 로그 업데이트'
        );

        if (result.success && result.data && result.data.length > 0) {
            setActivityLogs(result.data);
        } else if (!result.success) {
            // Silent fail for background updates
            console.warn('Background activity log update failed:', result.error);
        }
    }, []);

    // Batch update queue for debouncing multiple rapid updates
    const updateQueueRef = useRef(new Set());
    const updateTimerRef = useRef(null);
    const updateSingleAgentRef = useRef(updateSingleAgent);

    // Keep ref updated
    useEffect(() => {
        updateSingleAgentRef.current = updateSingleAgent;
    }, [updateSingleAgent]);

    const queueAgentUpdate = useCallback((agentId) => {
        updateQueueRef.current.add(agentId);

        // Clear existing timer
        if (updateTimerRef.current) {
            clearTimeout(updateTimerRef.current);
        }

        // Debounce: wait 300ms for more updates before processing
        updateTimerRef.current = setTimeout(async () => {
            const agentIds = Array.from(updateQueueRef.current);
            updateQueueRef.current.clear();

            // Process all queued updates using ref to avoid closure issues
            await Promise.all(agentIds.map(id => updateSingleAgentRef.current(id)));
        }, 300);
    }, []);

    // WebSocket 기반 완전 실시간 업데이트
    // 인증 상태가 변경될 때마다 Realtime 구독 재설정
    useEffect(() => {
        if (!isAuthenticated || !session) {
            setIsConnected(false);
            return;
        }
        

        // Use a single channel for all dashboard updates
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
                filter: undefined  // 명시적으로 필터 없음
            },
                async (payload) => {
                    // 즉시 업데이트
                    if (payload.eventType === 'UPDATE' && payload.new?.id) {
                        // 에이전트 통계 변경 시 즉시 반영
                        const updatedAgent = payload.new;
                        setAgents(prev => {
                            const existingIndex = prev.findIndex(a => a.id === updatedAgent.id);
                            if (existingIndex >= 0) {
                                const updated = [...prev];
                                // 통계만 업데이트 (빠른 반영)
                                updated[existingIndex] = {
                                    ...updated[existingIndex],
                                    todayApiCalls: updatedAgent.today_api_calls || updated[existingIndex].todayApiCalls,
                                    totalApiCalls: updatedAgent.total_api_calls || updated[existingIndex].totalApiCalls,
                                    todayTasks: updatedAgent.today_tasks || updated[existingIndex].todayTasks,
                                    totalTasks: updatedAgent.total_tasks || updated[existingIndex].totalTasks,
                                    avgResponseTime: updatedAgent.avg_response_time || updated[existingIndex].avgResponseTime,
                                    errorRate: updatedAgent.error_rate || updated[existingIndex].errorRate,
                                    status: updatedAgent.status || updated[existingIndex].status,
                                    lastActive: updatedAgent.last_active || updated[existingIndex].lastActive
                                };
                                const sorted = updated.sort((a, b) => {
                                    if (a.id === 'agent-worldlocker-001') return -1;
                                    if (b.id === 'agent-worldlocker-001') return 1;
                                    return 0;
                                });
                                // 즉시 통계와 차트 업데이트
                                setStats(calculateStats(sorted));
                                return sorted;
                            }
                            return prev;
                        });
                        // 차트용 데이터는 백그라운드에서 업데이트
                        queueAgentUpdate(updatedAgent.id);
                    } else if (payload.eventType === 'INSERT' && payload.new?.id) {
                        queueAgentUpdate(payload.new.id);
                    } else if (payload.eventType === 'DELETE' && payload.old?.id) {
                        setAgents(prev => {
                            const filtered = prev.filter(a => a.id !== payload.old.id);
                            setStats(calculateStats(filtered));
                            setWeeklyApiUsage(calculateWeeklyApiUsage(filtered));
                            setHourlyTraffic(calculateHourlyTraffic(filtered));
                            return filtered;
                        });
                    }
                }
        )
        .on(
            'postgres_changes',
            {
                event: '*',  // INSERT, UPDATE, DELETE 모두 구독
                schema: 'public',
                table: 'activity_logs',
                filter: undefined  // 명시적으로 필터 없음
            },
            (payload) => {
                // INSERT 이벤트만 처리
                if (payload.eventType === 'INSERT' && payload.new) {
                    const newLog = payload.new;
                    
                    setActivityLogs(prev => {
                        // 중복 체크
                        if (prev.some(log => log.id === newLog.id)) {
                            return prev;
                        }
                        
                        const agentName = newLog.agent_id;
                        
                        const newLogEntry = {
                            id: newLog.id,
                            agent_id: newLog.agent_id,
                            agent: agentName,
                            action: newLog.action || '',
                            type: newLog.type || newLog.status || 'info',
                            status: newLog.status || 'success',
                            timestamp: newLog.timestamp || new Date().toISOString(),
                            responseTime: newLog.response_time || 0
                        };
                        
                        // 최신 로그를 맨 위에 추가하고 최대 100개만 유지
                        const updated = [newLogEntry, ...prev].slice(0, 100);
                        return updated;
                    });
                    
                    // 에이전트 이름을 업데이트하기 위해 agents 상태도 확인
                    setAgents(currentAgents => {
                        const agent = currentAgents.find(a => a.id === newLog.agent_id);
                        if (agent) {
                            // 로그의 에이전트 이름 업데이트
                            setActivityLogs(prev => {
                                return prev.map(log => 
                                    log.id === newLog.id && log.agent === newLog.agent_id
                                        ? { ...log, agent: agent.name || agent.client_name || newLog.agent_id }
                                        : log
                                );
                            });
                        }
                        return currentAgents;
                    });
                    
                    // 관련 에이전트 통계도 업데이트
                    if (newLog.agent_id) {
                        queueAgentUpdate(newLog.agent_id);
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
            async (payload) => {
                // API breakdown change means agent stats changed
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
                async (payload) => {
                    // Daily stats 변경 시 즉시 차트 업데이트
                    if (payload.new?.agent_id) {
                        // 해당 에이전트만 업데이트하고 차트 재계산
                        queueAgentUpdate(payload.new.agent_id);
                        
                        // 차트는 현재 agents 상태 기반으로 즉시 재계산
                        setAgents(prev => {
                            const updated = [...prev];
                            setWeeklyApiUsage(calculateWeeklyApiUsage(updated));
                            return updated;
                        });
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
                async (payload) => {
                    // Hourly stats 변경 시 즉시 차트 업데이트
                    if (payload.new?.agent_id) {
                        // 해당 에이전트만 업데이트하고 차트 재계산
                        queueAgentUpdate(payload.new.agent_id);
                        
                        // 차트는 현재 agents 상태 기반으로 즉시 재계산
                        setAgents(prev => {
                            const updated = [...prev];
                            setHourlyTraffic(calculateHourlyTraffic(updated));
                            return updated;
                        });
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

        // Cleanup subscriptions on unmount or auth change
        return () => {
            if (updateTimerRef.current) {
                clearTimeout(updateTimerRef.current);
            }
            supabase.removeChannel(channel);
        };
    }, [isAuthenticated, session?.user?.id]); // 인증 상태가 변경될 때마다 재구독 (session 객체 전체보다 user.id 사용)

    // Toggle agent status (on/off)
    const toggleAgent = useCallback(async (agentId) => {
        const agent = agents.find(a => a.id === agentId);
        if (!agent) return;

        // Check if it's a live agent with base_url
        if (agent.baseUrl) {
            try {
                const response = await fetch(`${agent.baseUrl}/api/quote/agent-toggle`, {
                    method: 'POST'
                });
                if (response.ok) {
                    const data = await response.json();

                    // Update in Supabase
                    await supabase
                        .from('agents')
                        .update({ status: data.status })
                        .eq('id', agentId);

                    // Local state will be updated via Realtime subscription
                    return;
                }
            } catch (error) {
                console.error('Failed to toggle live agent:', error);
                return;
            }
        }

        // Default toggle behavior for mock agents
        const newStatus = agent.status === 'online' || agent.status === 'processing'
            ? 'offline'
            : 'online';

        await supabase
            .from('agents')
            .update({ status: newStatus })
            .eq('id', agentId);

        // Local state will be updated via Realtime subscription
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

    // Check agent health (using service function) with retry
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
