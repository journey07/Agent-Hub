import { useNavigate } from 'react-router-dom';
import { useAgents } from '../../context/AgentContext';
import { ApiUsageChart } from '../../components/charts';
import { StatusBadge, TimeAgo } from '../../components/common';
import { StatCard } from './StatCard';
import {
    BotIcon,
    AlertCircleIconClean,
    CheckCircleIconClean,
    ClockIconClean,
    InfoIconClean,
    HeartIconClean,
    LockIconClean
} from '../../components/common/CustomIcons';

// action 텍스트를 기반으로 아이콘 결정
function getActivityIcon(log) {
    // type 기반 매칭을 먼저 체크 (heartbeat는 항상 하트 아이콘)
    if (log.type === 'heartbeat') {
        return <HeartIconClean size={20} color="#EF4444" />;
    }
    if (log.type === 'success') {
        return <CheckCircleIconClean size={20} />;
    }
    if (log.type === 'error') {
        return <AlertCircleIconClean size={20} />;
    }
    if (log.type === 'warning') {
        return <AlertCircleIconClean size={20} color="#F59E0B" />;
    }
    if (log.type === 'processing') {
        return <ClockIconClean size={20} />;
    }
    if (log.type === 'log') {
        return <InfoIconClean size={20} />;
    }
    if (log.type === 'login') {
        return <LockIconClean size={20} color="#F59E0B" />;
    }

    // action 텍스트 기반 매칭 (type이 없거나 매칭되지 않은 경우)
    const action = (log.action || '').toLowerCase();

    // complete, generated, calculated가 포함되면 success
    if (action.includes('completed') || action.includes('generated') || action.includes('calculated')) {
        return <CheckCircleIconClean size={20} />;
    }

    // calling으로 시작하면 processing
    if (action.startsWith('calling') || action.includes('calling')) {
        return <ClockIconClean size={20} />;
    }

    // 기본값: info
    return <InfoIconClean size={20} />;
}

export function DashboardPage() {
    const navigate = useNavigate();
    const { agents, stats, activityLogs, weeklyApiUsage, hourlyTraffic, clients } = useAgents();


    return (
        <div className="page animate-slideUp">
            {/* Stats Grid */}
            <div className="grid grid--4 mb-xl gap-xl">
                <StatCard
                    label="Active Agents"
                    value={`${stats.activeAgents} / ${stats.totalAgents}`}
                    iconColor="primary"
                />
                <StatCard
                    label="Today Tasks"
                    value={stats.todayTasks || 0}
                    iconColor="info"
                />
                <StatCard
                    label="Today API Calls"
                    value={stats.todayApiCalls}
                    iconColor="danger"
                />
                <StatCard
                    label="Avg Response"
                    value={`${stats.avgResponseTime || 0}ms`}
                    iconColor="orange"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid--2 mb-xl gap-xl">
                <section className="card">
                    <div className="card__header mb-lg">
                        <h3 className="card__title">Weekly Agent Usage</h3>
                        {/* Period selector could go here */}
                    </div>
                    <ApiUsageChart data={weeklyApiUsage} type="area" />
                </section>

                <section className="card">
                    <div className="card__header mb-lg">
                        <h3 className="card__title">Hourly Traffic</h3>
                    </div>
                    <ApiUsageChart data={hourlyTraffic} type="bar" />
                </section>
            </div>

            {/* Recent Activity & Agent Status */}
            <div className="grid grid--2 gap-xl">
                {/* Activity Log */}
                <section className="card">
                    <div className="card__header mb-lg">
                        <h3 className="card__title">Recent Activity</h3>
                    </div>
                    <div className="flex flex-col gap-md">
                        {activityLogs.slice(0, 6).map((log) => (
                            <div
                                key={log.id}
                                className="flex items-center gap-md p-sm rounded-lg hover:bg-slate-50 transition-colors"
                                style={{ animation: 'fadeIn 0.4s ease-in' }}
                            >
                                <div className="stat-card__icon stat-card__icon--clean">
                                    {getActivityIcon(log)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-slate-900">
                                        {log.clientName && (
                                            <span style={{ color: '#0f172a', fontWeight: 'bold', marginRight: '4px' }}>
                                                {log.clientName}
                                            </span>
                                        )}
                                        {log.clientName && (
                                            <span style={{ color: '#94a3b8', fontWeight: 'normal', marginRight: '4px' }}>
                                                ·
                                            </span>
                                        )}
                                        <span style={{ color: '#475569', fontWeight: '500' }} className="activity-list-item__agent transition-colors">
                                            {log.agent}
                                        </span>
                                        {log.userName && (
                                            <span style={{ color: '#94a3b8', fontWeight: 'normal', marginLeft: '6px' }}>
                                                - {log.userName}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {log.action}
                                    </div>
                                </div>
                                <div className="text-xs text-slate-400 font-medium ml-auto text-right whitespace-nowrap">
                                    <TimeAgo date={log.timestamp} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Agent Status Overview */}
                <section className="card">
                    <div className="card__header mb-lg">
                        <h3 className="card__title">Agent Health Status</h3>
                    </div>
                    <div className="flex flex-col gap-xs">
                        {agents.slice(0, 6).map((agent) => (
                            <div
                                key={agent.id}
                                className="agent-list-item flex items-center justify-between p-sm rounded-lg transition-all cursor-pointer"
                                onClick={() => navigate(`/agents/${agent.id}`)}
                            >
                                <div className="flex items-center gap-md flex-1 min-w-0">
                                    <div
                                        className="stat-card__icon stat-card__icon--clean flex-shrink-0 overflow-hidden flex items-center justify-center bg-slate-50 transition-transform duration-300 agent-list-item__icon-wrapper"
                                        style={{ marginTop: '4px' }}
                                    >
                                        {clients.find(c => c.id === agent.clientId)?.image ? (
                                            <img
                                                src={clients.find(c => c.id === agent.clientId).image}
                                                alt={agent.client}
                                                className="w-full h-full object-contain p-0.5"
                                            />
                                        ) : (
                                            <BotIcon size={20} />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-slate-900 truncate agent-list-item__name transition-colors">{agent.name}</div>
                                        <div className="text-xs text-slate-500 truncate">{agent.client}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-lg">
                                    <div className="text-right hidden sm:block">
                                        <div className="text-xs text-slate-500">Response</div>
                                        <div className="text-sm font-medium text-slate-700">{agent.avgResponseTime}ms</div>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <div className="text-xs text-slate-500">Error Rate</div>
                                        <div className={`text-sm font-medium ${agent.errorRate > 0.05 ? 'text-red-500' : 'text-slate-700'}`}>
                                            {((agent.errorRate || 0) * 100).toFixed(1)}%
                                        </div>
                                    </div>
                                    <StatusBadge status={agent.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

export default DashboardPage;
