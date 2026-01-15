import { useState, useEffect, useRef } from 'react';

/**
 * 숫자 카운트업 애니메이션 훅
 * @param {number} targetValue - 목표 숫자 값
 * @param {number} duration - 애니메이션 지속 시간 (ms, 기본값: 1000)
 * @param {number} decimals - 소수점 자릿수 (기본값: 0)
 * @returns {number} 현재 애니메이션 중인 숫자 값
 */
export function useCountUp(targetValue, duration = 1000, decimals = 0) {
    const [displayValue, setDisplayValue] = useState(targetValue || 0);
    const animationFrameRef = useRef(null);
    const startTimeRef = useRef(null);
    const startValueRef = useRef(targetValue || 0);
    const previousValueRef = useRef(targetValue || 0);

    useEffect(() => {
        // 값이 변경되지 않았으면 애니메이션하지 않음
        if (targetValue === previousValueRef.current) {
            return;
        }

        // 값이 null, undefined, NaN이면 0으로 처리
        const target = targetValue == null || isNaN(targetValue) ? 0 : Number(targetValue);
        const startValue = previousValueRef.current || 0;

        // 시작 값과 목표 값이 같으면 즉시 설정
        if (startValue === target) {
            setDisplayValue(target);
            previousValueRef.current = target;
            return;
        }

        // 애니메이션 시작
        startValueRef.current = startValue;
        startTimeRef.current = performance.now();

        const animate = (currentTime) => {
            if (!startTimeRef.current) {
                startTimeRef.current = currentTime;
            }

            const elapsed = currentTime - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);

            // 현재 값 계산
            const currentValue = startValue + (target - startValue) * easeOut;

            // 소수점 처리
            const roundedValue = decimals > 0 
                ? Number(currentValue.toFixed(decimals))
                : Math.round(currentValue);

            setDisplayValue(roundedValue);

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                // 애니메이션 완료 시 정확한 목표 값으로 설정
                setDisplayValue(target);
                previousValueRef.current = target;
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        // Cleanup
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [targetValue, duration, decimals]);

    // 컴포넌트 언마운트 시 정리
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return displayValue;
}
