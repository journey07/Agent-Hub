# 자정(00:00) 리셋 메커니즘 설명

## 현재 상황 (23:59 → 00:00)

### 현재 작동 방식

1. **DB 레벨 (수동 트리거)**
   - `update_agent_stats` 함수가 **호출될 때만** 날짜 체크
   - 날짜가 바뀌었으면 → `today_api_calls`, `today_tasks` 리셋
   - **문제**: 함수가 호출되지 않으면 리셋 안 됨

2. **프론트엔드 (필터링만)**
   - 데이터를 가져올 때 오늘 날짜만 필터링
   - **문제**: 자정을 감지하는 메커니즘이 없음

3. **트리거 없음**
   - 자정에 자동으로 실행되는 스케줄러 없음
   - 프론트엔드에서 자정 감지 없음

## 문제점

- 자정이 되어도 **즉시 리셋되지 않음**
- 다음 API 호출 시에만 리셋됨
- 사용자가 페이지를 새로고침해야 변경사항을 볼 수 있음

## 해결 방법

### 방법 1: 프론트엔드 자정 감지 (추천)

프론트엔드에서 1분마다 날짜를 체크하고, 날짜가 바뀌면:
1. 자동으로 데이터 새로고침
2. 필요시 DB 리셋 함수 호출

**장점:**
- 즉시 반응
- Supabase Pro 플랜 불필요
- 구현 간단

**단점:**
- 브라우저가 열려있을 때만 작동
- 페이지를 닫으면 작동 안 함

### 방법 2: DB 스케줄러 (Supabase Pro 필요)

PostgreSQL의 `pg_cron` 확장을 사용하여 자정에 자동 실행

**장점:**
- 브라우저와 무관하게 작동
- 항상 정확한 시간에 실행

**단점:**
- Supabase Pro 플랜 필요 (월 $25)
- 설정 복잡

### 방법 3: 외부 Cron 서비스

Vercel Cron, GitHub Actions 등으로 자정에 API 호출

**장점:**
- 무료 옵션 있음
- 브라우저와 무관

**단점:**
- 외부 서비스 의존
- 설정 필요

## 권장 구현: 프론트엔드 자정 감지

```javascript
// AgentContext.jsx에 추가
useEffect(() => {
    // 1분마다 날짜 체크
    const checkMidnight = setInterval(() => {
        const now = new Date();
        const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
        const currentDate = koreaTime.toLocaleDateString('en-CA');
        
        // 저장된 날짜와 비교
        const lastCheckedDate = localStorage.getItem('lastCheckedDate');
        
        if (lastCheckedDate && lastCheckedDate !== currentDate) {
            // 날짜가 바뀌었음! (자정 지남)
            console.log('🔄 자정 감지! 데이터 새로고침...');
            
            // 데이터 새로고침
            refreshAllData();
            
            // 날짜 업데이트
            localStorage.setItem('lastCheckedDate', currentDate);
        } else if (!lastCheckedDate) {
            // 첫 실행
            localStorage.setItem('lastCheckedDate', currentDate);
        }
    }, 60000); // 1분마다 체크
    
    return () => clearInterval(checkMidnight);
}, [refreshAllData]);
```

## 구현 완료 ✅

프론트엔드 자정 감지 기능이 추가되었습니다!

## 전체 플로우 (23:59 → 00:00)

### 1. 자정 전 (23:59)

**DB 상태:**
- `agents.today_api_calls` = 예: 150
- `agents.today_tasks` = 예: 30
- `agents.last_reset_date` = 예: '2025-01-15'
- `hourly_stats.updated_at` = '2025-01-15'

**프론트엔드:**
- 차트에 오늘(2025-01-15) 데이터 표시
- `localStorage.dashboard_last_checked_date` = '2025-01-15'
- 1분마다 날짜 체크 중...

### 2. 자정 도달 (00:00)

**프론트엔드 자동 감지:**
```javascript
// 1분마다 실행되는 체크
setInterval(() => {
    const currentDate = getTodayInKoreaString(); // '2025-01-16'
    const lastChecked = localStorage.getItem('dashboard_last_checked_date'); // '2025-01-15'
    
    if (lastChecked !== currentDate) {
        // 🎯 자정 감지!
        refreshAllData(); // 데이터 새로고침
        localStorage.setItem('dashboard_last_checked_date', currentDate);
    }
}, 60000);
```

**발생하는 일:**
1. ✅ 프론트엔드가 날짜 변경 감지
2. ✅ `refreshAllData()` 자동 호출
3. ✅ 새로운 데이터 가져오기 시작

### 3. 데이터 새로고침 중 (00:00)

**프론트엔드 → DB 쿼리:**
```sql
-- agents 테이블 조회
SELECT today_api_calls, today_tasks, last_reset_date 
FROM agents;

-- hourly_stats 조회 (오늘 날짜만)
SELECT * FROM hourly_stats 
WHERE updated_at = '2025-01-16'; -- 새 날짜
```

**DB 상태 (아직 리셋 안 됨):**
- `agents.today_api_calls` = 150 (아직 리셋 안 됨)
- `agents.last_reset_date` = '2025-01-15' (아직 업데이트 안 됨)

**프론트엔드 필터링:**
- `hourly_stats`에서 `updated_at = '2025-01-16'` 필터
- 결과: 빈 배열 (아직 새 날짜 데이터 없음)
- 차트: 모든 시간이 0으로 표시됨 ✅

### 4. 첫 API 호출 시 (00:01)

**에이전트가 API 호출:**
```javascript
updateAgentStats('agent-001', 'api_call', ...)
```

**DB 함수 실행:**
```sql
-- update_agent_stats 함수 내부
v_today := '2025-01-16'; -- 새 날짜
v_last_reset_date := '2025-01-15'; -- 이전 날짜

IF v_last_reset_date < v_today THEN
    -- 🎯 리셋 실행!
    UPDATE agents SET 
        today_api_calls = 0,
        today_tasks = 0,
        last_reset_date = '2025-01-16'
    WHERE id = 'agent-001';
    
    UPDATE api_breakdown SET today_count = 0 
    WHERE agent_id = 'agent-001';
END IF;

-- 그 후 통계 증가
UPDATE agents SET today_api_calls = 1 WHERE id = 'agent-001';
```

**결과:**
- ✅ `today_api_calls` = 0 → 1
- ✅ `today_tasks` = 0
- ✅ `last_reset_date` = '2025-01-16'
- ✅ `hourly_stats.updated_at` = '2025-01-16'

### 5. Realtime 업데이트 (00:01)

**Supabase Realtime:**
- `agents` 테이블 UPDATE 이벤트 발생
- 프론트엔드가 WebSocket으로 즉시 수신

**프론트엔드:**
```javascript
.on('postgres_changes', { table: 'agents' }, (payload) => {
    // 에이전트 통계 업데이트
    setAgents(prev => {
        // today_api_calls = 1로 업데이트
        // 차트 자동 업데이트
    });
})
```

**결과:**
- ✅ 차트에 새 데이터 표시
- ✅ 실시간으로 업데이트됨

## 요약

### 트리거 순서

1. **프론트엔드 자정 감지** (1분마다 체크)
   - 날짜가 바뀌면 → `refreshAllData()` 호출
   - 시간: 00:00 ~ 00:01 사이

2. **DB 리셋** (첫 API 호출 시)
   - `update_agent_stats` 함수 호출 시
   - 날짜 체크 후 자동 리셋
   - 시간: 첫 API 호출 시점 (보통 00:01 이후)

3. **프론트엔드 필터링** (항상)
   - 데이터 조회 시 오늘 날짜만 필터링
   - 자정 직후에는 빈 데이터 (0으로 표시)

4. **Realtime 업데이트** (실시간)
   - DB 변경 시 즉시 프론트엔드 반영
   - 차트 자동 업데이트

### 핵심 포인트

- ✅ **프론트엔드**: 자정 감지 후 즉시 새로고침 (1분 이내)
- ✅ **DB**: 첫 API 호출 시 자동 리셋
- ✅ **차트**: 오늘 날짜 데이터만 표시 (자정 직후는 0)
- ✅ **Realtime**: DB 변경 시 즉시 반영

### 브라우저가 닫혀있으면?

- 프론트엔드 자정 감지는 작동 안 함
- 하지만 다음 API 호출 시 DB에서 자동 리셋됨
- 브라우저를 다시 열면 리셋된 데이터가 표시됨
