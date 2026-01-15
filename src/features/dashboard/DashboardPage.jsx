import { useAgents } from '../../context/AgentContext';
import { ApiUsageChart } from '../../components/charts';
import { StatusBadge } from '../../components/common';
import { StatCard } from './StatCard';
import { apiUsageData, hourlyData } from '../../data/mockData';
import { formatRelativeTime, formatNumber } from '../../utils/formatters';
import {
    BotIcon,
    UsersIconClean,
    ZapIconClean,
    ActivityIconClean,
    AlertCircleIconClean,
    CheckCircleIconClean,
    ClockIconClean
} from '../../components/common/CustomIcons';

export function DashboardPage() {
    const { agents, stats, activityLogs } = useAgents();

    const errorAgentsList = agents.filter(a => a.status === 'error' || a.apiStatus === 'error');

    return (
        <div className="page animate-slideUp">
            {/* Stats Grid */}
            <div className="grid grid--4 mb-xl gap-xl">
                <StatCard
                    icon={BotIcon}
                    label="Active Agents"
                    value={`${stats.activeAgents} / ${stats.totalAgents}`}
                    iconColor="primary"
                    className="card--glow"
                />
                <StatCard
                    icon={ZapIconClean}
                    label="API Calls Today"
                    value={stats.todayApiCalls}
                    change={8}
                    changeType="positive"
                    iconColor="info"
                    className="card--glow"
                />
                <StatCard
                    icon={ClockIconClean}
                    label="Avg Response"
                    value={`${stats.avgResponseTime || 0}ms`}
                    changeType="positive"
                    iconColor="success"
                    className="card--glow"
                />
                <StatCard
                    icon={AlertCircleIconClean}
                    label="Issues Detected"
                    value={stats.errorAgents}
                    iconColor={stats.errorAgents > 0 ? "error" : "success"}
                    className={`card--glow ${stats.errorAgents > 0 ? "border-red-100 bg-red-50/10" : ""}`}
                    tooltip={
                        stats.errorAgents > 0 ? (
                            <ul className="list-disc pl-4 space-y-1">
                                {errorAgentsList.map(agent => (
                                    <li key={agent.id}>
                                        <span className="font-semibold">{agent.name}:</span>
                                        <span className="opacity-80 ml-1">Error detected</span>
                                    </li>
                                ))}
                            </ul>
                        ) : "All systems normal"
                    }
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid--2 mb-xl gap-xl">
                <section className="card">
                    <div className="card__header mb-lg">
                        <h3 className="card__title">Weekly API Usage</h3>
                        {/* Period selector could go here */}
                    </div>
                    <ApiUsageChart data={apiUsageData} type="area" />
                </section>

                <section className="card">
                    <div className="card__header mb-lg">
                        <h3 className="card__title">Hourly Traffic</h3>
                    </div>
                    <ApiUsageChart data={hourlyData} type="bar" />
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
                            >
                                <div className="stat-card__icon stat-card__icon--clean">
                                    {log.type === 'success' && <CheckCircleIconClean size={20} />}
                                    {log.type === 'error' && <AlertCircleIconClean size={20} />}
                                    {log.type === 'warning' && <AlertCircleIconClean size={20} color="#F59E0B" />}
                                    {log.type === 'processing' && <ClockIconClean size={20} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-slate-900">{log.agent}</div>
                                    <div className="text-xs text-slate-500">{log.action}</div>
                                </div>
                                <div className="text-xs text-slate-400 font-medium ml-auto text-right whitespace-nowrap">
                                    {formatRelativeTime(log.timestamp)}
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
                    <div className="flex flex-col gap-md">
                        {agents.slice(0, 6).map((agent) => (
                            <div
                                key={agent.id}
                                className="flex items-center justify-between p-sm rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-md flex-1 min-w-0">
                                    <div className="stat-card__icon stat-card__icon--clean flex-shrink-0">
                                        <BotIcon size={22} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-slate-900 truncate">{agent.name}</div>
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
