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
        description: '실시간 견적 산출 및 3D 모델링 생성'
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
        description: '지점별 운영 데이터 및 매출 분석 리포트 생성'
    },
    {
        id: 'agent-mansu-001',
        name: '옵션 상담 에이전트',
        client: '만수금속',
        clientId: 'client-mansu',
        status: 'online',
        createdAt: '2025-01-15',
        lastActive: '2025-01-15T09:00:00',
        todayTasks: 12,
        totalTasks: 12,
        todayApiCalls: 45,
        totalApiCalls: 45,
        errorRate: 0,
        avgResponseTime: 120,
        description: '고객 맞춤형 옵션 상담 및 추천'
    },
    {
        id: 'agent-001',
        name: 'Customer Support Bot',
        client: 'TechCorp Inc.',
        clientId: 'client-001',
        status: 'online',
        createdAt: '2024-12-01',
        lastActive: '2025-01-14T23:30:00',
        todayTasks: 156,
        totalTasks: 12840,
        todayApiCalls: 892,
        totalApiCalls: 45230,
        errorRate: 0.02,
        avgResponseTime: 245,
        description: '24/7 client inquiries and support automation'
    },
    {
        id: 'agent-002',
        name: 'Sales Assistant',
        client: 'TechCorp Inc.',
        clientId: 'client-001',
        status: 'online',
        createdAt: '2024-11-15',
        lastActive: '2025-01-14T23:28:00',
        todayTasks: 89,
        totalTasks: 8920,
        todayApiCalls: 543,
        totalApiCalls: 32100,
        errorRate: 0.01,
        avgResponseTime: 180,
        description: 'Automated sales outreach and lead qualification'
    },
    {
        id: 'agent-003',
        name: 'Data Analyzer',
        client: 'DataFlow Systems',
        clientId: 'client-002',
        status: 'processing',
        createdAt: '2024-10-20',
        lastActive: '2025-01-14T23:35:00',
        todayTasks: 234,
        totalTasks: 18560,
        todayApiCalls: 1245,
        totalApiCalls: 89700,
        errorRate: 0.005,
        avgResponseTime: 320,
        description: 'Processing and analyzing large datasets'
    },
    {
        id: 'agent-004',
        name: 'Content Generator',
        client: 'MediaHub',
        clientId: 'client-003',
        status: 'offline',
        createdAt: '2024-09-10',
        lastActive: '2025-01-14T18:00:00',
        todayTasks: 0,
        totalTasks: 5600,
        todayApiCalls: 0,
        totalApiCalls: 15800,
        errorRate: 0.03,
        avgResponseTime: 450,
        description: 'Generating blog posts and social media content'
    },
    {
        id: 'agent-005',
        name: 'Code Review Bot',
        client: 'DevStudio',
        clientId: 'client-004',
        status: 'online',
        createdAt: '2024-08-05',
        lastActive: '2025-01-14T23:32:00',
        todayTasks: 67,
        totalTasks: 4230,
        todayApiCalls: 398,
        totalApiCalls: 22100,
        errorRate: 0.008,
        avgResponseTime: 520,
        description: 'Automated code review and quality checks'
    },
    {
        id: 'agent-006',
        name: 'Email Responder',
        client: 'DataFlow Systems',
        clientId: 'client-002',
        status: 'error',
        createdAt: '2024-07-20',
        lastActive: '2025-01-14T20:15:00',
        todayTasks: 12,
        totalTasks: 9800,
        todayApiCalls: 45,
        totalApiCalls: 41200,
        errorRate: 0.15,
        avgResponseTime: 890,
        description: 'Smart email categorization and auto-replies'
    },
    {
        id: 'agent-007',
        name: 'Report Generator',
        client: 'TechCorp Inc.',
        clientId: 'client-001',
        status: 'online',
        createdAt: '2024-06-15',
        lastActive: '2025-01-14T23:33:00',
        todayTasks: 45,
        totalTasks: 3200,
        todayApiCalls: 210,
        totalApiCalls: 18900,
        errorRate: 0.01,
        avgResponseTime: 680,
        description: 'Daily and weekly business report generation'
    },
    {
        id: 'agent-008',
        name: 'Translation Bot',
        client: 'GlobalTech',
        clientId: 'client-005',
        status: 'online',
        createdAt: '2024-05-01',
        lastActive: '2025-01-14T23:31:00',
        todayTasks: 178,
        totalTasks: 23400,
        todayApiCalls: 956,
        totalApiCalls: 112000,
        errorRate: 0.003,
        avgResponseTime: 195,
        description: 'Real-time multi-language translation service'
    },
    {
        id: 'agent-009',
        name: 'AI Legal Advisor',
        client: 'GlobalTech',
        clientId: 'client-005',
        status: 'online',
        createdAt: '2025-01-10',
        lastActive: '2025-01-15T11:00:00',
        todayTasks: 15,
        totalTasks: 120,
        todayApiCalls: 80,
        totalApiCalls: 600,
        errorRate: 0.005,
        avgResponseTime: 420,
        description: 'Automated legal document review and compliance check'
    },
    {
        id: 'agent-010',
        name: 'HR Assistant',
        client: 'TechCorp Inc.',
        clientId: 'client-001',
        status: 'online',
        createdAt: '2025-01-05',
        lastActive: '2025-01-15T10:45:00',
        todayTasks: 34,
        totalTasks: 280,
        todayApiCalls: 150,
        totalApiCalls: 1200,
        errorRate: 0.01,
        avgResponseTime: 210,
        description: 'Employee inquiry automation and scheduling'
    },
    {
        id: 'agent-011',
        name: 'Security Auditor',
        client: 'DataFlow Systems',
        clientId: 'client-002',
        status: 'processing',
        createdAt: '2025-01-12',
        lastActive: '2025-01-15T11:15:00',
        todayTasks: 5,
        totalTasks: 25,
        todayApiCalls: 300,
        totalApiCalls: 1500,
        errorRate: 0,
        avgResponseTime: 550,
        description: 'Real-time security vulnerability scanning and reporting'
    }
];

export const clients = [
    {
        id: 'client-worldlocker',
        name: '(주)월드락커',
        agentCount: 2,
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
    },
    {
        id: 'client-001',
        name: 'TechCorp Inc.',
        agentCount: 4,
        totalApiCalls: 97430,
        plan: 'Enterprise',
        status: 'active'
    },
    {
        id: 'client-002',
        name: 'DataFlow Systems',
        agentCount: 3,
        totalApiCalls: 132400,
        plan: 'Professional',
        status: 'active'
    },
    {
        id: 'client-003',
        name: 'MediaHub',
        agentCount: 1,
        totalApiCalls: 15800,
        plan: 'Starter',
        status: 'active'
    },
    {
        id: 'client-004',
        name: 'DevStudio',
        agentCount: 1,
        totalApiCalls: 22100,
        plan: 'Professional',
        status: 'active'
    },
    {
        id: 'client-005',
        name: 'GlobalTech',
        agentCount: 2,
        totalApiCalls: 112600,
        plan: 'Enterprise',
        status: 'active'
    }
];

// API usage data for charts (last 7 days)
export const apiUsageData = [
    { date: '01/08', calls: 4200, tasks: 890 },
    { date: '01/09', calls: 3800, tasks: 720 },
    { date: '01/10', calls: 5100, tasks: 1050 },
    { date: '01/11', calls: 4700, tasks: 920 },
    { date: '01/12', calls: 3200, tasks: 640 },
    { date: '01/13', calls: 4900, tasks: 980 },
    { date: '01/14', calls: 4289, tasks: 781 }
];

// Hourly data for today
export const hourlyData = [
    { hour: '00', calls: 120 },
    { hour: '01', calls: 80 },
    { hour: '02', calls: 45 },
    { hour: '03', calls: 30 },
    { hour: '04', calls: 25 },
    { hour: '05', calls: 40 },
    { hour: '06', calls: 85 },
    { hour: '07', calls: 150 },
    { hour: '08', calls: 280 },
    { hour: '09', calls: 420 },
    { hour: '10', calls: 380 },
    { hour: '11', calls: 350 },
    { hour: '12', calls: 290 },
    { hour: '13', calls: 340 },
    { hour: '14', calls: 380 },
    { hour: '15', calls: 360 },
    { hour: '16', calls: 320 },
    { hour: '17', calls: 280 },
    { hour: '18', calls: 200 },
    { hour: '19', calls: 160 },
    { hour: '20', calls: 140 },
    { hour: '21', calls: 120 },
    { hour: '22', calls: 100 },
    { hour: '23', calls: 90 }
];

// Activity logs
export const activityLogs = [
    { id: 1, agent: '운영매출 분석 에이전트', action: 'Generated daily revenue report', timestamp: '2025-01-15T11:20:00', type: 'success' },
    { id: 2, agent: 'Security Auditor', action: 'Security scan completed - No threats found', timestamp: '2025-01-15T11:15:00', type: 'success' },
    { id: 3, agent: 'AI Legal Advisor', action: 'Reviewed contract #4289', timestamp: '2025-01-15T11:10:00', type: 'success' },
    { id: 4, agent: 'Customer Support Bot', action: 'Completed task', timestamp: '2025-01-14T23:35:00', type: 'success' },
    { id: 5, agent: 'Data Analyzer', action: 'Processing batch request', timestamp: '2025-01-14T23:34:00', type: 'processing' },
    { id: 6, agent: 'Translation Bot', action: 'API rate limit warning', timestamp: '2025-01-14T23:33:00', type: 'warning' },
    { id: 7, agent: 'Code Review Bot', action: 'Completed code analysis', timestamp: '2025-01-14T23:32:00', type: 'success' },
    { id: 8, agent: 'Email Responder', action: 'Connection error', timestamp: '2025-01-14T23:30:00', type: 'error' }
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
