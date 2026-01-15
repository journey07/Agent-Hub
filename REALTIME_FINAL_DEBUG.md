# Realtime 이벤트 수신 문제 최종 진단

## 현재 상황

✅ **정상 작동하는 것:**
- 로그인 성공 (`steve@dashboard.local`)
- Realtime 구독 성공 (`SUBSCRIBED`)
- WebSocket 연결 성공
- INSERT 성공 (DB에 저장됨)

❌ **문제:**
- Realtime 이벤트가 오지 않음
- `📡 [DEBUG] Postgres 변경 감지 (모든 이벤트):` 메시지 없음
- `⚡⚡⚡ 실시간 로그 이벤트 수신!` 메시지 없음

## 문제 원인 분석

### 가능한 원인 1: Supabase Realtime 설정 문제

**확인 방법:**
1. Supabase Dashboard → Database → Replication
2. `activity_logs` 테이블이 Realtime에 활성화되어 있는지 확인
3. 또는 SQL Editor에서 실행:
   ```sql
   SELECT * FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime' 
   AND tablename = 'activity_logs';
   ```

**해결 방법:**
- 결과가 없으면 `enable_realtime.sql` 실행

### 가능한 원인 2: RLS 정책 문제

**확인 방법:**
- 현재 로그인된 사용자(`steve@dashboard.local`)가 `activity_logs`를 SELECT할 수 있는지 확인

**해결 방법:**
- `fix_realtime_rls.sql` 실행하여 anon 사용자도 SELECT 가능하도록 설정
- 또는 authenticated 사용자 정책이 제대로 작동하는지 확인

### 가능한 원인 3: Realtime 서버 문제

**확인 방법:**
1. 브라우저 개발자 도구 → Network 탭
2. WebSocket 연결 찾기 (`wss://...supabase.co/realtime/...`)
3. Messages 탭에서 실시간 메시지 확인
4. INSERT 후 `postgres_changes` 이벤트가 오는지 확인

**해결 방법:**
- WebSocket 메시지가 없다면 Supabase Realtime 서버 문제
- Supabase 상태 페이지 확인: https://status.supabase.com

### 가능한 원인 4: 이벤트 필터링

**확인 방법:**
- 현재 코드에서 모든 이벤트를 구독하도록 설정되어 있음
- `event: '*'` 사용 중

**해결 방법:**
- 이미 모든 이벤트를 구독하도록 설정되어 있음

## 즉시 확인할 사항

### 1. Network 탭에서 WebSocket 확인

브라우저 개발자 도구 → Network 탭:
1. WebSocket 연결 찾기
2. Messages 탭 클릭
3. `testRealtimeInsert()` 실행
4. INSERT 후 WebSocket 메시지가 오는지 확인

**예상 결과:**
- `postgres_changes` 이벤트가 나타나야 함
- 나타나지 않으면 → Supabase Realtime 서버에서 이벤트를 보내지 않음

### 2. Supabase Dashboard에서 직접 INSERT 테스트

Supabase Dashboard → Table Editor → `activity_logs`:
1. 수동으로 행 추가
2. 브라우저 콘솔에서 이벤트가 오는지 확인

**예상 결과:**
- 이벤트가 오면 → 코드는 정상, 백엔드 INSERT 문제
- 이벤트가 오지 않으면 → Supabase Realtime 설정 문제

### 3. Supabase Realtime 설정 확인

Supabase Dashboard → Database → Replication:
- `activity_logs` 테이블이 목록에 있는지 확인
- 없으면 `enable_realtime.sql` 실행

## 최종 해결 방법

### 방법 1: Supabase Realtime 재활성화

```sql
-- 기존 구독 제거
ALTER PUBLICATION supabase_realtime DROP TABLE activity_logs;

-- 다시 추가
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;

-- 확인
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'activity_logs';
```

### 방법 2: RLS 정책 수정

`fix_realtime_rls.sql` 실행:
```sql
CREATE POLICY "Allow anon read access on activity_logs"
    ON activity_logs FOR SELECT
    TO anon
    USING (true);
```

### 방법 3: Supabase 지원팀 문의

위 방법들이 모두 실패하면:
- Supabase Dashboard → Support
- Realtime 이벤트가 트리거되지 않는 문제 보고

## 다음 단계

1. Network 탭에서 WebSocket 메시지 확인
2. Supabase Dashboard에서 직접 INSERT 테스트
3. Supabase Realtime 설정 확인
4. 위 결과를 바탕으로 문제 해결
