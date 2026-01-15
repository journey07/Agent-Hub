-- Realtime 이벤트를 받기 위한 RLS 정책 수정
-- anon 사용자도 activity_logs를 SELECT할 수 있도록 허용
-- (Realtime 이벤트는 SELECT 권한이 필요함)

-- 기존 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'activity_logs';

-- anon 사용자도 SELECT 가능하도록 정책 추가
CREATE POLICY "Allow anon read access on activity_logs"
    ON activity_logs FOR SELECT
    TO anon
    USING (true);

-- 확인: 정책이 추가되었는지 확인
SELECT * FROM pg_policies WHERE tablename = 'activity_logs';

-- 참고: 이 정책은 보안상 모든 사용자가 activity_logs를 읽을 수 있게 합니다.
-- 프로덕션 환경에서는 더 엄격한 정책을 사용하는 것이 좋습니다.
-- 예: 특정 조건만 허용하거나, authenticated 사용자만 허용
