import { useOutletContext } from 'react-router-dom';
import { useAgents } from '../../context/AgentContext';
import { ClientCard } from './components/ClientCard';

export function ClientListPage() {
    const { clients, getAgentsByClient } = useAgents();
    const { searchTerm, statusFilter } = useOutletContext();

    const filteredClients = clients.filter(client => {
        const matchesPlan = statusFilter === 'all' || client.plan === statusFilter;
        const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase());
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
