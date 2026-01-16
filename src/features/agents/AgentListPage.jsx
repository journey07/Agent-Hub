import { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Bot } from 'lucide-react';
import { useAgents } from '../../context/AgentContext';
import { AgentCard } from './components/AgentCard';

export function AgentListPage() {
    const { agents, clients, toggleAgent, checkAgentHealth } = useAgents();
    const context = useOutletContext();
    const searchTerm = context?.searchTerm || '';
    const statusFilter = context?.statusFilter || 'all';
    const [checkingId, setCheckingId] = useState(null);

    const handleHealthCheck = async (agentId) => {
        setCheckingId(agentId);
        const result = await checkAgentHealth(agentId);
        setCheckingId(null);
        return result;
    };

    const filteredAgents = agents.filter(agent => {
        const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
        
        // Safe search: handle undefined/null values
        const safeSearchTerm = (searchTerm || '').toLowerCase();
        const agentName = (agent.name || '').toLowerCase();
        const clientName = (agent.client || agent.client_name || '').toLowerCase();
        
        const matchesSearch = safeSearchTerm === '' || 
            agentName.includes(safeSearchTerm) || 
            clientName.includes(safeSearchTerm);
        
        return matchesStatus && matchesSearch;
    });

    return (
        <div className={`page animate-slideUp ${filteredAgents.length === 0 ? 'page--centered' : ''}`}>
            {filteredAgents.length > 0 ? (
                <div className="grid grid--agents">
                    {filteredAgents.map(agent => (
                        <AgentCard
                            key={agent.id}
                            agent={agent}
                            client={clients.find(c => c.id === agent.clientId)}
                            onToggle={toggleAgent}
                            onHealthCheck={handleHealthCheck}
                            isChecking={checkingId === agent.id}
                        />
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <Bot className="empty-state__icon" />
                    <h3 className="empty-state__title">에이전트가 없습니다</h3>
                    <p className="empty-state__description">
                        검색 조건에 맞는 에이전트가 없습니다. 필터를 변경해보세요.
                    </p>
                </div>
            )}
        </div>
    );
}

export default AgentListPage;
