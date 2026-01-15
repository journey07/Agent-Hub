import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { clients } from '../data/mockData';
import { getAllAgents, getSingleAgent, getRecentActivityLogs, updateAgentStats, checkAgentHealth } from '../services/agentService';
import { supabase } from '../lib/supabase';
import { safeAsync, safeAsyncWithRetry, getUserFriendlyMessage } from '../utils/errorHandler';
import { getTodayInKorea } from '../utils/formatters';
import { useAuth } from './AuthContext';

const AgentContext = createContext(null);

export function AgentProvider({ children }) {
    // 최상단에 강제 로그 (항상 실행되는지 확인)
    console.log('🚨🚨🚨 [AgentProvider] 컴포넌트 렌더링 시작 🚨🚨🚨');
    
    const { session, isAuthenticated } = useAuth();
    console.log('🚨🚨🚨 [AgentProvider] useAuth() 호출 완료:', { 
        isAuthenticated, 
        hasSession: !!session,
        userEmail: session?.user?.email || 'None'
    });
    
    const [agents, setAgents] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // 디버깅: 인증 상태 로깅
    useEffect(() => {
        console.log('🔍 [AgentContext] 인증 상태 변경:', {
            isAuthenticated,
            hasSession: !!session,
            userEmail: session?.user?.email || 'None',
            sessionId: session?.user?.id || 'None'
        });
    }, [isAuthenticated, session]);
    
    // 디버깅: 컴포넌트 마운트 확인
    useEffect(() => {
        console.log('🚨🚨🚨 [AgentContext] 컴포넌트 마운트됨 🚨🚨🚨');
        return () => {
            console.log('🔍 [AgentContext] 컴포넌트 언마운트됨');
        };
    }, []);

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

        if (totalDataPoints === 0) {
            console.warn('⚠️ No daily_stats data found for chart. Make sure update_agent_stats function includes daily_stats updates.');
        } else {
            console.log(`📊 Aggregated ${totalDataPoints} daily stats data points for weekly chart`);
        }

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

        // Sum up stats from all agents' hourlyStats
        currentAgents.forEach(agent => {
            if (agent.hourlyStats && Array.isArray(agent.hourlyStats)) {
                agent.hourlyStats.forEach(hourData => {
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
    const refreshAllData = useCallback(async () => {
        const result = await safeAsync(
            async () => {
                const { data, error } = await getAllAgents();
                if (error) throw error;
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

    // Load initial data from Supabase with error handling and retry
    useEffect(() => {
        async function fetchInitialData() {
            setIsLoading(true);
            setError(null);

            await refreshAllData();

            setIsLoading(false);
        }

        fetchInitialData();
    }, [refreshAllData]);

    // Optimized polling: Refresh data every 5 seconds
    // 차트와 통계만 업데이트 (경량화)
    const refreshStatsOnly = useCallback(async () => {
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

                const { data: allHourlyStats } = await supabase
                    .from('hourly_stats')
                    .select('agent_id, hour, tasks, api_calls');

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
                            tasks: s.tasks
                        }))
                    };
                });

                return { agents: agentsWithStats, logs: logsResult.data || [] };
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
        // Realtime이 연결되어 있으면 polling 불필요 - WebSocket으로 실시간 업데이트
        if (isConnected) {
            console.log('✅ Realtime 연결됨 - WebSocket으로 실시간 업데이트 중');
            return;
        }

        // Realtime이 끊어졌을 때만 fallback으로 주기적 업데이트 (30초마다)
        console.warn('⚠️ Realtime 연결 끊어짐 - Fallback polling 활성화 (30초마다)');
        const fallbackIntervalId = setInterval(() => {
            console.warn('⚠️ Fallback polling 실행 중... (Realtime 연결 복구 대기)');
            refreshStatsOnly();
        }, 30000); // 30초마다 백업 업데이트

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
    const updateSingleAgent = useCallback(async (agentId) => {
        const result = await safeAsync(
            async () => {
                const { data: updatedAgent, error } = await getSingleAgent(agentId);
                if (error) throw error;
                return updatedAgent;
            },
            `에이전트 ${agentId} 업데이트`
        );

        if (result.success && result.data) {
            const updatedAgent = result.data;
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

    // WebSocket 기반 완전 실시간 업데이트 (홈쇼핑처럼!)
    // 인증 상태가 변경될 때마다 Realtime 구독 재설정
    useEffect(() => {
        // 강제로 콘솔에 출력 (항상 실행되는지 확인)
        console.log('🚨🚨🚨 [Realtime Setup] useEffect 실행됨 🚨🚨🚨');
        console.log('🔍 [Realtime Setup] 인증 상태:', { 
            isAuthenticated, 
            hasSession: !!session,
            sessionUser: session?.user?.email || 'None',
            sessionId: session?.user?.id || 'None'
        });
        
        // 직접 Supabase에서 세션 확인 (이중 체크)
        supabase.auth.getSession().then(({ data: { session: directSession }, error }) => {
            console.log('🔍 [Realtime Setup] 직접 세션 확인:', {
                hasDirectSession: !!directSession,
                directUser: directSession?.user?.email || 'None',
                error: error?.message || 'None'
            });
        });
        
        // 로그인하지 않았으면 Realtime 구독하지 않음
        if (!isAuthenticated || !session) {
            console.log('⏸️ 로그인하지 않음 - Realtime 구독 대기 중...');
            console.log('💡 로그인 후 자동으로 Realtime 구독이 시작됩니다.');
            console.log('💡 현재 상태:', { isAuthenticated, session: session ? '있음' : '없음' });
            setIsConnected(false);
            return;
        }
        
        console.log('📡 Setting up WebSocket Realtime for instant updates...');
        console.log('🔍 Realtime 구독 설정 시작...');
        console.log('✅ 인증됨 - 사용자:', session.user?.email || 'Unknown');
        console.log('✅ Realtime 이벤트를 받을 수 있습니다 (RLS 정책 통과)');
        
        // 전역 변수로 테스트 함수 노출 (브라우저 콘솔에서 사용)
        if (typeof window !== 'undefined') {
            window.testRealtimeInsert = async () => {
                console.log('🧪 Realtime INSERT 테스트 시작...');
                
                // 인증 상태 확인
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    console.error('❌ 인증되지 않음 - 먼저 로그인하세요!');
                    return;
                }
                
                const { data, error } = await supabase
                    .from('activity_logs')
                    .insert({
                        agent_id: 'agent-worldlocker-001',
                        action: '🧪 테스트 로그 - Realtime 작동 확인',
                        type: 'test',
                        status: 'info',
                        timestamp: new Date().toISOString(),
                        response_time: 0
                    });
                
                if (error) {
                    console.error('❌ INSERT 실패:', error);
                } else {
                    console.log('✅ INSERT 성공:', data);
                    console.log('⏳ 이제 "⚡⚡⚡ 실시간 로그 이벤트 수신!" 메시지가 나타나야 합니다...');
                }
            };
            
            window.checkAuthStatus = async () => {
                const { data: { session }, error } = await supabase.auth.getSession();
                console.log('🔍 인증 상태:', session ? '✅ 인증됨' : '❌ 인증 안 됨', session?.user?.email || '');
                return session;
            };
            
            // 종합 진단 도구
            window.diagnoseRealtime = async () => {
                console.log('🔍🔍🔍 Realtime 완전 진단 시작 🔍🔍🔍\n');
                
                // 1. 인증 확인
                const { data: { session }, error: authError } = await supabase.auth.getSession();
                console.log('1️⃣ 인증 상태:', session ? '✅ 인증됨 (' + session.user.email + ')' : '❌ 인증 안 됨');
                if (!session) {
                    console.error('   → 로그인하세요!');
                    return;
                }
                
                // 2. WebSocket 연결 확인
                const channels = supabase.realtime.channels;
                console.log('\n2️⃣ WebSocket 채널 상태:');
                if (channels.length === 0) {
                    console.error('   ❌ 채널이 없습니다! Realtime이 연결되지 않았습니다.');
                } else {
                    channels.forEach(ch => {
                        console.log(`   - ${ch.topic}: ${ch.state}`);
                        if (ch.state !== 'joined' && ch.state !== 'subscribed') {
                            console.error(`      ⚠️ 채널 상태가 비정상입니다: ${ch.state}`);
                        }
                    });
                }
                
                // 3. 테이블 접근 확인
                console.log('\n3️⃣ 테이블 접근 확인:');
                const { data: tableData, error: tableError } = await supabase
                    .from('activity_logs')
                    .select('id')
                    .limit(1);
                if (tableError) {
                    console.error('   ❌ 테이블 접근 실패:', tableError.message);
                    console.error('   → RLS 정책 문제일 수 있습니다!');
                } else {
                    console.log('   ✅ 테이블 접근 성공');
                }
                
                // 4. Publication 확인 (간접 - SQL 쿼리로)
                console.log('\n4️⃣ Publication 확인:');
                console.log('   → Supabase Dashboard → Database → Replication에서 확인하세요');
                console.log('   → activity_logs, agents, daily_stats, hourly_stats, api_breakdown이 목록에 있어야 함');
                
                // 5. 실시간 테스트 구독
                console.log('\n5️⃣ 실시간 테스트 구독 시작...');
                const testChannel = supabase.channel('diagnosis-test-' + Date.now())
                    .on('postgres_changes', {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'activity_logs'
                    }, (payload) => {
                        console.log('✅✅✅✅✅ 이벤트 수신 성공! ✅✅✅✅✅');
                        console.log('   Payload:', payload);
                        console.log('   → Realtime이 정상 작동합니다!');
                    })
                    .subscribe((status, err) => {
                        console.log('   구독 상태:', status);
                        if (status === 'SUBSCRIBED') {
                            console.log('   ✅ 테스트 구독 성공!');
                            console.log('   → 이제 testRealtimeInsert() 실행하거나');
                            console.log('   → Supabase Dashboard에서 activity_logs에 직접 INSERT 해보세요');
                        } else {
                            console.error('   ❌ 테스트 구독 실패:', status, err);
                            if (status === 'CHANNEL_ERROR') {
                                console.error('   → Realtime 서비스가 비활성화되었을 수 있습니다!');
                                console.error('   → Supabase Dashboard → Realtime → Settings 확인');
                            }
                        }
                    });
                
                // 6. 종합 결과
                console.log('\n📊 종합 진단 결과:');
                const hasChannels = channels.length > 0;
                const hasTableAccess = !tableError;
                const allGood = hasChannels && hasTableAccess && session;
                
                if (allGood) {
                    console.log('✅ 기본 설정은 정상입니다.');
                    console.log('⚠️ 하지만 이벤트가 안 오면:');
                    console.log('   1. Supabase Dashboard → Realtime → Settings → "Enable Realtime service" 확인');
                    console.log('   2. Supabase Dashboard → Database → Replication에서 테이블 확인');
                    console.log('   3. Network 탭 → WebSocket → Messages에서 이벤트 확인');
                } else {
                    console.error('❌ 문제 발견:');
                    if (!session) console.error('   - 인증 안 됨');
                    if (!hasChannels) console.error('   - WebSocket 채널 없음');
                    if (!hasTableAccess) console.error('   - 테이블 접근 실패 (RLS 문제 가능)');
                }
                
                return {
                    session: !!session,
                    channels: channels.length,
                    tableAccess: !tableError,
                    testChannel
                };
            };
            
            console.log('💡 테스트: 브라우저 콘솔에서 다음 명령어 실행:');
            console.log('   - testRealtimeInsert() : Realtime INSERT 테스트');
            console.log('   - checkAuthStatus() : 인증 상태 확인');
            console.log('   - diagnoseRealtime() : 완전 진단 (추천!)');
        }

        // Use a single channel for all dashboard updates to avoid connection limits/race conditions
        console.log('🔍 [Realtime] Channel 생성 시작...');
        const channel = supabase
        .channel('dashboard-realtime', {
            config: {
                broadcast: { self: true },
                presence: { key: '' }
            }
        })
        
        // 모든 이벤트를 로깅 (디버깅용)
        .on('broadcast', { event: '*' }, (payload) => {
            console.log('📡 [DEBUG] Broadcast 이벤트:', payload);
        })
        .on('presence', { event: '*' }, (payload) => {
            console.log('📡 [DEBUG] Presence 이벤트:', payload);
        })
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
            console.log('🚨🚨🚨 [DEBUG] Postgres 변경 감지 (모든 이벤트) 🚨🚨🚨');
            console.log('📡 이벤트 타입:', payload.eventType);
            console.log('📡 테이블:', payload.table);
            console.log('📡 전체 Payload:', payload);
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
                    console.log('⚡ 실시간 업데이트:', payload.eventType, payload.new?.id || payload.old?.id);
                    
                    // 즉시 업데이트 - 홈쇼핑처럼!
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
                console.log('🎯🎯🎯🎯🎯 activity_logs 이벤트 핸들러 실행! 🎯🎯🎯🎯🎯');
                console.log('🚨🚨🚨 이 메시지가 보이면 Realtime이 작동하는 것입니다! 🚨🚨🚨');
                console.log('📡 이벤트 타입:', payload.eventType);
                const receivedTime = Date.now();
                const logTimestamp = payload.new?.timestamp ? new Date(payload.new.timestamp).getTime() : receivedTime;
                const delay = receivedTime - logTimestamp;
                
                console.log('⚡⚡⚡⚡⚡ 실시간 로그 이벤트 수신! ⚡⚡⚡⚡⚡');
                console.log('📦 Payload:', payload);
                console.log('📦 payload.new:', payload.new);
                console.log(`⏱️ 지연 시간: ${delay}ms (${(delay / 1000).toFixed(2)}초)`);
                console.log('Payload 전체:', JSON.stringify(payload, null, 2));
                
                if (delay > 2000) {
                    console.error(`❌ 심각한 지연 감지: ${delay}ms - Realtime이 제대로 작동하지 않을 수 있습니다!`);
                }
                
                // INSERT 이벤트만 처리
                if (payload.eventType === 'INSERT' && payload.new) {
                    const newLog = payload.new;
                    console.log('새 로그 데이터 (INSERT):', newLog);
                    
                    // 에이전트 이름을 가져오기 위해 현재 agents 상태 사용
                    // 함수형 업데이트로 최신 상태 참조
                    setActivityLogs(prev => {
                        // 중복 체크
                        if (prev.some(log => log.id === newLog.id)) {
                            console.log('로그 중복, 스킵:', newLog.id);
                            return prev;
                        }
                        
                        // agents 상태에서 에이전트 이름 찾기
                        // 주의: 이 방법은 클로저 문제가 있을 수 있으므로
                        // 에이전트 이름은 나중에 업데이트하거나 기본값 사용
                        const agentName = newLog.agent_id; // 일단 ID 사용, 나중에 업데이트
                        
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
                        
                        console.log('✅ 새 로그 UI에 추가:', newLogEntry);
                        
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
                } else {
                    console.log('⚠️ INSERT가 아닌 이벤트 또는 payload.new 없음:', {
                        eventType: payload.eventType,
                        hasNew: !!payload.new,
                        hasOld: !!payload.old,
                        payload
                    });
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
                console.log('📡 API breakdown changed:', payload.eventType);
                
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
                    console.log('📡 Daily stats changed (실시간):', payload.eventType, payload.new);
                    
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
                    console.log('📡 Hourly stats changed (실시간):', payload.eventType, payload.new);
                    
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
                console.log(`🚨🚨🚨 Realtime 구독 상태 변경: ${status} 🚨🚨🚨`, err || '');
                
                // 구독 파라미터 확인
                if (channel.bindings && channel.bindings.length > 0) {
                    console.log('📋 구독 파라미터:', channel.bindings);
                    channel.bindings.forEach((binding, idx) => {
                        console.log(`   ${idx + 1}. ${binding.event} - ${binding.schema}.${binding.table}`);
                    });
                } else {
                    console.warn('⚠️ 구독 파라미터가 없습니다! "No subscription params" 오류의 원인일 수 있습니다.');
                    console.warn('   → Supabase Dashboard → Database → Replication에서 테이블 확인');
                    console.warn('   → Publication에 테이블이 추가되어 있어야 합니다');
                }
                
                if (status === 'SUBSCRIBED') {
                    console.log('✅✅✅✅✅ WebSocket Connected - 실시간 업데이트 활성화! ✅✅✅✅✅');
                    console.log('📡 Subscribed to: agents, activity_logs, daily_stats, hourly_stats, api_breakdown');
                    console.log('🔍 Realtime 연결 상태: SUBSCRIBED - 이제 실시간 업데이트가 작동합니다!');
                    console.log('');
                    console.log('🧪 테스트: 브라우저 콘솔에서 testRealtimeInsert() 실행하세요');
                    console.log('');
                    console.log('🔍 디버깅: Network 탭 → WebSocket 연결 확인');
                    console.log('   - wss://...supabase.co/realtime/... 연결 확인');
                    console.log('   - Messages 탭에서 postgres_changes 이벤트 확인');
                    console.log('   - "No subscription params" 메시지가 있으면 Publication 문제');
                    console.log('');
                    setIsConnected(true);
                    
                    // 구독 성공 후 즉시 테스트 INSERT 실행 (자동 테스트)
                    setTimeout(async () => {
                        console.log('🧪 자동 테스트: 3초 후 testRealtimeInsert() 실행...');
                        if (window.testRealtimeInsert) {
                            console.log('🧪 testRealtimeInsert() 실행 중...');
                            await window.testRealtimeInsert();
                            console.log('🧪 testRealtimeInsert() 완료 - 이제 Realtime 이벤트가 와야 합니다');
                            console.log('');
                            console.log('💡💡💡 중요: 이벤트가 오지 않으면 다음을 확인하세요:');
                            console.log('   1. Supabase SQL Editor에서 test_realtime_direct.sql 실행');
                            console.log('      - RLS 정책 수정 (anon, authenticated 모두 허용)');
                            console.log('      - REPLICA IDENTITY FULL 설정');
                            console.log('   2. Network 탭 → WebSocket → Messages 확인');
                            console.log('      - postgres_changes 이벤트가 오는지 확인');
                            console.log('   3. Supabase Dashboard → Database → Replication 확인');
                            console.log('      - activity_logs 테이블이 목록에 있는지 확인');
                            console.log('');
                        }
                    }, 3000);
                } else if (status === 'CLOSED') {
                    console.error('❌ WebSocket Disconnected - Realtime이 끊어졌습니다!');
                    console.error('⚠️ 이제 fallback polling (30초마다)만 작동합니다.');
                    setIsConnected(false);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('⚠️ WebSocket Channel Error:', err);
                    console.error('❌ Realtime 구독 실패 - fallback polling으로 전환됩니다.');
                    setIsConnected(false);
                } else if (status === 'TIMED_OUT') {
                    console.error('⏱️ WebSocket Connection Timeout - Realtime 연결 시간 초과!');
                    setIsConnected(false);
                } else {
                    console.log('📡 WebSocket Status:', status, err);
                    if (status !== 'SUBSCRIBED') {
                        console.warn(`⚠️ Realtime 상태가 SUBSCRIBED가 아닙니다: ${status}`);
                        setIsConnected(false);
                    }
                }
            });

        // Cleanup subscriptions on unmount or auth change
        return () => {
            console.log('🔌 Cleaning up WebSocket subscriptions');
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
