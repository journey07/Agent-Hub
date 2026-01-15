import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { clients } from '../data/mockData';
import { getAllAgents, updateAgentStats, checkAgentHealth } from '../services/agentService';
import { supabase } from '../lib/supabase';

const AgentContext = createContext(null);

export function AgentProvider({ children }) {
    const [agents, setAgents] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

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

    const [stats, setStats] = useState(() => calculateStats([]));

    // Load initial data from Supabase
    useEffect(() => {
        async function fetchInitialData() {
            try {
                console.log('📊 Loading initial data from Supabase...');
                const { data, error } = await getAllAgents();

                if (error) throw error;

                if (data && data.length > 0) {
                    // Extract and aggregate activityLogs from all agents
                    const allLogs = data.flatMap(agent => agent.activityLogs || []);
                    const sortedLogs = allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    setActivityLogs(sortedLogs);
                    console.log(`📋 Loaded ${sortedLogs.length} activity logs from Supabase`);

                    setAgents(data);
                    setStats(calculateStats(data));
                    setIsConnected(true);
                    console.log(`🤖 Loaded ${data.length} agents from Supabase`);
                }
            } catch (error) {
                console.error('Failed to fetch initial data from Supabase:', error);
                setIsConnected(false);
            }
        }

        fetchInitialData();
    }, []);

    // Subscribe to real-time changes using Supabase Realtime
    useEffect(() => {
        console.log('📡 Setting up Supabase Realtime subscriptions...');

        // Use a single channel for all dashboard updates to avoid connection limits/race conditions
        const channel = supabase
            .channel('dashboard-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'agents'
                },
                async (payload) => {
                    console.log('📡 Agents table changed:', payload);
                    // Fetch latest data to ensure consistency
                    const { data } = await getAllAgents();
                    if (data) {
                        const sortedAgents = [...data].sort((a, b) => {
                            if (a.id === 'agent-worldlocker-001') return -1;
                            if (b.id === 'agent-worldlocker-001') return 1;
                            return 0;
                        });
                        setAgents(sortedAgents);
                        setStats(calculateStats(sortedAgents));

                        // Also update logs since they might be fetched with agents
                        const allLogs = data.flatMap(agent => agent.activityLogs || []);
                        const sortedLogs = allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                        setActivityLogs(sortedLogs);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'activity_logs'
                },
                async (payload) => {
                    console.log('📡 New activity log:', payload);
                    // Optimistically update logs if possible, but fetching all is safer for consistency
                    const { data } = await getAllAgents();
                    if (data) {
                        const allLogs = data.flatMap(agent => agent.activityLogs || []);
                        const sortedLogs = allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                        setActivityLogs(sortedLogs);
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Connected to Supabase Realtime');
                    setIsConnected(true);
                } else if (status === 'CLOSED') {
                    console.log('❌ Disconnected from Supabase Realtime');
                    setIsConnected(false);
                } else if (status === 'CHANNEL_ERROR') {
                    console.log('⚠️ Supabase Realtime Channel Error');
                    setIsConnected(false);
                }
            });

        // Cleanup subscriptions on unmount
        return () => {
            console.log('🔌 Cleaning up Supabase Realtime subscriptions');
            supabase.removeChannel(channel);
        };
    }, []);

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

    // Check agent health (using service function)
    const checkHealth = useCallback(async (agentId) => {
        return await checkAgentHealth(agentId);
    }, []);

    const value = {
        agents,
        clients,
        stats,
        activityLogs,
        isConnected,
        toggleAgent,
        getAgentById,
        getAgentsByClient,
        getAgentsByStatus,
        checkAgentHealth: checkHealth
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
