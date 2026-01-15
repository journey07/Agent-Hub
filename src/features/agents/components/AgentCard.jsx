import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, ShieldCheck, Power, CheckCircle2 } from 'lucide-react';
import { Toggle } from '../../../components/common';
import { formatNumber, formatRelativeTime } from '../../../utils/formatters';
import { useCountUp } from '../../../utils/useCountUp';

export function AgentCard({ agent, client, onToggle, onHealthCheck, isChecking }) {
    const [resultMessage, setResultMessage] = useState(null);
    const [isError, setIsError] = useState(false);
    
    // 숫자 카운트업 애니메이션
    const animatedTodayTasks = useCountUp(agent.todayTasks || 0, 800);
    const animatedTodayApiCalls = useCountUp(agent.todayApiCalls || 0, 800);
    
    const handleCheck = async () => {
        if (!agent.isLiveAgent || isChecking) return;
        
        setResultMessage(null);
        setIsError(false);
        
        try {
            const result = await onHealthCheck(agent.id);
            if (result) {
                if (result.success) {
                    setResultMessage('연결 확인');
                    setIsError(false);
                } else {
                    setResultMessage(result.message || '연결 실패');
                    setIsError(true);
                }
                setTimeout(() => {
                    setResultMessage(null);
                    setIsError(false);
                }, 3000);
            }
        } catch (error) {
            setResultMessage('체크 실패');
            setIsError(true);
            setTimeout(() => {
                setResultMessage(null);
                setIsError(false);
            }, 3000);
        }
    };

    const getGradientClass = () => {
        if (agent.clientId === 'client-worldlocker') return 'agent-card--worldlocker';
        if (agent.clientId === 'client-mansu') return 'agent-card--mansu';
        return '';
    };

    return (
        <div className={`agent-card agent-card--premium ${agent.status === 'processing' ? 'agent-card--active' : ''} ${getGradientClass()}`}>
            {/* Header Section */}
            <div className="agent-card__header">
                <div className="agent-card__info-group">
                    {client?.image && (
                        <div className="agent-card__logo-wrapper">
                            <img
                                src={client.image}
                                alt={agent.client}
                                className="agent-card__logo-img"
                            />
                        </div>
                    )}
                    <div className="agent-card__text-content">
                        <h3 className="agent-card__name">{agent.name}</h3>
                        <p className="agent-card__client">{agent.description || '2D & 3D 이미지 및 견적서 생성 에이전트'}</p>
                    </div>
                </div>
                <div className="agent-card__power-control">
                    <Power size={14} className="agent-card__power-icon" />
                    <Toggle
                        checked={agent.status === 'online' || agent.status === 'processing'}
                        onChange={() => onToggle(agent.id)}
                        disabled={agent.status === 'error'}
                    />
                </div>
            </div>

            {/* Stats Section */}
            <div className="agent-card__stats">
                <div className="agent-card__stat">
                    <div className="agent-card__stat-value">{formatNumber(animatedTodayTasks)}</div>
                    <div className="agent-card__stat-label">오늘 작업</div>
                </div>
                <div className="agent-card__stat">
                    <div className="agent-card__stat-value">{formatNumber(animatedTodayApiCalls)}</div>
                    <div className="agent-card__stat-label">오늘 API 호출</div>
                </div>
                <div className="agent-card__stat">
                    <div className="agent-card__stat-value text-nowrap">
                        {formatRelativeTime(agent.lastActive)}
                    </div>
                    <div className="agent-card__stat-label">최근 호출</div>
                </div>
            </div>

            {/* Footer Section */}
            <div className="agent-card__footer">
                <div className="agent-card__status-group">
                    {(agent.status === 'online' || agent.status === 'offline') ? (
                        <button
                            className={`status-btn ${resultMessage && !isError ? 'status-btn--success' : isError ? 'status-btn--error' : 'status-btn--check'} ${isChecking ? 'status-btn--checking' : ''} ${agent.apiStatus === 'error' ? 'status-btn--error' : ''}`}
                            onClick={handleCheck}
                            disabled={isChecking || !agent.isLiveAgent}
                            title={agent.isLiveAgent ? "Click to check connection" : "Status check unavailable"}
                        >
                            <div className={`status-btn__icon ${isChecking ? 'animate-spin' : ''}`}>
                                {isChecking ? <ShieldCheck size={16} /> : (resultMessage && !isError ? <CheckCircle2 size={16} /> : <ShieldCheck size={16} />)}
                            </div>
                            <span className="status-btn__text">
                                {isChecking ? 'CHECKING...' :
                                    (resultMessage || (agent.apiStatus === 'error' ? 'CONNECTION ERROR' : '상태 체크'))}
                            </span>
                        </button>
                    ) : (
                        <div className={`status-btn ${agent.status}`}>
                            <div className="status-btn__dot"></div>
                            <span className="status-btn__text">{agent.status.toUpperCase()}</span>
                        </div>
                    )}
                </div>

                <Link
                    to={`/agents/${agent.id}`}
                    className="btn btn--ghost btn--sm whitespace-nowrap gap-1"
                >
                    <span className="agent-card__action-text">상세보기</span>
                    <ExternalLink size={14} />
                </Link>
            </div>
        </div>
    );
}
