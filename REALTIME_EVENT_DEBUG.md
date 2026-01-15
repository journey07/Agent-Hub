# Realtime 이벤트 수신 문제 진단

## 🚨 문제: Realtime은 연결되었지만 이벤트가 오지 않음

**증상:**
- ✅ "✅✅✅ WebSocket Connected" 메시지 있음
- ✅ "SUBSCRIBED" 상태
- ❌ "⚡⚡⚡ 실시간 로그 이벤트 수신!" 메시지 없음
- ❌ 새로고침 없이는 변화 없음

## 🔍 원인 진단

### 1. Supabase Realtime 활성화 확인

Supabase Dashboard → SQL Editor에서 실행:

```sql
-- Realtime이 활성화된 테이블 확인
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

**확인 사항:**
- `activity_logs` 테이블이 목록에 있어야 함
- 없으면 아래 SQL 실행:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
```

### 2. 실제 INSERT 확인

Supabase Dashboard → Table Editor → `activity_logs` 테이블에서:
- 새로운 로그가 실제로 INSERT되는지 확인
- INSERT 시간과 현재 시간 비교

### 3. Realtime 이벤트 테스트

브라우저 콘솔에서 수동으로 테스트:

```javascript
// Supabase 클라이언트 가져오기
const { supabase } = await import('./lib/supabase.js');

// 테스트 로그 INSERT
const { data, error } = await supabase
  .from('activity_logs')
  .insert({
    agent_id: 'agent-worldlocker-001',
    action: '테스트 로그',
    type: 'test',
    status: 'info',
    timestamp: new Date().toISOString(),
    response_time: 0
  });

console.log('INSERT 결과:', data, error);
```

**예상 결과:**
- INSERT 성공 후 "⚡⚡⚡ 실시간 로그 이벤트 수신!" 메시지가 나타나야 함
- 나타나지 않으면 Realtime 이벤트가 트리거되지 않는 것

### 4. WebSocket 메시지 확인

브라우저 개발자 도구 → Network 탭:
1. WebSocket 연결 찾기 (`wss://...supabase.co/realtime/...`)
2. 메시지 탭에서 실시간 메시지 확인
3. `postgres_changes` 이벤트가 오는지 확인

### 5. 구독 필터 확인

현재 코드:
```javascript
.on('postgres_changes', {
  event: 'INSERT',
  schema: 'public',
  table: 'activity_logs',
  filter: '*' // 모든 INSERT 이벤트
})
```

**테스트: 모든 이벤트 구독**
```javascript
.on('postgres_changes', {
  event: '*', // 모든 이벤트
  schema: 'public',
  table: 'activity_logs'
})
```

## 🔧 해결 방법

### 방법 1: Realtime 재활성화

Supabase SQL Editor에서:
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

### 방법 2: 주기적 업데이트 활성화 (임시 해결책)

현재 코드가 수정되어 Realtime이 연결되어 있어도 5초마다 업데이트합니다.
이것은 임시 해결책이며, Realtime을 고치는 것이 더 좋습니다.

### 방법 3: Realtime 구독 재설정

브라우저를 완전히 새로고침 (Ctrl+Shift+R 또는 Cmd+Shift+R):
- 캐시를 지우고 Realtime 구독을 다시 설정

### 방법 4: 다른 채널로 테스트

```javascript
// 별도 채널로 테스트
const testChannel = supabase
  .channel('test-activity-logs')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'activity_logs'
  }, (payload) => {
    console.log('테스트 채널 이벤트:', payload);
  })
  .subscribe();
```

## 📊 체크리스트

- [ ] Supabase에서 `activity_logs` 테이블에 Realtime 활성화 확인
- [ ] 실제로 로그가 INSERT되는지 확인 (Table Editor)
- [ ] 브라우저 콘솔에서 "⚡⚡⚡ 실시간 로그 이벤트 수신!" 메시지 확인
- [ ] Network 탭에서 WebSocket 메시지 확인
- [ ] 수동 INSERT 테스트로 이벤트 발생 확인
- [ ] Realtime 재활성화 시도

## 🆘 여전히 문제가 있다면

1. Supabase Dashboard → Realtime 섹션 확인
2. Supabase 상태 페이지 확인 (https://status.supabase.com)
3. 브라우저 콘솔의 모든 에러 메시지 복사
4. Network 탭의 WebSocket 연결 상태 스크린샷
