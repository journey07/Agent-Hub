-- ============================================
-- Today 통계 리셋 기능 진단 및 테스트
-- ============================================

-- 1. agents 테이블에 last_reset_date 필드가 있는지 확인
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns
WHERE table_name = 'agents' 
  AND column_name = 'last_reset_date';

-- 2. 현재 agents 테이블의 상태 확인
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

-- 3. update_agent_stats 함수 정의 확인
SELECT pg_get_functiondef('update_agent_stats'::regproc);

-- 4. 함수가 날짜 변경을 감지하는지 테스트
-- 현재 날짜와 last_reset_date 비교
SELECT 
    id,
    name,
    last_reset_date,
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE as today_korea,
    CASE 
        WHEN last_reset_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE 
        THEN '리셋 필요' 
        ELSE '리셋 불필요' 
    END as reset_status
FROM agents;

-- 5. 수동으로 리셋 테스트 (함수 호출 전)
SELECT 
    '리셋 전' as status,
    id,
    today_api_calls,
    today_tasks,
    last_reset_date
FROM agents
WHERE id = 'agent-worldlocker-001';

-- 6. update_agent_stats 함수 호출 (테스트)
-- 이 함수가 호출되면 자동으로 날짜 체크 후 리셋됨
SELECT update_agent_stats(
    'agent-worldlocker-001',
    'test_reset',
    100,
    false,
    true,
    true
);

-- 7. 리셋 후 상태 확인
SELECT 
    '리셋 후' as status,
    id,
    today_api_calls,
    today_tasks,
    last_reset_date,
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE as today_korea
FROM agents
WHERE id = 'agent-worldlocker-001';

-- 8. 모든 에이전트의 리셋 상태 확인
SELECT 
    id,
    name,
    today_api_calls,
    today_tasks,
    last_reset_date,
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE as today_korea,
    CASE 
        WHEN last_reset_date IS NULL THEN '⚠️ last_reset_date가 NULL입니다!'
        WHEN last_reset_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE 
        THEN '⚠️ 리셋이 필요합니다! (날짜가 바뀜)'
        ELSE '✅ 정상 (오늘 날짜)'
    END as status
FROM agents;

-- 9. api_breakdown의 today_count 확인
SELECT 
    agent_id,
    api_type,
    today_count,
    total_count
FROM api_breakdown
ORDER BY agent_id, api_type;

-- 10. 수동 리셋 (모든 에이전트)
-- 주의: 이 쿼리는 모든 today 통계를 즉시 0으로 만듭니다
-- UPDATE agents 
-- SET 
--     today_api_calls = 0,
--     today_tasks = 0,
--     last_reset_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE;
-- 
-- UPDATE api_breakdown
-- SET today_count = 0;
