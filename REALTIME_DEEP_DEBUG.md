# Realtime 완전 작동 안 함 - 근본 원인 진단

## 현재 상황
- ✅ 모든 SQL 설정 완료 (Publication, RLS, REPLICA IDENTITY)
- ✅ 코드상 구독 설정 완료
- ❌ **실제로 DB → Frontend 실시간 반영이 안 됨**

---

## 🔍 단계별 진단 체크리스트

### 1단계: Supabase Realtime 서비스 활성화 확인

**Supabase Dashboard → Realtime → Settings:**
- [ ] "Enable Realtime service"가 **ON**인지 확인
- [ ] "Allow public access to channels"가 **ON**인지 확인

**만약 OFF라면:**
```sql
-- 이건 SQL로 설정할 수 없고 Dashboard에서만 가능합니다
-- Settings → Realtime → Enable Realtime service 켜기
```

### 2단계: Publication 확인 (가장 중요!)

**Supabase Dashboard → Database → Replication:**
- [ ] `activity_logs` 테이블이 목록에 있는지 확인
- [ ] `agents` 테이블이 목록에 있는지 확인
- [ ] `daily_stats`, `hourly_stats`, `api_breakdown` 확인

**SQL로 확인:**
```sql
SELECT schemaname, tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('activity_logs', 'agents', 'daily_stats', 'hourly_stats', 'api_breakdown');
```

**결과가 없으면:**
```sql
-- 다시 추가
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE agents;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE hourly_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE api_breakdown;
```

### 3단계: WebSocket 연결 확인

**브라우저 개발자 도구 → Network 탭:**
1. **WS (WebSocket) 필터** 선택
2. `wss://[프로젝트].supabase.co/realtime/v1/websocket` 연결 찾기
3. **Messages 탭** 클릭
4. 연결 상태 확인:
   - ✅ **Connected** 상태여야 함
   - ❌ 연결이 없으면 → Realtime 서비스가 비활성화됨

**콘솔에서 확인:**
```javascript
// 브라우저 콘솔에서
supabase.realtime.channels.forEach(ch => {
    console.log('Channel:', ch.topic, 'State:', ch.state);
});
```

### 4단계: 구독 상태 확인

**브라우저 콘솔:**
```javascript
// 구독 상태 확인
const channel = supabase.channel('dashboard-realtime');
console.log('Channel state:', channel.state);

// 모든 채널 확인
supabase.realtime.channels.forEach(ch => {
    console.log('Channel:', ch.topic);
    console.log('  State:', ch.state);
    console.log('  Bindings:', ch.bindings);
});
```

**예상 결과:**
- Channel state가 `joined` 또는 `subscribed`여야 함
- `closed` 또는 `errored`면 문제 있음

### 5단계: 실제 이벤트 테스트

**방법 1: Supabase Dashboard에서 직접 INSERT**
1. Supabase Dashboard → Table Editor → `activity_logs`
2. 새 행 추가
3. 브라우저 Network 탭 → WebSocket → Messages 확인
4. `postgres_changes` 이벤트가 오는지 확인

**방법 2: SQL Editor에서 INSERT**
```sql
INSERT INTO activity_logs (agent_id, action, type, status, timestamp, response_time)
VALUES (
    'agent-worldlocker-001',
    '🧪 SQL에서 직접 INSERT',
    'test',
    'info',
    NOW(),
    0
);
```

**WebSocket Messages에서 확인:**
- `postgres_changes` 이벤트가 나타나야 함
- 나타나지 않으면 → Publication 문제 또는 Realtime 서비스 비활성화

### 6단계: RLS 정책 확인

**SQL로 확인:**
```sql
-- 현재 사용자가 SELECT할 수 있는지 확인
SELECT * FROM activity_logs LIMIT 1;
```

**에러가 나면:**
```sql
-- anon 사용자 정책 확인
SELECT * FROM pg_policies 
WHERE tablename = 'activity_logs'
AND roles::text LIKE '%anon%';
```

---

## 🚨 가장 흔한 원인들

### 원인 1: Realtime 서비스가 비활성화됨 (가장 흔함!)
**증상:** WebSocket 연결이 없음
**해결:** Supabase Dashboard → Realtime → Settings → "Enable Realtime service" 켜기

### 원인 2: Publication에 테이블이 없음
**증상:** INSERT는 성공하지만 WebSocket 이벤트가 안 옴
**해결:** `ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;` 실행

### 원인 3: RLS 정책이 너무 엄격함
**증상:** 구독은 되지만 이벤트가 안 옴
**해결:** anon 사용자 SELECT 정책 추가

### 원인 4: WebSocket 연결이 끊어짐
**증상:** 처음엔 연결되다가 끊어짐
**해결:** 네트워크 문제 또는 Supabase 서비스 문제

---

## 🔧 즉시 시도해볼 것

### 1. Realtime 서비스 강제 재연결
```javascript
// 브라우저 콘솔에서
supabase.realtime.disconnect();
setTimeout(() => {
    supabase.realtime.connect();
    console.log('Realtime 재연결 시도');
}, 1000);
```

### 2. 채널 재구독
```javascript
// 브라우저 콘솔에서
const channel = supabase.channel('dashboard-realtime')
    .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_logs'
    }, (payload) => {
        console.log('🎯 이벤트 수신!', payload);
    })
    .subscribe((status) => {
        console.log('구독 상태:', status);
    });
```

### 3. 완전 초기화
```javascript
// 브라우저 콘솔에서
// 모든 채널 제거
supabase.realtime.channels.forEach(ch => {
    supabase.removeChannel(ch);
});

// 페이지 새로고침
location.reload();
```

---

## 📊 종합 진단 스크립트

브라우저 콘솔에서 실행:

```javascript
async function diagnoseRealtime() {
    console.log('🔍 Realtime 진단 시작...\n');
    
    // 1. 인증 확인
    const { data: { session } } = await supabase.auth.getSession();
    console.log('1. 인증 상태:', session ? '✅ 인증됨' : '❌ 인증 안 됨');
    
    // 2. WebSocket 연결 확인
    const channels = supabase.realtime.channels;
    console.log('2. WebSocket 채널 수:', channels.length);
    channels.forEach(ch => {
        console.log(`   - ${ch.topic}: ${ch.state}`);
    });
    
    // 3. 구독 테스트
    const testChannel = supabase.channel('test-diagnosis')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_logs'
        }, (payload) => {
            console.log('✅✅✅ 이벤트 수신 성공!', payload);
        })
        .subscribe((status) => {
            console.log('3. 테스트 구독 상태:', status);
            if (status === 'SUBSCRIBED') {
                console.log('   ✅ 구독 성공! 이제 INSERT 테스트하세요.');
            } else {
                console.log('   ❌ 구독 실패:', status);
            }
        });
    
    // 4. Publication 확인 (간접)
    const { data, error } = await supabase
        .from('activity_logs')
        .select('id')
        .limit(1);
    console.log('4. 테이블 접근:', error ? '❌ 실패: ' + error.message : '✅ 성공');
    
    return { session, channels: channels.length, testChannel };
}

// 실행
diagnoseRealtime();
```

---

## 🎯 최종 확인

위의 모든 단계를 거쳐도 안 되면:

1. **Supabase 지원팀에 문의**
   - Realtime 이벤트가 트리거되지 않는 문제
   - Publication 설정 확인 요청

2. **대안: Polling 사용**
   - Realtime이 안 되면 주기적 폴링으로 대체
   - 이미 코드에 fallback polling 있음 (30초마다)

---

## 💡 핵심 포인트

**Realtime이 작동하려면:**
1. ✅ Supabase Realtime 서비스 활성화 (Dashboard)
2. ✅ Publication에 테이블 추가 (SQL)
3. ✅ RLS 정책 설정 (SQL)
4. ✅ WebSocket 연결 (자동)
5. ✅ 구독 설정 (코드)

**하나라도 빠지면 작동 안 함!**
