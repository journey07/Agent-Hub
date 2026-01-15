-- ============================================
-- 즉시 Today 통계 리셋 (수동 실행)
-- 브라우저가 변경사항을 보려면 이 SQL을 실행하세요
-- ============================================

-- 1. agents 테이블에 last_reset_date 필드 추가 (없는 경우)
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE;

-- 2. 기존 데이터의 last_reset_date를 오늘 날짜로 설정
UPDATE agents 
SET last_reset_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE
WHERE last_reset_date IS NULL;

-- 3. 모든 에이전트의 today 통계를 0으로 리셋
UPDATE agents 
SET 
    today_api_calls = 0,
    today_tasks = 0,
    last_reset_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE;

-- 4. 모든 api_breakdown의 today_count를 0으로 리셋
UPDATE api_breakdown
SET today_count = 0;

-- 5. 확인
SELECT 
    id,
    name,
    today_api_calls,
    today_tasks,
    total_api_calls,
    total_tasks,
    last_reset_date,
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE as today_korea
FROM agents
ORDER BY id;
