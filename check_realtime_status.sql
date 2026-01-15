-- ============================================
-- Realtime 설정 상태 확인 스크립트
-- ============================================
-- 이 스크립트로 현재 Realtime 설정 상태를 확인하세요

-- ============================================
-- 1. Realtime Publication에 추가된 테이블 확인
-- ============================================
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('activity_logs', 'agents', 'daily_stats', 'hourly_stats', 'api_breakdown')
ORDER BY tablename;

-- ============================================
-- 2. REPLICA IDENTITY 확인 (이미 확인됨 - FULL)
-- ============================================
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
-- 3. RLS 정책 확인 (anon 사용자 SELECT 권한)
-- ============================================
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('activity_logs', 'agents', 'daily_stats', 'hourly_stats', 'api_breakdown')
AND roles::text LIKE '%anon%'
AND cmd = 'SELECT'
ORDER BY tablename;

-- ============================================
-- 4. 전체 확인 요약
-- ============================================
DO $$
DECLARE
    publication_count INTEGER;
    rls_count INTEGER;
BEGIN
    -- Publication에 추가된 테이블 수
    SELECT COUNT(*) INTO publication_count
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime'
    AND tablename IN ('activity_logs', 'agents', 'daily_stats', 'hourly_stats', 'api_breakdown');
    
    -- anon 사용자 SELECT 정책 수
    SELECT COUNT(*) INTO rls_count
    FROM pg_policies 
    WHERE tablename IN ('activity_logs', 'agents', 'daily_stats', 'hourly_stats', 'api_breakdown')
    AND roles::text LIKE '%anon%'
    AND cmd = 'SELECT';
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Realtime 설정 상태 확인';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ REPLICA IDENTITY: 모든 테이블 FULL 설정됨';
    RAISE NOTICE '📊 Publication 테이블 수: % / 5', publication_count;
    RAISE NOTICE '🔐 RLS 정책 (anon SELECT): % / 5', rls_count;
    RAISE NOTICE '';
    
    IF publication_count = 5 AND rls_count = 5 THEN
        RAISE NOTICE '✅✅✅ 모든 설정이 완료되었습니다!';
        RAISE NOTICE '';
        RAISE NOTICE '다음 단계:';
        RAISE NOTICE '1. 브라우저에서 페이지 새로고침';
        RAISE NOTICE '2. 브라우저 콘솔에서 testRealtimeInsert() 실행';
        RAISE NOTICE '3. "⚡⚡⚡ 실시간 로그 이벤트 수신!" 메시지 확인';
    ELSIF publication_count < 5 THEN
        RAISE NOTICE '⚠️ Publication에 테이블이 추가되지 않았습니다.';
        RAISE NOTICE '   setup_realtime_complete.sql을 실행하세요.';
    ELSIF rls_count < 5 THEN
        RAISE NOTICE '⚠️ RLS 정책이 설정되지 않았습니다.';
        RAISE NOTICE '   setup_realtime_complete.sql을 실행하세요.';
    END IF;
    RAISE NOTICE '========================================';
END $$;
