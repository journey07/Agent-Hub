import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getAllAgents, getSingleAgent, getRecentActivityLogs } from '../services/agentService';

/**
 * Hook to fetch all agents with complete stats
 * Uses React Query for automatic caching, background refetching, and stale data management
 */
export function useAgentsData() {
    return useQuery({
        queryKey: ['agents', 'all'],
        queryFn: async () => {
            const { data, error } = await getAllAgents();
            if (error) throw error;
            return data || [];
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
        refetchOnWindowFocus: false, // Realtime handles updates
        refetchOnMount: false, // Use cached data if available
        retry: 2,
    });
}

/**
 * Hook to fetch a single agent by ID
 * Useful for agent detail pages
 */
export function useAgentData(agentId) {
    return useQuery({
        queryKey: ['agents', agentId],
        queryFn: async () => {
            const { data, error } = await getSingleAgent(agentId);
            if (error) throw error;
            return data;
        },
        enabled: !!agentId, // Only run if agentId is provided
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 2,
    });
}

/**
 * Hook to fetch recent activity logs
 * Separate from agents data for better caching granularity
 */
export function useActivityLogs(limit = 100) {
    return useQuery({
        queryKey: ['activity-logs', limit],
        queryFn: async () => {
            const { data, error } = await getRecentActivityLogs(limit);
            if (error) throw error;
            return data || [];
        },
        staleTime: 2 * 60 * 1000, // 2 minutes (logs change more frequently)
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        retry: 2,
    });
}

/**
 * Hook to get lightweight stats data (for polling/background updates)
 * This is a lighter version that only fetches essential stats without full details
 */
export function useAgentsStats() {
    return useQuery({
        queryKey: ['agents', 'stats-only'],
        queryFn: async () => {
            // This will use the same getAllAgents but we can optimize later
            const { data, error } = await getAllAgents();
            if (error) throw error;
            return data || [];
        },
        staleTime: 30 * 1000, // 30 seconds (stats update frequently)
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        retry: 1,
    });
}

/**
 * Hook to manually invalidate and refetch agents data
 * Useful for triggering updates after mutations or Realtime events
 * 
 * CRITICAL: All functions are memoized with useCallback to prevent
 * infinite useEffect loops when used as dependencies
 */
export function useInvalidateAgents() {
    const queryClient = useQueryClient();

    // Memoize all functions to prevent infinite loops
    const invalidateAll = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['agents'] });
        queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    }, [queryClient]);

    const invalidateAgents = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['agents', 'all'] });
    }, [queryClient]);

    const invalidateAgent = useCallback((agentId) => {
        queryClient.invalidateQueries({ queryKey: ['agents', agentId] });
        queryClient.invalidateQueries({ queryKey: ['agents', 'all'] });
    }, [queryClient]);

    // Optimistic update for agent status/metadata
    const updateAgentStatusInCache = useCallback((agentId, updates) => {
        // Update list cache
        queryClient.setQueryData(['agents', 'all'], (oldAgents) => {
            if (!oldAgents) return oldAgents;
            return oldAgents.map(agent => {
                if (agent.id === agentId) {
                    return { ...agent, ...updates };
                }
                return agent;
            });
        });

        // Update single agent cache if exists
        queryClient.setQueryData(['agents', agentId], (oldAgent) => {
            if (!oldAgent) return oldAgent;
            return { ...oldAgent, ...updates };
        });
    }, [queryClient]);

    const invalidateLogs = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['activity-logs'] });
    }, [queryClient]);

    // Optimistic update for immediate log display
    const addLogOptimistically = useCallback((newLog) => {
        queryClient.setQueryData(['activity-logs', 100], (old) => {
            if (!old) return [newLog];
            // Add new log at the beginning and keep only 100
            return [newLog, ...old].slice(0, 100);
        });
    }, [queryClient]);

    return {
        invalidateAll,
        invalidateAgents,
        invalidateAgent,
        invalidateLogs,
        addLogOptimistically,
        updateAgentStatusInCache,
    };
}

