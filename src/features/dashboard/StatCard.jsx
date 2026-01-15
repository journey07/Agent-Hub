import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCompactNumber } from '../../utils/formatters';

export function StatCard({ icon: Icon, label, value, change, changeType = 'positive', iconColor = 'primary', className = '', tooltip }) {
    const isPositive = changeType === 'positive';

    return (
        <div className={`stat-card ${className}`}>
            <div className="flex justify-between items-start mb-md">
                <div className="stat-card__icon stat-card__icon--clean">
                    <Icon size={24} />
                </div>
                {change !== undefined && (
                    <div className={`stat-card__change stat-card__change--${changeType}`}>
                        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span>{change}%</span>
                    </div>
                )}
            </div>
            <div>
                <div className="stat-card__value">
                    {typeof value === 'number' ? formatCompactNumber(value) : value}
                </div>
                <div className="stat-card__label">{label}</div>
            </div>

            {tooltip && (
                <div className="stat-card__tooltip">
                    <div className="stat-card__tooltip-content">
                        {tooltip}
                    </div>
                </div>
            )}
        </div>
    );
}

export default StatCard;
