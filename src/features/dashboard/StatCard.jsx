import { formatCompactNumber } from '../../utils/formatters';

export function StatCard({ label, value, iconColor = 'primary', className = '' }) {
    // Map iconColor to actual color values for the square indicator
    const getSquareColor = () => {
        switch (iconColor) {
            case 'info':
                return '#3b82f6'; // blue-500
            case 'success':
                return '#16a34a'; // green-600
            case 'warning':
                return '#d97706'; // amber-600
            case 'orange':
                return '#ea580c'; // orange-600
            case 'danger':
                return '#dc2626'; // red-600
            case 'primary':
            default:
                return '#8B5CF6'; // purple (matching image design)
        }
    };

    return (
        <div className={`stat-card-new ${className}`}>
            {/* Label with purple square indicator */}
            <div className="stat-card-new__header">
                <div 
                    className="stat-card-new__indicator" 
                    style={{ backgroundColor: getSquareColor() }}
                />
                <span className="stat-card-new__label">{label}</span>
            </div>

            {/* Large numerical value */}
            <div className="stat-card-new__value">
                {typeof value === 'number' ? formatCompactNumber(value) : value}
            </div>
        </div>
    );
}

export default StatCard;
