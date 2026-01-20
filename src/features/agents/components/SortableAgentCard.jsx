import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AgentCard } from './AgentCard';
import { GripVertical } from 'lucide-react';

export function SortableAgentCard(props) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: props.agent.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 100 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="sortable-card-wrapper">
            <AgentCard
                {...props}
                dragHandleProps={{ ...attributes, ...listeners }}
            />
        </div>
    );
}
