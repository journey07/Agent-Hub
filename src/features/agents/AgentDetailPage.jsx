import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Activity, AlertCircle, Database, Shield, Key, Cpu, Zap, BarChart3, TrendingUp, History } from 'lucide-react';
import { useAgents } from '../../context/AgentContext';
import { formatNumber, formatRelativeTime, formatLogTimestamp, getTodayInKoreaString } from '../../utils/formatters';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, BarChart, Bar } from 'recharts';
import { useState, useMemo } from 'react';
import { useCountUp } from '../../utils/useCountUp';
import './AgentDetailPage.css';

// Task Performance Item 컴포넌트 (애니메이션을 위해 분리)
function TaskPerformanceItem({ task }) {
    const animatedPeriod = useCountUp(task.period || 0, 1000, 0, 50);
    
    return (
        <div className="task-item-premium">
            <div className="task-info-top">
                <div className="task-name-group">
                    <div className="task-icon-box">{task.icon}</div>
                    <span className="task-name-text">{task.name}</span>
                </div>
                <div className="task-count-group">
                    <span className="task-today-val">{animatedPeriod}</span>
                    <span className="task-total-val">{task.total} total</span>
                </div>
            </div>
            <div className="task-progress-bg">
                <div
                    className="task-progress-bar"
                    style={{
                        width: `${Math.min(100, (task.period / (task.total || 1)) * 100)}%`,
                        backgroundColor: task.color
                    }}
                />
            </div>
        </div>
    );
}

export function AgentDetailPage() {
    const { id } = useParams();
    const { agents, activityLogs } = useAgents();
    // Live find agent from context to ensure updates
    const agent = useMemo(() => agents.find(a => a.id === id), [agents, id]);

    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'logs'
    const [chartTimeRange, setChartTimeRange] = useState('today'); // 'today' (others disabled for now)
    // Auto-scroll logic removed as logs are ordered newest-first (top)

    // 숫자 카운트업 애니메이션 (모든 훅을 조건부 return 전에 호출)
    // latency는 숫자가 자주 바뀌므로 1씩 천천히 증가하도록 (1초 duration, 50ms stepDelay)
    const animatedTodayTasks = useCountUp(agent?.todayTasks || 0, 1000, 0, 50);
    const animatedTodayApiCalls = useCountUp(agent?.todayApiCalls || 0, 1000, 0, 50);
    const animatedAvgResponseTime = useCountUp(agent?.avgResponseTime || 0, 1000, 0, 50);
    const animatedSuccessRate = useCountUp(agent?.apiStatus === 'error' ? 0 : ((1 - (agent?.errorRate || 0)) * 100), 1000, 1, 50);

    // 모든 훅을 조건부 return 전에 호출 (React Hooks 규칙 준수)
    // Filter logs for this agent (agent가 없어도 안전하게 처리)
    const agentLogs = useMemo(() => {
        if (!agent) return [];
        return activityLogs.filter(log => log.agent === agent.name || log.agentId === agent.id);
    }, [activityLogs, agent]);

    // 시간축 표시를 위한 ticks 계산 - 항상 0시부터 23시까지 모든 시간 표시
    const xAxisTicks = useMemo(() => {
        if (chartTimeRange === 'today') {
            // 0시부터 23시까지 모든 시간을 명시적으로 지정
            return Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
        }
        return null; // 'today'가 아닌 경우는 기본 동작 사용
    }, [chartTimeRange]);

    const chartData = useMemo(() => {
        if (!agent) return [];

        if (chartTimeRange === 'today') {
            // Hourly - Today (오늘 날짜만 - 한국 시간대 기준, 24시 리셋)
            const todayKorea = getTodayInKoreaString();
            
            // hourlyStats를 맵으로 변환하여 빠른 조회 (오늘 날짜만)
            const statsMap = new Map();
            if (agent.hourlyStats && Array.isArray(agent.hourlyStats)) {
                agent.hourlyStats.forEach(stat => {
                    // 오늘 날짜가 아닌 데이터는 제외 (24시 리셋)
                    if (stat.updated_at && stat.updated_at !== todayKorea) {
                        return;
                    }
                    
                    const hour = stat.hour || stat.hour_key || stat.h;
                    if (hour !== undefined && hour !== null) {
                        const hourStr = String(hour).padStart(2, '0');
                        statsMap.set(hourStr, {
                            tasks: stat.tasks || 0,
                            apiCalls: stat.apiCalls || stat.calls || 0
                        });
                    }
                });
            }

            // 항상 0시부터 23시까지 모든 시간 포함
            const fullDayData = Array.from({ length: 24 }, (_, i) => {
                const hourStr = i.toString().padStart(2, '0');
                const stat = statsMap.get(hourStr) || { tasks: 0, apiCalls: 0 };
                return {
                    name: `${hourStr}:00`,
                    Tasks: Number(stat.tasks || 0),
                    'API Calls': Number(stat.apiCalls || 0)
                };
            });

            return fullDayData;
        } else {
            // Daily - Week/Month (Show Daily History + Today)
            if (!agent) return [];
            const history = agent.dailyHistory || [];

            // Filter out existing "Today" entry from history if it exists to avoid duplication
            // Use Korean timezone (24시 기준 = 자정 00:00)
            const todayStr = getTodayInKoreaString();
            const historyWithoutToday = history.filter(d => d.date !== todayStr);

            const todayStats = {
                date: 'Today',
                tasks: agent.todayTasks || 0,
                calls: agent.todayApiCalls || 0
            };

            const combined = [...historyWithoutToday, todayStats];

            // Should probably fill in missing days for 'Week' but history is sufficient for now
            return combined.map(d => ({
                name: d.date === 'Today' ? 'Today' : d.date.replace(/^\d{4}-/, ''), // Remove year for cleaner x-axis
                Tasks: Number(d.tasks || 0),
                'API Calls': Number(d.calls || 0)
            }));
        }
    }, [agent, chartTimeRange]);

    const apiLabels = {
        'preview-image': '2D Layout',
        'generate-3d-installation': '3D Installation',
        'calculate': 'Quote Calc',
        'pdf': 'PDF Gen'
    };

    const apiData = useMemo(() => {
        if (!agent || !agent.apiBreakdown) return [];
        return Object.entries(agent.apiBreakdown).map(([key, value]) => ({
            name: apiLabels[key] || key,
            calls: value.total,
            today: value.today
        })).sort((a, b) => b.calls - a.calls);
    }, [agent]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

    // Premium Icon Components
    const PremiumIcon = ({ type, color = 'currentColor', size = 24 }) => {
        const gradients = {
            blue: ['#3b82f6', '#2563eb'],
            emerald: ['#10b981', '#059669'],
            purple: ['#8b5cf6', '#7c3aed'],
            amber: ['#f59e0b', '#d97706'],
            rose: ['#f43f5e', '#e11d48'],
            sky: ['#0ea5e9', '#0284c7']
        };
        const grad = gradients[color] || (color.startsWith('#') ? [color, color] : gradients.blue);
        const gradId = `grad-${type}-${color}`;

        const icons = {
            tasks: (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={grad[0]} />
                            <stop offset="100%" stopColor={grad[1]} />
                        </linearGradient>
                    </defs>
                    <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15M9 5C9 6.10457 9.89543 7 11 7H13C14.1046 7 15 6.10457 15 5M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 14L11 16L15 12" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            api: (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={grad[0]} />
                            <stop offset="100%" stopColor={grad[1]} />
                        </linearGradient>
                    </defs>
                    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            success: (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={grad[0]} />
                            <stop offset="100%" stopColor={grad[1]} />
                        </linearGradient>
                    </defs>
                    <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 12L11 14L15 10" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            latency: (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={grad[0]} />
                            <stop offset="100%" stopColor={grad[1]} />
                        </linearGradient>
                    </defs>
                    <path d="M12 3V4M12 20V21M21 12H20M4 12H3M18.364 5.636L17.6569 6.34315M6.34315 17.6569L5.63604 18.364M18.364 18.364L17.6569 17.6569M6.34315 6.34315L5.63604 5.636" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
                    <path d="M12 8V12L14.5 14.5" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            pdf: (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={grad[0]} />
                            <stop offset="100%" stopColor={grad[1]} />
                        </linearGradient>
                    </defs>
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14 2V8H20" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 13H8" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 17H8" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 9H8" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            ),
            cube: (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={grad[0]} />
                            <stop offset="100%" stopColor={grad[1]} />
                        </linearGradient>
                    </defs>
                    <path d="M21 16V8C20.9996 7.64927 20.9044 7.30481 20.725 7.00385C20.5455 6.70289 20.2887 6.45684 19.982 6.292L13.982 2.792C13.6796 2.61559 13.3392 2.52344 12.99 2.52344C12.6408 2.52344 12.3004 2.61559 11.998 2.792L6.018 6.292C5.71131 6.45684 5.45451 6.70289 5.27503 7.00385C5.09554 7.30481 5.00037 7.64927 5 8V16C5.00037 16.3507 5.09554 16.6952 5.27503 16.9961C5.45451 17.2971 5.71131 17.5432 6.018 17.708L12.018 21.208C12.3204 21.3844 12.6608 21.4766 13.01 21.4766C13.3592 21.4766 13.6996 21.3844 14.002 21.208L20.002 17.708C20.3087 17.5432 20.5655 17.2971 20.745 16.9961C20.9244 16.6952 21.0196 16.3507 21 16Z" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 22V12" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 12L20 8" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 12L4 8" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )
        };
        return icons[type] || icons.tasks;
    };

    const taskPerformanceData = useMemo(() => {
        if (!agent || !agent.apiBreakdown) return [];

        let currentPeriodData = [];
        if (chartTimeRange === 'today') {
            currentPeriodData = [agent.apiBreakdown];
        } else {
            const days = chartTimeRange === 'week' ? 7 : 30;
            // Use Korean timezone (24시 기준 = 자정 00:00)
            const todayStr = getTodayInKoreaString();

            // dailyHistory에서 오늘 날짜 제거 (중복 방지)
            const historyWithoutToday = (agent.dailyHistory || [])
                .filter(d => d.date !== todayStr)
                .slice(0, days - 1)  // 오늘을 포함하므로 days - 1
                .map(d => d.breakdown || {});

            // 오늘 데이터를 맨 앞에 추가 (가장 최신)
            currentPeriodData = [agent.apiBreakdown, ...historyWithoutToday];
        }

        const sum = (types) => {
            return currentPeriodData.reduce((acc, day) => {
                const daySum = types.reduce((dacc, t) => {
                    const val = day[t];
                    // Handle both structures: {today, total} for Today tab or Number for History
                    if (val && typeof val === 'object' && 'today' in val) {
                        return dacc + (val.today || 0);
                    }
                    return dacc + (Number(val) || 0);
                }, 0);
                return acc + daySum;
            }, 0);
        };

        const quoteCount = sum(['calculate']);
        const quoteTotal = (agent.apiBreakdown['calculate']?.total || 0);

        const threeDCount = sum(['generate-3d-installation']);
        const threeDTotal = agent.apiBreakdown['generate-3d-installation']?.total || 0;

        const excelCount = sum(['excel']);
        const excelTotal = agent.apiBreakdown['excel']?.total || 0;

        return [
            {
                id: 'quote',
                name: '2D 레이아웃 이미지 생성 및 견적 산출',
                period: quoteCount,
                total: quoteTotal,
                icon: <PremiumIcon type="tasks" color="#f6a53bff" size={20} />,
                color: '#f6a53bff',
                label: chartTimeRange === 'today' ? 'Today' : chartTimeRange === 'week' ? 'Past 7 Days' : 'Past 30 Days'
            },
            {
                id: '3d',
                name: '3D 설치 이미지 생성 (API Call)',
                period: threeDCount,
                total: threeDTotal,
                icon: <PremiumIcon type="cube" color="#293ec5ff" size={20} />,
                color: '#293ec5ff',
                label: chartTimeRange === 'today' ? 'Today' : chartTimeRange === 'week' ? 'Past 7 Days' : 'Past 30 Days'
            },
            {
                id: 'excel',
                name: '견적서 생성(Excel 파일)',
                period: excelCount,
                total: excelTotal,
                icon: <PremiumIcon type="pdf" color="#1d853eff" size={20} />,
                color: '#1d853eff',
                label: chartTimeRange === 'today' ? 'Today' : chartTimeRange === 'week' ? 'Past 7 Days' : 'Past 30 Days'
            }
        ];
    }, [agent, chartTimeRange]);

    // 조건부 return은 모든 훅 호출 후에만 실행
    if (agents.length === 0) {
        // 아직 데이터가 로드되지 않음 (로딩 중)
        return (
            <div className="agent-detail-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    <Activity size={48} style={{ margin: '0 auto 16px', opacity: 0.5, animation: 'spin 1s linear infinite' }} />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Loading...</h2>
                    <p style={{ marginBottom: '24px' }}>Loading agent data...</p>
                </div>
            </div>
        );
    }

    if (!agent) {
        // 데이터는 로드되었지만 해당 agent를 찾을 수 없음
        return (
            <div className="agent-detail-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    <AlertCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Agent Not Found</h2>
                    <p style={{ marginBottom: '24px' }}>The agent you are looking for does not exist.</p>
                    <Link to="/agents" className="btn btn--primary">
                        Return to Agents
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="agent-detail-page">
            {/* Header */}
            <div className="detail-header">
                <div className="header-left">
                    <Link to="/agents" className="back-btn">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="agent-title-group">
                        <div className="agent-title-row">
                            <h1 className="agent-name">{agent.name}</h1>
                            <div className={`agent-status-badge ${agent.status} ${agent.apiStatus === 'error' ? 'agent-status-badge--error' : ''}`}>
                                {agent.apiStatus === 'error' ? 'OFFLINE' : (agent.status || 'unknown').toUpperCase()}
                            </div>
                        </div>
                        <div className="agent-meta">
                            <span>{agent.client}</span>
                            <span className="meta-dot"></span>
                            <span>ID: {agent.id}</span>
                        </div>
                    </div>
                </div>
                <div className="detail-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
                        onClick={() => setActiveTab('logs')}
                    >
                        Activity Feed
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="kpi-icon-premium" style={{ marginBottom: 0, width: '72px', height: '72px' }}>
                        <PremiumIcon type="tasks" color="blue" size={36} />
                    </div>
                    <div style={{ textAlign: 'right', paddingRight: '12px' }}>
                        <div className="kpi-label">Today Tasks</div>
                        <div className="kpi-value">{formatNumber(animatedTodayTasks)}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginTop: '8px' }}>
                            Total: {formatNumber(agent.totalTasks || Object.values(agent.apiBreakdown || {}).reduce((acc, v) => acc + (v.total || 0), 0))}
                        </div>
                    </div>
                </div>

                <div className="kpi-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="kpi-icon-premium" style={{ marginBottom: 0, width: '72px', height: '72px' }}>
                        <PremiumIcon type="api" color="rose" size={36} />
                    </div>
                    <div style={{ textAlign: 'right', paddingRight: '12px' }}>
                        <div className="kpi-label">Today API Calls</div>
                        <div className="kpi-value">{formatNumber(animatedTodayApiCalls)}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginTop: '8px' }}>
                            Total: {formatNumber(agent.totalApiCalls)}
                        </div>
                    </div>
                </div>

                <div className="kpi-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="kpi-icon-premium" style={{ marginBottom: 0, width: '72px', height: '72px' }}>
                        <PremiumIcon type="latency" color="amber" size={36} />
                    </div>
                    <div style={{ textAlign: 'right', paddingRight: '12px' }}>
                        <div className="kpi-label">Avg Latency</div>
                        <div className="kpi-value">{animatedAvgResponseTime}<span style={{ fontSize: '1rem', fontWeight: 600 }}>ms</span></div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginTop: '8px' }}>
                            Real-time stats
                        </div>
                    </div>
                </div>

                <div className="kpi-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="kpi-icon-premium" style={{ marginBottom: 0, width: '72px', height: '72px' }}>
                        <PremiumIcon type="success" color="emerald" size={36} />
                    </div>
                    <div style={{ textAlign: 'right', paddingRight: '12px' }}>
                        <div className="kpi-label">Success Rate</div>
                        <div className={`kpi-value ${agent.apiStatus === 'error' ? 'text-slate-400' : ''}`}>
                            {agent.apiStatus === 'error' ? '0.0%' : `${animatedSuccessRate.toFixed(1)}%`}
                        </div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginTop: '8px' }}>
                            {agent.apiStatus === 'error' ? 'Connection Failed' : 'System Healthy'}
                        </div>
                    </div>
                </div>
            </div>

            {activeTab === 'overview' ? (
                <div className="detail-content-grid">
                    {/* Row 1, Col 1: Chart */}
                    <div className="section-card chart-section grid-item-chart">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 className="section-title" style={{ marginBottom: 0 }}>
                                <Activity size={20} className="text-blue-500" />
                                {chartTimeRange === 'today' ? 'Hourly Activity' : 'Daily Activity'}
                            </h3>
                            <div className="detail-tabs" style={{ padding: '2px', borderRadius: '8px' }}>
                                <button
                                    className={`tab-btn ${chartTimeRange === 'today' ? 'active' : ''}`}
                                    onClick={() => setChartTimeRange('today')}
                                    style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                                >
                                    Today
                                </button>
                                <button
                                    className={`tab-btn ${chartTimeRange === 'week' ? 'active' : ''}`}
                                    onClick={() => setChartTimeRange('week')}
                                    style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                                >
                                    Week
                                </button>
                                <button
                                    className={`tab-btn ${chartTimeRange === 'month' ? 'active' : ''}`}
                                    onClick={() => setChartTimeRange('month')}
                                    style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                                >
                                    Month
                                </button>
                            </div>
                        </div>

                        <div className="chart-wrapper" style={{ flex: 1, minHeight: '250px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    key={chartTimeRange + (agent.hourlyStats?.length || 0)}
                                    data={chartData}
                                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorApi" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#64748b"
                                        fontSize={10}
                                        tickLine={false}
                                        axisLine={false}
                                        ticks={chartTimeRange === 'today' ? xAxisTicks : undefined}
                                        angle={chartTimeRange === 'today' ? -45 : 0}
                                        textAnchor="end"
                                        height={80}
                                        minTickGap={-10}
                                        allowDuplicatedCategory={true}
                                    />
                                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div style={{
                                                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                                        borderRadius: '12px',
                                                        border: '1px solid #e2e8f0',
                                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                        padding: '12px 16px'
                                                    }}>
                                                        <div style={{
                                                            fontSize: '14px',
                                                            fontWeight: '700',
                                                            color: '#1e293b',
                                                            marginBottom: '8px',
                                                            borderBottom: '1px solid #e2e8f0',
                                                            paddingBottom: '6px'
                                                        }}>
                                                            {label}
                                                        </div>
                                                        {payload.map((entry, index) => (
                                                            <div key={index} style={{
                                                                fontSize: '13px',
                                                                fontWeight: '600',
                                                                color: entry.color,
                                                                marginTop: '4px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px'
                                                            }}>
                                                                <span style={{
                                                                    display: 'inline-block',
                                                                    width: '8px',
                                                                    height: '8px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: entry.color
                                                                }}></span>
                                                                <span>{entry.name}:</span>
                                                                <span style={{ fontWeight: '700' }}>{entry.value.toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Area isAnimationActive={false} type="monotone" dataKey="Tasks" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTasks)" />
                                    <Area isAnimationActive={false} type="monotone" dataKey="API Calls" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorApi)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Row 1, Col 2: Task Performance */}
                    <div className="section-card grid-item-task-perf">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 className="section-title" style={{ marginBottom: 0 }}>
                                <Database size={20} className="text-slate-500" />
                                Task Performance
                            </h3>
                            <div className="detail-tabs" style={{ padding: '2px', borderRadius: '8px' }}>
                                <button
                                    className={`tab-btn ${chartTimeRange === 'today' ? 'active' : ''}`}
                                    onClick={() => setChartTimeRange('today')}
                                    style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                                >
                                    Today
                                </button>
                                <button
                                    className={`tab-btn ${chartTimeRange === 'week' ? 'active' : ''}`}
                                    onClick={() => setChartTimeRange('week')}
                                    style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                                >
                                    Week
                                </button>
                                <button
                                    className={`tab-btn ${chartTimeRange === 'month' ? 'active' : ''}`}
                                    onClick={() => setChartTimeRange('month')}
                                    style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                                >
                                    Month
                                </button>
                            </div>
                        </div>
                        <div className="task-performance-list" style={{ flex: 1 }}>
                            {taskPerformanceData.map(task => (
                                <TaskPerformanceItem key={task.id} task={task} />
                            ))}
                        </div>
                    </div>

                    {/* Row 2, Col 1: Recent Logs */}
                    <div className="section-card grid-item-logs">
                        <h3 className="section-title">
                            <History size={20} className="text-slate-500" />
                            Recent Logs
                        </h3>
                        <div className="recent-logs-list">
                            {agentLogs.length > 0 ? (
                                agentLogs.slice(0, 5).map((log, idx) => (
                                    <div key={log.id || idx} className="recent-log-item">
                                        <span className="log-ts">
                                            [{formatLogTimestamp(log.timestamp)}]
                                        </span>
                                        <span className={`log-type ${log.type === 'error' ? 'error' : 'success'}`}>
                                            {log.type ? log.type.toUpperCase() : 'INFO'}
                                        </span>
                                        <span className="log-msg">
                                            {log.action}
                                        </span>
                                        {log.responseTime && (
                                            <span className="log-latency">
                                                {log.responseTime}ms
                                            </span>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="empty-logs-mini">
                                    <Activity size={20} style={{ opacity: 0.5 }} />
                                    <span>No recent logs</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 2, Col 2: System Info */}
                    <div className="section-card grid-item-system">
                        <h3 className="section-title">
                            <Shield size={20} style={{ color: '#0b0419ff' }} />
                            System Info
                        </h3>
                        <div className="info-list">
                            <div className="info-item">
                                <span className="info-label">Model Engine</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Cpu size={14} style={{ color: '#0ea5e9' }} />
                                    <span className="info-value">{agent.model || 'Unknown Model'}</span>
                                </div>
                            </div>
                            <div className="info-divider" />
                            <div className="info-item">
                                <span className="info-label">API Account</span>
                                <div className="api-key-box" style={{ marginTop: '8px' }}>
                                    <span>{agent.account || agent.apiKey || 'No Account Linked'}</span>
                                    {/* copy button removed as it's not as relevant for account email */}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="log-viewer-container">
                    <div className="log-viewer-card">
                        <div className="terminal-header">
                            <div className="terminal-title">
                                <div className="pulse-dot" />
                                Live Log Stream
                            </div>
                            <div className="terminal-subtitle">
                                Connected via WebSocket
                            </div>
                        </div>
                        <div className="terminal-body custom-scrollbar">
                            {agentLogs.length > 0 ? (
                                <>
                                    {agentLogs.map((log, idx) => (
                                        <div key={log.id || idx} className="log-entry">
                                            <span className="log-ts">
                                                [{formatLogTimestamp(log.timestamp)}]
                                            </span>
                                            <span className={`log-type ${log.type === 'error' ? 'error' : 'success'}`}>
                                                {log.type ? log.type.toUpperCase() : 'INFO'}
                                            </span>
                                            <span className="log-msg">
                                                {log.action}
                                            </span>
                                            {log.responseTime && (
                                                <span className="log-latency">
                                                    {log.responseTime}ms
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <div className="empty-logs">
                                    <Activity size={32} style={{ opacity: 0.5 }} />
                                    <p>No logs recorded yet...</p>
                                    <p style={{ fontSize: '0.8rem' }}>Waiting for incoming activities</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
            }
        </div >
    );
}
