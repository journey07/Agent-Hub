import { useState, useEffect, useRef } from 'react';

/**
 * 숫자 카운트업 애니메이션 훅
 * @param {number} targetValue - 목표 숫자 값
 * @param {number} duration - 애니메이션 지속 시간 (ms, 기본값: 1000)
 * @param {number} decimals - 소수점 자릿수 (기본값: 0)
 * @param {number} stepDelay - 각 숫자 증가마다의 딜레이 (ms, 기본값: 50)
 * @returns {number} 현재 애니메이션 중인 숫자 값
 */
export function useCountUp(targetValue, duration = 1000, decimals = 0, stepDelay = 50) {
    const [displayValue, setDisplayValue] = useState(targetValue || 0);
    const intervalRef = useRef(null);
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

        // 기존 인터벌 정리
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // 숫자 차이 계산
        const diff = target - startValue;
        const absDiff = Math.abs(diff);
        
        // 숫자가 1씩 증가하도록 단계 계산
        const totalSteps = Math.max(1, absDiff);
        
        // 전체 duration을 고정하고, stepDelay를 계산
        // 숫자가 많이 바뀔수록 stepDelay를 줄여서 더 빠르게 (하지만 최소값 보장)
        // 목표: 전체 duration 내에 완료되도록 stepDelay 계산
        // 예: duration=1000ms, diff=100이면 stepDelay=10ms (100 * 10ms = 1000ms)
        // 예: duration=1000ms, diff=10이면 stepDelay=100ms (10 * 100ms = 1000ms)
        // 예: duration=1000ms, diff=500이면 stepDelay=2ms → 최소값 10ms 적용, 총 5초 (너무 길면 최대 단계 제한)
        
        // 큰 숫자 차이를 처리하기 위해 최대 단계 수 제한
        const maxSteps = 200; // 최대 200단계까지만 애니메이션
        const effectiveSteps = Math.min(totalSteps, maxSteps);
        const minStepDelay = 5; // 너무 빠르면 보이지 않으니 최소 5ms
        const idealStepDelay = duration / effectiveSteps;
        const calculatedStepDelay = Math.max(minStepDelay, idealStepDelay);
        
        // 실제 사용할 단계 수 (너무 많으면 건너뛰기)
        const actualSteps = totalSteps > maxSteps ? maxSteps : totalSteps;
        const stepSize = totalSteps > maxSteps ? Math.ceil(totalSteps / maxSteps) : 1;
        
        // 증가 방향 결정
        const step = diff > 0 ? 1 : -1;
        
        let currentStep = 0;
        let currentValue = startValue;

        // 숫자가 1씩 증가하는 애니메이션
        intervalRef.current = setInterval(() => {
            currentStep++;
            
            if (decimals > 0) {
                // 소수점이 있는 경우 부드럽게 증가
                const progress = Math.min(currentStep / actualSteps, 1);
                currentValue = startValue + diff * progress;
                setDisplayValue(Number(currentValue.toFixed(decimals)));
            } else {
                // 정수인 경우 stepSize씩 증가 (큰 차이는 건너뛰기)
                currentValue = startValue + (step * currentStep * stepSize);
                
                // 목표 값에 도달했는지 확인
                if ((step > 0 && currentValue >= target) || (step < 0 && currentValue <= target)) {
                    currentValue = target;
                    setDisplayValue(currentValue);
                    previousValueRef.current = target;
                    clearInterval(intervalRef.current);
                    return;
                }
                
                setDisplayValue(currentValue);
            }
            
            // 목표 값에 도달했는지 확인
            if (currentStep >= actualSteps) {
                setDisplayValue(target);
                previousValueRef.current = target;
                clearInterval(intervalRef.current);
            }
        }, calculatedStepDelay);

        // Cleanup
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [targetValue, duration, decimals, stepDelay]);

    // 컴포넌트 언마운트 시 정리
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    return displayValue;
}
