import { useOutletContext } from 'react-router-dom';
import { useAgents } from '../../context/AgentContext';
import { ClientCard } from './components/ClientCard';

export function ClientListPage() {
    const { clients, getAgentsByClient } = useAgents();
    const context = useOutletContext();
    const searchTerm = context?.searchTerm || '';
    const statusFilter = context?.statusFilter || 'all';

    const filteredClients = clients.filter(client => {
        const matchesPlan = statusFilter === 'all' || client.plan === statusFilter;
        
        // Safe search: handle undefined/null values
        const safeSearchTerm = (searchTerm || '').toLowerCase();
        const clientName = (client.name || '').toLowerCase();
        
        const matchesSearch = safeSearchTerm === '' || clientName.includes(safeSearchTerm);
        
        return matchesPlan && matchesSearch;
    });

    return (
        <div className="page animate-slideUp">


            <div className="grid grid--agents">
                {filteredClients.map(client => {
                    const clientAgents = getAgentsByClient(client.id);
                    const activeAgents = clientAgents.filter(a => a.status === 'online' || a.status === 'processing').length;

                    return (
                        <ClientCard
                            key={client.id}
                            client={client}
                            clientAgents={clientAgents}
                            activeAgents={activeAgents}
                        />
                    );
                })}
            </div>
        </div>
    );
}

export default ClientListPage;
