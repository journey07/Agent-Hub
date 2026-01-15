# Realtime 지연 문제 해결 가이드

## 🚨 문제: 5-10초 지연

정상 지연 시간은 **200-700ms**인데, **5-10초**가 걸린다면 심각한 문제입니다.

## 🔍 진단 체크리스트

### 1. 브라우저 콘솔 확인

브라우저 개발자 도구(F12) → Console 탭에서 다음 메시지를 확인하세요:

#### ✅ 정상 작동 시 나타나는 메시지:
```
📡 Setting up WebSocket Realtime for instant updates...
✅✅✅ WebSocket Connected - 실시간 업데이트 활성화!
📡 Subscribed to: agents, activity_logs, daily_stats, hourly_stats, api_breakdown
🔍 Realtime 연결 상태: SUBSCRIBED - 이제 실시간 업데이트가 작동합니다!
⚡⚡⚡ 실시간 로그 이벤트 수신!
⏱️ 지연 시간: 200-700ms
```

#### ❌ 문제가 있을 때 나타나는 메시지:
```
❌ WebSocket Disconnected - Realtime이 끊어졌습니다!
⚠️ 이제 fallback polling (30초마다)만 작동합니다.
⚠️⚠️⚠️ Realtime disconnected, using fallback polling...
```

### 2. Realtime 연결 상태 확인

브라우저 콘솔에서 다음을 확인:

```javascript
// React DevTools에서 AgentContext의 isConnected 상태 확인
// 또는 콘솔에서:
console.log('Realtime 연결 상태:', /* isConnected 값 */);
```

- `isConnected: true` → Realtime이 연결되어 있음 (정상)
- `isConnected: false` → Realtime이 끊어져서 fallback polling만 작동 (문제!)

### 3. Supabase Realtime 활성화 확인

Supabase Dashboard → SQL Editor에서 실행:

```sql
-- Realtime이 활성화된 테이블 확인
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

**확인 사항:**
- `activity_logs` 테이블이 목록에 있어야 함
- 없으면 `enable_realtime.sql` 파일을 실행해야 함

### 4. 네트워크 탭 확인

브라우저 개발자 도구 → Network 탭:

1. **WebSocket 연결 확인:**
   - `wss://[project].supabase.co/realtime/v1/websocket` 연결이 있는지
   - 상태가 `101 Switching Protocols`인지
   - 연결이 끊어져 있는지 (빨간색)

2. **Realtime 이벤트 확인:**
   - WebSocket 메시지가 실시간으로 오는지
   - `postgres_changes` 이벤트가 있는지

## 🔧 해결 방법

### 방법 1: Supabase Realtime 활성화

`enable_realtime.sql` 파일을 Supabase SQL Editor에서 실행:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE agents;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE hourly_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE api_breakdown;
```

### 방법 2: Realtime 연결 재시도

브라우저를 새로고침하거나, 다음 코드로 수동 재연결:

```javascript
// 브라우저 콘솔에서
location.reload();
```

### 방법 3: 네트워크 문제 확인

- 방화벽이 WebSocket을 차단하는지 확인
- VPN을 사용 중이면 끄고 테스트
- 다른 네트워크에서 테스트

### 방법 4: Fallback Polling 간격 줄이기

Realtime이 작동하지 않을 때를 대비해 fallback polling 간격을 줄일 수 있습니다:

```javascript
// src/context/AgentContext.jsx
setInterval(() => {
    refreshStatsOnly();
}, 5000); // 30초 → 5초로 변경
```

**주의:** 이렇게 하면 서버 부하가 증가합니다. Realtime을 고치는 것이 더 좋습니다.

## 📊 예상 원인별 해결책

### 원인 1: Realtime이 활성화되지 않음
**증상:** 브라우저 콘솔에 "⚡⚡⚡ 실시간 로그 이벤트 수신!" 메시지가 없음
**해결:** `enable_realtime.sql` 실행

### 원인 2: WebSocket 연결 끊김
**증상:** "❌ WebSocket Disconnected" 메시지
**해결:** 
- 브라우저 새로고침
- 네트워크 문제 확인
- Supabase 상태 확인

### 원인 3: Fallback Polling만 작동
**증상:** "⚠️⚠️⚠️ Realtime disconnected, using fallback polling..." 메시지
**해결:**
- Realtime 연결 문제 해결 (위 방법 1, 2)
- 또는 fallback polling 간격 줄이기 (임시 해결책)

### 원인 4: 네트워크 지연
**증상:** Realtime은 작동하지만 지연이 큼
**해결:**
- 네트워크 연결 확인
- VPN 끄기
- 다른 네트워크에서 테스트

## 🎯 빠른 진단

브라우저 콘솔에서 다음을 확인하세요:

1. **"✅✅✅ WebSocket Connected"** 메시지가 있는가?
   - ✅ 있음 → Realtime 연결됨 (다른 문제)
   - ❌ 없음 → Realtime 연결 안 됨 (문제!)

2. **"⚡⚡⚡ 실시간 로그 이벤트 수신!"** 메시지가 있는가?
   - ✅ 있음 → Realtime 작동 중 (지연 시간 확인)
   - ❌ 없음 → Realtime 이벤트 수신 안 됨 (구독 문제)

3. **"⏱️ 지연 시간"** 메시지의 값은?
   - < 1000ms → 정상
   - > 2000ms → 문제 (네트워크 또는 Realtime 서버 문제)

## 📝 체크리스트

- [ ] 브라우저 콘솔에서 "✅✅✅ WebSocket Connected" 메시지 확인
- [ ] "⚡⚡⚡ 실시간 로그 이벤트 수신!" 메시지 확인
- [ ] Network 탭에서 WebSocket 연결 확인
- [ ] Supabase SQL Editor에서 Realtime 활성화 확인
- [ ] `isConnected` 상태가 `true`인지 확인
- [ ] 지연 시간 측정 (콘솔에 표시됨)

## 🆘 여전히 문제가 있다면

1. 브라우저 콘솔의 모든 에러 메시지를 복사
2. Network 탭의 WebSocket 연결 상태 스크린샷
3. Supabase Dashboard에서 Realtime 설정 확인
4. 위 정보를 가지고 문제를 진단
