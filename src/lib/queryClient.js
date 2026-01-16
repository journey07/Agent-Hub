import { QueryClient } from '@tanstack/react-query';

/**
 * React Query Client Configuration
 * Provides caching, background refetching, and stale data management
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // 데이터가 stale로 간주되는 시간 (5분)
            staleTime: 5 * 60 * 1000, // 5 minutes
            
            // 캐시에 데이터를 유지하는 시간 (30분)
            gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
            
            // 자동으로 백그라운드에서 refetch하는지 여부
            refetchOnWindowFocus: true,
            
            // 네트워크가 다시 연결될 때 refetch
            refetchOnReconnect: true,
            
            // 마운트 시 refetch 여부
            refetchOnMount: false, // 캐시된 데이터가 있으면 사용
            
            // 재시도 설정
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
        mutations: {
            // Mutation 실패 시 재시도
            retry: 1,
        },
    },
});
