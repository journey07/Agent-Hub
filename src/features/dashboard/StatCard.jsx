import { formatCompactNumber } from '../../utils/formatters';
import { useCountUp } from '../../utils/useCountUp';

export function StatCard({ label, value, iconColor = 'primary', className = '' }) {
    // 숫자 값 추출 및 애니메이션 처리
    const parseValue = () => {
        if (typeof value === 'number') {
            return { type: 'number', num: value, suffix: '' };
        }
        if (typeof value === 'string') {
            // "123 / 456" 형식 처리
            if (value.includes(' / ')) {
                const parts = value.split(' / ');
                const firstNum = parseInt(parts[0].replace(/,/g, ''), 10);
                return { type: 'ratio', first: firstNum, second: parts[1] };
            }
            // "123ms" 형식 처리
            if (value.includes('ms')) {
                const num = parseInt(value.replace('ms', '').replace(/,/g, ''), 10);
                return { type: 'suffix', num: num, suffix: 'ms' };
            }
        }
        return { type: 'string', value: value };
    };

    const parsed = parseValue();
    
    // 애니메이션 값 계산 (1씩 천천히 증가)
    let animatedValue = null;
    let animatedFirst = null;
    
    if (parsed.type === 'number' || parsed.type === 'suffix') {
        animatedValue = useCountUp(parsed.num, 1000, 0, 50);
    } else if (parsed.type === 'ratio') {
        animatedFirst = useCountUp(parsed.first, 1000, 0, 50);
    }

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

    // 값 포맷팅 (원래 형식 유지)
    const formatValue = () => {
        if (parsed.type === 'number') {
            return formatCompactNumber(animatedValue);
        }
        if (parsed.type === 'suffix') {
            return `${animatedValue}${parsed.suffix}`;
        }
        if (parsed.type === 'ratio') {
            return `${formatCompactNumber(animatedFirst)} / ${parsed.second}`;
        }
        return parsed.value;
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
                {formatValue()}
            </div>
        </div>
    );
}

export default StatCard;
