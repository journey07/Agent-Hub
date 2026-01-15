-- ============================================
-- Realtime 즉시 수정 스크립트
-- ============================================
-- 이 스크립트를 Supabase SQL Editor에서 실행하세요
-- 모든 가능한 문제를 한 번에 해결합니다

-- ============================================
-- 1. 기존 구독 제거 후 다시 추가 (강제 재설정)
-- ============================================
DO $$
BEGIN
    -- 기존 테이블 제거 시도
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE activity_logs;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE agents;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE daily_stats;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE hourly_stats;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime DROP TABLE api_breakdown;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END $$;

-- 테이블 추가
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE agents;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE daily_stats;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE hourly_stats;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE api_breakdown;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- ============================================
-- 2. REPLICA IDENTITY 강제 설정
-- ============================================
ALTER TABLE activity_logs REPLICA IDENTITY FULL;
ALTER TABLE agents REPLICA IDENTITY FULL;
ALTER TABLE daily_stats REPLICA IDENTITY FULL;
ALTER TABLE hourly_stats REPLICA IDENTITY FULL;
ALTER TABLE api_breakdown REPLICA IDENTITY FULL;

-- ============================================
-- 3. RLS 정책 강제 재설정 (모든 사용자 허용)
-- ============================================
-- activity_logs
DROP POLICY IF EXISTS "Allow anon read access on activity_logs" ON activity_logs;
CREATE POLICY "Allow anon read access on activity_logs"
    ON activity_logs FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated read access on activity_logs" ON activity_logs;
CREATE POLICY "Allow authenticated read access on activity_logs"
    ON activity_logs FOR SELECT
    TO authenticated
    USING (true);

-- agents
DROP POLICY IF EXISTS "Allow anon read access on agents" ON agents;
CREATE POLICY "Allow anon read access on agents"
    ON agents FOR SELECT
    TO anon
    USING (true);

-- daily_stats
DROP POLICY IF EXISTS "Allow anon read access on daily_stats" ON daily_stats;
CREATE POLICY "Allow anon read access on daily_stats"
    ON daily_stats FOR SELECT
    TO anon
    USING (true);

-- hourly_stats
DROP POLICY IF EXISTS "Allow anon read access on hourly_stats" ON hourly_stats;
CREATE POLICY "Allow anon read access on hourly_stats"
    ON hourly_stats FOR SELECT
    TO anon
    USING (true);

-- api_breakdown
DROP POLICY IF EXISTS "Allow anon read access on api_breakdown" ON api_breakdown;
CREATE POLICY "Allow anon read access on api_breakdown"
    ON api_breakdown FOR SELECT
    TO anon
    USING (true);

-- ============================================
-- 4. 최종 확인
-- ============================================
SELECT 
    '✅ Publication 설정 완료' AS status,
    COUNT(*) AS table_count
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('activity_logs', 'agents', 'daily_stats', 'hourly_stats', 'api_breakdown');

-- ============================================
-- 5. 테스트 INSERT (선택사항 - 주석 해제하여 실행)
-- ============================================
/*
INSERT INTO activity_logs (agent_id, action, type, status, timestamp, response_time)
VALUES (
    'agent-worldlocker-001',
    '✅ Realtime 설정 완료 - 이제 이벤트가 와야 합니다',
    'test',
    'info',
    NOW(),
    0
)
RETURNING *;
*/

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ Realtime 설정 완료!';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ 중요: Supabase Dashboard에서 확인하세요:';
    RAISE NOTICE '   1. Realtime → Settings → "Enable Realtime service" ON';
    RAISE NOTICE '   2. Database → Replication → 테이블 목록 확인';
    RAISE NOTICE '';
    RAISE NOTICE '다음 단계:';
    RAISE NOTICE '   1. 브라우저에서 페이지 새로고침';
    RAISE NOTICE '   2. 브라우저 콘솔에서 diagnoseRealtime() 실행';
    RAISE NOTICE '   3. 결과에 따라 추가 조치';
    RAISE NOTICE '========================================';
END $$;
