import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ChevronDown, Power, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCompactNumber } from '../../../utils/formatters';
import { StatusBadge, Toggle } from '../../../components/common';
import { useAgents } from '../../../context/AgentContext';

export function ClientCard({ client, clientAgents, activeAgents }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const { toggleAgent } = useAgents();

    // Calculate aggregated stats
    const totalTodayCalls = clientAgents.reduce((sum, agent) => sum + (agent.todayApiCalls || 0), 0);
    const totalAllCalls = clientAgents.reduce((sum, agent) => sum + (agent.totalApiCalls || 0), 0);
    const onlineAgents = clientAgents.filter(agent => agent.status === 'online' || agent.status === 'processing').length;

    // Fake Health Score Calculation (for demo)
    const errorRate = clientAgents.reduce((sum, agent) => sum + (agent.errorRate || 0), 0) / (clientAgents.length || 1);
    const healthScore = Math.max(0, Math.min(100, 100 - (errorRate * 1000))); // Simple subtraction logic

    const getHealthColor = (score) => {
        if (score >= 90) return '#10B981'; // Emerald 500
        if (score >= 70) return '#F59E0B'; // Amber 500
        return '#EF4444'; // Red 500
    };

    return (
        <div
            className="client-card"
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            {/* Header: Logo, Name, Health, Plan */}
            <div className="client-card__header">
                <div className="client-card__logo-group">
                    <div className="client-card__logo">
                        {client.image ? (
                            <img src={client.image} alt={client.name} />
                        ) : (
                            <span>{client.name[0]}</span>
                        )}
                    </div>
                    <div className="client-card__info">
                        <h3>{client.name}</h3>
                        <div style={{ width: '140px' }}>
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                <span>Health Score</span>
                                <span style={{ color: getHealthColor(healthScore), fontWeight: 700 }}>{Math.round(healthScore)}</span>
                            </div>
                            <div className="client-card__health-bar">
                                <div
                                    className="client-card__health-fill"
                                    style={{
                                        width: `${healthScore}%`,
                                        backgroundColor: getHealthColor(healthScore)
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <span className={`client-card__plan-badge client-card__plan-badge--${client.plan || 'Starter'}`}>
                    {client.plan || 'Starter'}
                </span>
            </div>

            {/* Business Metrics Grid */}
            <div className="client-card__metrics">
                <div className="client-card__metric">
                    <span className="client-card__metric-label">Active Agents</span>
                    <div className="client-card__metric-value flex items-center gap-2">
                        {onlineAgents} <span className="text-slate-400 text-sm font-normal">/ {clientAgents.length}</span>
                    </div>
                </div>
                <div className="client-card__metric">
                    <span className="client-card__metric-label">Calls Today</span>
                    <div className="client-card__metric-value text-emerald-600">
                        {formatCompactNumber(totalTodayCalls)}
                    </div>
                </div>
            </div>

            {/* Expandable Agent List Button */}
            <div className="mt-auto">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="client-card__agents-list-btn"
                >
                    <span>View Agents ({clientAgents.length})</span>
                    <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                </button>

                {/* Agent List Drawer */}
                {isExpanded && (
                    <div className="client-card__agents-list animate-fadeIn">
                        {clientAgents.map(agent => (
                            <div
                                key={agent.id}
                                className="client-card__agent-item"
                            >
                                <div className="client-card__agent-info">
                                    <span className={`client-card__agent-status-dot ${agent.status === 'online' || agent.status === 'processing' ? 'online' : 'offline'}`}></span>
                                    <span className="client-card__agent-name">{agent.name}</span>
                                </div>
                                <Toggle
                                    checked={agent.status === 'online' || agent.status === 'processing'}
                                    onChange={() => toggleAgent(agent.id)}
                                    scale={0.75}
                                />
                            </div>
                        ))}
                        <Link
                            to={`/clients/${client.id}`}
                            className="client-card__details-link"
                        >
                            Full Details <ExternalLink size={12} />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
