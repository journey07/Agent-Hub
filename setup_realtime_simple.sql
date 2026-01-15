-- ============================================
-- Supabase Realtime 간단 설정 스크립트
-- ============================================
-- 이 스크립트는 Supabase SQL Editor에서 실행하세요
-- 기존 테이블이 없어도 안전하게 실행됩니다

-- ============================================
-- 1. Realtime Publication에 테이블 추가
-- ============================================
-- 테이블 추가 (이미 있으면 에러가 나지만 무시하고 계속 진행)
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE agents;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE hourly_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE api_breakdown;

-- ============================================
-- 2. REPLICA IDENTITY 설정 (DELETE 이벤트를 위해 필요)
-- ============================================
ALTER TABLE activity_logs REPLICA IDENTITY FULL;
ALTER TABLE agents REPLICA IDENTITY FULL;
ALTER TABLE daily_stats REPLICA IDENTITY FULL;
ALTER TABLE hourly_stats REPLICA IDENTITY FULL;
ALTER TABLE api_breakdown REPLICA IDENTITY FULL;

-- ============================================
-- 3. RLS 정책 추가 (Realtime 이벤트 수신을 위해)
-- ============================================
-- activity_logs
DROP POLICY IF EXISTS "Allow anon read access on activity_logs" ON activity_logs;
CREATE POLICY "Allow anon read access on activity_logs"
    ON activity_logs FOR SELECT
    TO anon
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
-- 4. 확인 쿼리
-- ============================================
-- Realtime publication에 추가된 테이블 확인
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('activity_logs', 'agents', 'daily_stats', 'hourly_stats', 'api_breakdown')
ORDER BY tablename;
