-- Realtime 이벤트 테스트를 위한 SQL
-- Supabase SQL Editor에서 실행하세요

-- 1. RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'activity_logs';

-- 2. Realtime publication 확인
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'activity_logs';

-- 3. 테스트 INSERT (브라우저에서 이벤트가 오는지 확인)
INSERT INTO activity_logs (agent_id, action, type, status, timestamp, response_time)
VALUES (
    'agent-worldlocker-001',
    '🧪 SQL에서 직접 INSERT 테스트',
    'test',
    'info',
    NOW(),
    0
)
RETURNING *;

-- 4. RLS 정책 확인 및 수정 (Realtime 이벤트를 위해 중요!)
-- 기존 정책 확인
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'activity_logs';

-- 5. RLS 정책을 더 관대하게 만들기 (테스트용)
-- 주의: 프로덕션에서는 더 엄격한 정책 사용 권장

-- authenticated 사용자 정책 (이미 있을 수 있음)
DROP POLICY IF EXISTS "Allow authenticated read access on activity_logs" ON activity_logs;
CREATE POLICY "Allow authenticated read access on activity_logs"
    ON activity_logs FOR SELECT
    TO authenticated
    USING (true);

-- anon 사용자도 허용 (테스트용 - Realtime 이벤트 수신을 위해)
DROP POLICY IF EXISTS "Allow anon read access on activity_logs" ON activity_logs;
CREATE POLICY "Allow anon read access on activity_logs"
    ON activity_logs FOR SELECT
    TO anon
    USING (true);

-- service_role도 명시적으로 허용 (혹시 모를 경우를 위해)
DROP POLICY IF EXISTS "Allow service role read access on activity_logs" ON activity_logs;
CREATE POLICY "Allow service role read access on activity_logs"
    ON activity_logs FOR SELECT
    TO service_role
    USING (true);

-- 6. REPLICA IDENTITY 확인 (DELETE 이벤트를 위해 필요할 수 있음)
ALTER TABLE activity_logs REPLICA IDENTITY FULL;
