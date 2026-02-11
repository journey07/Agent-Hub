// Mock data for AI Agent Dashboard

export const agents = [
    // This agent's data will be dynamically loaded from world_quotation API
    // Placeholder for '견적 에이전트' - actual data fetched from /api/quote/dashboard-stats
    {
        id: 'agent-worldlocker-001',
        name: '견적 에이전트',
        client: '(주)월드락커',
        clientId: 'client-worldlocker',
        status: 'online',
        createdAt: '2024-12-01',
        lastActive: '2025-01-15T00:00:00',
        todayTasks: 0,
        totalTasks: 0,
        todayApiCalls: 0,
        totalApiCalls: 0,
        errorRate: 0,
        avgResponseTime: 0,
        isLiveAgent: true, // Flag to indicate this agent's data is fetched live
        description: '실시간 견적 산출 및 3D 모델링 생성',
        category: 'quotation'
    },
    {
        id: 'agent-worldlocker-002',
        name: '운영매출 분석 에이전트',
        client: '(주)월드락커',
        clientId: 'client-worldlocker',
        status: 'online',
        createdAt: '2025-01-15',
        lastActive: '2025-01-15T10:00:00',
        todayTasks: 8,
        totalTasks: 45,
        todayApiCalls: 120,
        totalApiCalls: 850,
        errorRate: 0.01,
        avgResponseTime: 350,
        description: '지점별 운영 데이터 및 매출 분석 리포트 생성',
        category: 'analysis'
    },
    {
        id: 'agent-worldlocker-003',
        name: '납품일정 에이전트',
        client: '(주)월드락커',
        clientId: 'client-worldlocker',
        status: 'online',
        createdAt: '2026-02-10',
        lastActive: '2026-02-10T00:00:00',
        todayTasks: 0,
        totalTasks: 0,
        todayApiCalls: 0,
        totalApiCalls: 0,
        errorRate: 0,
        avgResponseTime: 0,
        isLiveAgent: true,
        description: '납품 일정 관리 및 Teams 연동 알림 서비스',
        category: 'delivery'
    }
];

export const clients = [
    {
        id: 'client-worldlocker',
        name: '(주)월드락커',
        agentCount: 3,
        totalApiCalls: 850,
        plan: 'Enterprise',
        status: 'active',
        image: '/world_logo.png'
    },
    {
        id: 'client-mansu',
        name: '만수금속',
        agentCount: 1,
        totalApiCalls: 45,
        plan: 'Professional',
        status: 'active',
        image: '/mansu_logo.png' // Verified correct logo
    }
];

// API usage data for charts (last 7 days)
export const apiUsageData = [
    { date: '01/14', calls: 165, tasks: 20 }
];

// Hourly data for today
export const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: i.toString().padStart(2, '0'),
    calls: 0
}));

// Activity logs
export const activityLogs = [
    { id: 1, agent: '운영매출 분석 에이전트', action: 'Generated daily revenue report', timestamp: '2025-01-15T11:20:00', type: 'success' }
];

// Dashboard stats
export const dashboardStats = {
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'online' || a.status === 'processing').length,
    totalClients: clients.length,
    todayApiCalls: agents.reduce((sum, a) => sum + a.todayApiCalls, 0),
    todayTasks: agents.reduce((sum, a) => sum + a.todayTasks, 0),
    totalApiCalls: agents.reduce((sum, a) => sum + a.totalApiCalls, 0)
};
