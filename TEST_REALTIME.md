# Realtime 작동 확인 가이드

## ⚠️ 중요: Realtime Inspector가 비어있는 것은 정상입니다!

Supabase Dashboard의 **Realtime Inspector**는 주로 다음을 보여줍니다:
- **Broadcast 메시지** (채널에 직접 보낸 메시지)
- **Presence 이벤트** (사용자 온라인 상태)

우리가 사용하는 **`postgres_changes` 이벤트**는 Inspector에서 직접 보이지 않습니다!

---

## ✅ Realtime이 실제로 작동하는지 확인하는 방법

### 방법 1: 브라우저 콘솔에서 테스트 (가장 확실한 방법)

1. **대시보드 페이지 열기** (로그인 상태)
2. **브라우저 개발자 도구 열기** (F12)
3. **Console 탭**에서 다음 실행:

```javascript
// 테스트 함수 실행
testRealtimeInsert()
```

4. **예상 결과:**
   - 콘솔에 "✅ INSERT 성공" 메시지
   - 몇 초 후 "⚡⚡⚡ 실시간 로그 이벤트 수신!" 메시지
   - 대시보드의 Activity Logs에 새 로그가 즉시 나타남

### 방법 2: Network 탭에서 WebSocket 확인

1. **브라우저 개발자 도구 → Network 탭**
2. **WS (WebSocket) 필터** 선택
3. **`wss://...supabase.co/realtime/...`** 연결 찾기
4. **Messages 탭** 클릭
5. **`testRealtimeInsert()` 실행**
6. **예상 결과:**
   - WebSocket 메시지에 `postgres_changes` 이벤트가 나타남
   - Payload에 `activity_logs` 테이블 변경 정보 포함

### 방법 3: Supabase Dashboard에서 직접 INSERT

1. **Supabase Dashboard → Table Editor → `activity_logs`**
2. **새 행 추가:**
   ```sql
   agent_id: agent-worldlocker-001
   action: 🧪 Dashboard에서 직접 INSERT 테스트
   type: test
   status: info
   timestamp: (현재 시간)
   response_time: 0
   ```
3. **Save 클릭**
4. **대시보드 확인:**
   - Activity Logs에 새 로그가 즉시 나타나야 함
   - 콘솔에 "⚡⚡⚡ 실시간 로그 이벤트 수신!" 메시지

### 방법 4: 실제 에이전트에서 이벤트 발생

1. **에이전트가 실제로 작업 수행** (예: 견적 생성)
2. **대시보드에서 즉시 업데이트 확인:**
   - Activity Logs에 새 로그 추가
   - 에이전트 통계 업데이트
   - 차트 데이터 업데이트

---

## 🔍 Realtime 연결 상태 확인

브라우저 콘솔에서 다음을 확인:

```javascript
// 인증 상태 확인
checkAuthStatus()

// Realtime 구독 상태 확인 (AgentContext에서)
// 콘솔에 "✅✅✅ WebSocket Connected" 메시지가 있어야 함
```

**정상적인 경우:**
- 콘솔에 "✅✅✅✅✅ WebSocket Connected - 실시간 업데이트 활성화!" 메시지
- "📡 Subscribed to: agents, activity_logs, daily_stats, hourly_stats, api_breakdown" 메시지

---

## ❌ 문제 해결

### Realtime 이벤트가 오지 않는 경우

1. **인증 확인:**
   ```javascript
   checkAuthStatus() // 로그인되어 있어야 함
   ```

2. **Realtime Publication 확인:**
   ```sql
   SELECT * FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime'
   AND tablename = 'activity_logs';
   ```
   - 결과가 있어야 함

3. **RLS 정책 확인:**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'activity_logs'
   AND roles::text LIKE '%anon%';
   ```
   - 정책이 있어야 함

4. **WebSocket 연결 확인:**
   - Network 탭에서 WebSocket 연결이 있는지 확인
   - 연결이 없으면 페이지 새로고침

---

## 📝 요약

- ✅ **Realtime Inspector가 비어있는 것은 정상** (postgres_changes는 보이지 않음)
- ✅ **실제 작동 여부는 브라우저 콘솔/Network 탭에서 확인**
- ✅ **`testRealtimeInsert()` 실행하여 테스트**
- ✅ **대시보드에서 실시간 업데이트 확인**
