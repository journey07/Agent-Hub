import { useState, useEffect, useRef } from 'react';
import './AnimatedNumber.css';

/**
 * 숫자가 위로 스크롤되면서 바뀌는 애니메이션 컴포넌트
 * 각 자릿수별로 개별 애니메이션 적용
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

    // 포맷팅된 값 (항상 문자열로 변환)
    const formattedDisplay = formatter ? String(formatter(displayValue)) : String(displayValue);
    const formattedTarget = formatter ? String(formatter(value || 0)) : String(value || 0);
    
    // 각 자릿수별로 분리 (오른쪽 정렬)
    const displayChars = formattedDisplay.split('');
    const targetChars = formattedTarget.split('');
    
    // 최대 길이로 맞춤 (오른쪽 정렬 - 앞에 공백 추가)
    const maxLength = Math.max(displayChars.length, targetChars.length);
    while (displayChars.length < maxLength) displayChars.unshift(' ');
    while (targetChars.length < maxLength) targetChars.unshift(' ');
    
    // 숫자 차이 계산 (애니메이션 방향 결정)
    const diff = (value || 0) - (previousValueRef.current || 0);
    const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : '';

    return (
        <span 
            ref={containerRef}
            className={`animated-number ${className}`}
        >
            {targetChars.map((targetChar, index) => {
                const displayChar = displayChars[index] || ' ';
                // 공백이 아니고, 실제로 다른 문자인 경우만 애니메이션
                const isChanging = isAnimating && 
                    displayChar !== ' ' && 
                    targetChar !== ' ' && 
                    displayChar !== targetChar;
                
                return (
                    <span 
                        key={`${index}-${targetChar}-${isAnimating}`}
                        className="animated-number__container"
                    >
                        {isChanging ? (
                            <>
                                <span 
                                    className={`animated-number__digit animated-number__digit--${direction}`}
                                >
                                    {displayChar}
                                </span>
                                <span 
                                    className={`animated-number__digit animated-number__digit--next animated-number__digit--next-${direction}`}
                                >
                                    {targetChar}
                                </span>
                            </>
                        ) : (
                            <span className="animated-number__digit">
                                {targetChar}
                            </span>
                        )}
                    </span>
                );
            })}
        </span>
    );
}

export default AnimatedNumber;
