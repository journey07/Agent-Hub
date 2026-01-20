import { useState, useMemo, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bot, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useAgents } from '../../context/AgentContext';
import { AgentCard } from './components/AgentCard';
import { SortableAgentCard } from './components/SortableAgentCard';

export function AgentListPage() {
    const { agents, clients, toggleAgent, checkAgentHealth } = useAgents();
    const context = useOutletContext();
    const searchTerm = context?.searchTerm || '';
    const statusFilter = context?.statusFilter || 'all';

    // Manual order state persisted in localStorage
    const [manualOrder, setManualOrder] = useState(() => {
        const saved = localStorage.getItem('agent_manual_order');
        return saved ? JSON.parse(saved) : [];
    });

    const [checkingId, setCheckingId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Avoid accidental drags
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Update manual order if agents list changes (e.g. new agents added)
    useEffect(() => {
        if (agents && agents.length > 0) {
            const agentIds = agents.map(a => a.id);
            setManualOrder(prev => {
                const newOrder = [...prev];
                let changed = false;

                // Add any new agent IDs
                agentIds.forEach(id => {
                    if (!newOrder.includes(id)) {
                        newOrder.push(id);
                        changed = true;
                    }
                });

                // Remove any deleted agent IDs
                const filteredOrder = newOrder.filter(id => agentIds.includes(id));
                if (filteredOrder.length !== newOrder.length) changed = true;

                if (changed) {
                    localStorage.setItem('agent_manual_order', JSON.stringify(filteredOrder));
                    return filteredOrder;
                }
                return prev;
            });
        }
    }, [agents]);

    const handleHealthCheck = async (agentId) => {
        setCheckingId(agentId);
        const result = await checkAgentHealth(agentId);
        setCheckingId(null);
        return result;
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setManualOrder((items) => {
                const oldIndex = items.indexOf(active.id);
                const newIndex = items.indexOf(over.id);
                const updatedOrder = arrayMove(items, oldIndex, newIndex);
                localStorage.setItem('agent_manual_order', JSON.stringify(updatedOrder));
                return updatedOrder;
            });
        }
    };

    // Filtering and manual order logic
    const filteredAndSortedAgents = useMemo(() => {
        // First filter agents
        let result = agents.filter(agent => {
            const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;

            const safeSearchTerm = (searchTerm || '').toLowerCase();
            const agentName = (agent.name || '').toLowerCase();
            const clientName = (agent.client || agent.client_name || '').toLowerCase();

            const matchesSearch = safeSearchTerm === '' ||
                agentName.includes(safeSearchTerm) ||
                clientName.includes(safeSearchTerm);

            return matchesStatus && matchesSearch;
        });

        // Always sort by manualOrder
        result.sort((a, b) => {
            const aIndex = manualOrder.indexOf(a.id);
            const bIndex = manualOrder.indexOf(b.id);
            // If id not in manualOrder, push to end
            const aPos = aIndex === -1 ? 999 : aIndex;
            const bPos = bIndex === -1 ? 999 : bIndex;
            return aPos - bPos;
        });

        return result;
    }, [agents, searchTerm, statusFilter, manualOrder]);

    return (
        <div className={`page animate-slideUp ${filteredAndSortedAgents.length === 0 ? 'page--centered' : ''}`}>

            {filteredAndSortedAgents.length > 0 ? (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={filteredAndSortedAgents.map(a => a.id)}
                        strategy={rectSortingStrategy}
                    >
                        <div className="grid grid--agents">
                            {filteredAndSortedAgents.map(agent => (
                                <SortableAgentCard
                                    key={agent.id}
                                    agent={agent}
                                    client={clients.find(c => c.id === agent.clientId)}
                                    onToggle={toggleAgent}
                                    onHealthCheck={handleHealthCheck}
                                    isChecking={checkingId === agent.id}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            ) : (
                <div className="empty-state">
                    <Bot className="empty-state__icon" />
                    <h3 className="empty-state__title">에이전트가 없습니다</h3>
                    <p className="empty-state__description">
                        조건에 맞는 에이전트가 없습니다. 검색어나 필터를 변경해보세요.
                    </p>
                </div>
            )}
        </div>
    );
}

export default AgentListPage;
