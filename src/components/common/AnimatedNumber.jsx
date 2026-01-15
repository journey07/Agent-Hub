import { useState, useEffect, useRef } from 'react';
import './AnimatedNumber.css';

/**
 * 숫자가 위로 스크롤되면서 바뀌는 애니메이션 컴포넌트
 * @param {number} value - 표시할 숫자 값
 * @param {string} className - 추가 CSS 클래스
 * @param {function} formatter - 숫자 포맷팅 함수 (선택)
 */
export function AnimatedNumber({ value, className = '', formatter = null }) {
    const [displayValue, setDisplayValue] = useState(value || 0);
    const [isAnimating, setIsAnimating] = useState(false);
    const previousValueRef = useRef(value || 0);
    const containerRef = useRef(null);

    useEffect(() => {
        const target = value == null || isNaN(value) ? 0 : Number(value);
        const previous = previousValueRef.current || 0;

        // 값이 변경되지 않았으면 애니메이션하지 않음
        if (target === previous) {
            return;
        }

        // 애니메이션 시작
        setIsAnimating(true);
        
        // 애니메이션 완료 후 값 업데이트
        const timer = setTimeout(() => {
            setDisplayValue(target);
            previousValueRef.current = target;
            setIsAnimating(false);
        }, 400); // CSS transition duration과 맞춤

        return () => clearTimeout(timer);
    }, [value]);

    // 포맷팅된 값
    const formattedDisplay = formatter ? formatter(displayValue) : String(displayValue);
    const formattedTarget = formatter ? formatter(value || 0) : String(value || 0);
    
    // 숫자 차이 계산 (애니메이션 방향 결정)
    const diff = (value || 0) - (previousValueRef.current || 0);
    const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : '';

    return (
        <span 
            ref={containerRef}
            className={`animated-number ${className}`}
        >
            <span className="animated-number__container">
                <span 
                    key={displayValue}
                    className={`animated-number__digit ${isAnimating ? `animated-number__digit--${direction}` : ''}`}
                >
                    {isAnimating ? formattedDisplay : formattedTarget}
                </span>
                {isAnimating && (
                    <span 
                        className={`animated-number__digit animated-number__digit--next animated-number__digit--next-${direction}`}
                    >
                        {formattedTarget}
                    </span>
                )}
            </span>
        </span>
    );
}

export default AnimatedNumber;
