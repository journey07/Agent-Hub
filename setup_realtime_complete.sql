-- ============================================
-- Supabase Realtime 완전 설정 스크립트
-- ============================================
-- 이 스크립트는 Supabase SQL Editor에서 실행하세요
-- 모든 Realtime 관련 설정을 한 번에 완료합니다

-- ============================================
-- 1. Realtime Publication에 테이블 추가
-- ============================================
-- 기존 테이블 제거 (에러 무시 - 테이블이 없을 수 있음)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE activity_logs;
EXCEPTION WHEN OTHERS THEN
    -- 테이블이 없으면 무시
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE agents;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE daily_stats;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE hourly_stats;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE api_breakdown;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 테이블 추가 (중복 추가 시도 시 에러 무시)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
EXCEPTION WHEN duplicate_object THEN
    -- 이미 추가되어 있으면 무시
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
-- 2. REPLICA IDENTITY 설정 (DELETE 이벤트를 위해 필요)
-- ============================================
ALTER TABLE activity_logs REPLICA IDENTITY FULL;
ALTER TABLE agents REPLICA IDENTITY FULL;
ALTER TABLE daily_stats REPLICA IDENTITY FULL;
ALTER TABLE hourly_stats REPLICA IDENTITY FULL;
ALTER TABLE api_breakdown REPLICA IDENTITY FULL;

-- ============================================
-- 3. RLS 정책 확인 및 수정
-- ============================================
-- activity_logs에 대한 모든 사용자 SELECT 권한 (Realtime 이벤트 수신을 위해)
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

-- agents 테이블
DROP POLICY IF EXISTS "Allow anon read access on agents" ON agents;
CREATE POLICY "Allow anon read access on agents"
    ON agents FOR SELECT
    TO anon
    USING (true);

-- daily_stats 테이블
DROP POLICY IF EXISTS "Allow anon read access on daily_stats" ON daily_stats;
CREATE POLICY "Allow anon read access on daily_stats"
    ON daily_stats FOR SELECT
    TO anon
    USING (true);

-- hourly_stats 테이블
DROP POLICY IF EXISTS "Allow anon read access on hourly_stats" ON hourly_stats;
CREATE POLICY "Allow anon read access on hourly_stats"
    ON hourly_stats FOR SELECT
    TO anon
    USING (true);

-- api_breakdown 테이블
DROP POLICY IF EXISTS "Allow anon read access on api_breakdown" ON api_breakdown;
CREATE POLICY "Allow anon read access on api_breakdown"
    ON api_breakdown FOR SELECT
    TO anon
    USING (true);

-- ============================================
-- 4. 확인 쿼리
-- ============================================
-- Realtime publication에 추가된 테이블 확인
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- RLS 정책 확인
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('activity_logs', 'agents', 'daily_stats', 'hourly_stats', 'api_breakdown')
ORDER BY tablename, policyname;

-- REPLICA IDENTITY 확인
SELECT 
    n.nspname AS schemaname,
    c.relname AS tablename,
    CASE c.relreplident
        WHEN 'd' THEN 'DEFAULT'
        WHEN 'n' THEN 'NOTHING'
        WHEN 'f' THEN 'FULL'
        WHEN 'i' THEN 'INDEX'
    END AS replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relname IN ('activity_logs', 'agents', 'daily_stats', 'hourly_stats', 'api_breakdown')
ORDER BY c.relname;

-- ============================================
-- 5. 테스트 INSERT (선택사항)
-- ============================================
-- 이 쿼리는 실행하지 않아도 됩니다 (테스트용)
/*
INSERT INTO activity_logs (agent_id, action, type, status, timestamp, response_time)
VALUES (
    'agent-worldlocker-001',
    '✅ Realtime 설정 완료 테스트',
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
    RAISE NOTICE '✅ Realtime 설정이 완료되었습니다!';
    RAISE NOTICE '';
    RAISE NOTICE '다음 단계:';
    RAISE NOTICE '1. Supabase Dashboard → Database → Replication에서 테이블이 활성화되었는지 확인';
    RAISE NOTICE '2. Supabase Dashboard → Settings → API에서 스키마가 노출되어 있는지 확인';
    RAISE NOTICE '3. 브라우저에서 페이지를 새로고침하고 Realtime 연결 확인';
    RAISE NOTICE '4. 브라우저 콘솔에서 testRealtimeInsert() 실행하여 테스트';
END $$;
