-- Supabase Realtime 활성화
-- Supabase SQL Editor에서 실행하세요

-- activity_logs 테이블에 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;

-- 다른 테이블들도 확인
ALTER PUBLICATION supabase_realtime ADD TABLE agents;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE hourly_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE api_breakdown;

-- 확인: 활성화된 테이블 목록 보기
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
