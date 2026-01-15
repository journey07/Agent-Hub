# Today 통계 리셋 문제 해결 가이드

## 문제: SQL 실행했는데 브라우저에 반영 안 됨

### 원인 분석

1. **함수는 호출되어야 리셋됨**: `update_agent_stats` 함수가 호출될 때만 날짜 체크 후 리셋됩니다
2. **브라우저 캐싱**: 브라우저가 이전 데이터를 캐시하고 있을 수 있습니다
3. **Realtime 업데이트 지연**: Realtime이 업데이트를 전달하지 못할 수 있습니다

## 즉시 해결 방법

### Step 1: 즉시 리셋 SQL 실행

**Supabase Dashboard → SQL Editor**에서 다음 실행:

```sql
-- fix_today_reset_immediate.sql 파일의 전체 내용 실행
-- 또는 아래 SQL 직접 실행:

-- 1. 필드 추가 (없는 경우)
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE;

-- 2. 모든 today 통계 즉시 리셋
UPDATE agents 
SET 
    today_api_calls = 0,
    today_tasks = 0,
    last_reset_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE;

UPDATE api_breakdown
SET today_count = 0;
```

### Step 2: 브라우저에서 확인

1. **브라우저 새로고침 (F5 또는 Cmd+R)**
2. **하드 리프레시 (Ctrl+Shift+R 또는 Cmd+Shift+R)** - 캐시 무시
3. **브라우저 개발자 도구 → Network 탭**에서 요청 확인

### Step 3: 진단 SQL 실행

**Supabase Dashboard → SQL Editor**에서 다음 실행:

```sql
-- check_today_reset.sql 파일 실행
-- 또는 아래 쿼리로 상태 확인:

SELECT 
    id,
    name,
    today_api_calls,
    today_tasks,
    total_api_calls,
    total_tasks,
    last_reset_date,
    (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE as today_korea
FROM agents
ORDER BY id;
```

**예상 결과:**
- `today_api_calls` = 0
- `today_tasks` = 0
- `last_reset_date` = 오늘 날짜 (한국 시간 기준)
- `total_api_calls`, `total_tasks`는 그대로 유지되어야 함

## 함수가 제대로 작동하는지 테스트

### 테스트 1: 함수 호출 후 리셋 확인

```sql
-- 1. 현재 상태 확인
SELECT id, today_api_calls, today_tasks, last_reset_date 
FROM agents 
WHERE id = 'agent-worldlocker-001';

-- 2. 함수 호출 (이 함수가 호출되면 자동으로 날짜 체크 후 리셋)
SELECT update_agent_stats(
    'agent-worldlocker-001',
    'test',
    100,
    false,
    true,
    true
);

-- 3. 리셋 후 상태 확인
SELECT id, today_api_calls, today_tasks, last_reset_date 
FROM agents 
WHERE id = 'agent-worldlocker-001';
```

### 테스트 2: 날짜 변경 시뮬레이션

```sql
-- 1. last_reset_date를 어제로 변경 (테스트용)
UPDATE agents 
SET last_reset_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE - 1
WHERE id = 'agent-worldlocker-001';

-- 2. 함수 호출 (날짜가 바뀌었으므로 리셋되어야 함)
SELECT update_agent_stats(
    'agent-worldlocker-001',
    'test',
    100,
    false,
    true,
    true
);

-- 3. 확인 (today_api_calls가 1이어야 함 - 리셋 후 증가)
SELECT id, today_api_calls, today_tasks, last_reset_date 
FROM agents 
WHERE id = 'agent-worldlocker-001';
```

## 함수 정의 확인

함수가 제대로 업데이트되었는지 확인:

```sql
SELECT pg_get_functiondef('update_agent_stats'::regproc);
```

**확인 사항:**
- `v_last_reset_date` 변수가 있는지
- `IF v_last_reset_date < v_today THEN` 조건문이 있는지
- 리셋 로직이 있는지

## 브라우저에서 수동 새로고침

브라우저 콘솔에서:

```javascript
// AgentContext의 refreshAllData 함수 호출
// (브라우저 콘솔에서 직접 호출 불가능하므로 페이지 새로고침 필요)
location.reload(); // 또는 F5
```

## 자동 리셋 작동 확인

### 정상 작동 시:
1. 자정(00:00)이 지나면
2. 다음 `update_agent_stats` 함수 호출 시
3. 자동으로 `today_api_calls`, `today_tasks`가 0으로 리셋됨
4. `last_reset_date`가 오늘 날짜로 업데이트됨

### 작동 안 할 때:
1. `last_reset_date` 필드가 없는 경우 → 마이그레이션 SQL 실행
2. 함수가 업데이트되지 않은 경우 → `update_daily_stats_function.sql` 실행
3. 날짜 계산이 잘못된 경우 → 한국 시간대 확인

## 문제 해결 체크리스트

- [ ] `last_reset_date` 필드가 `agents` 테이블에 있는가?
- [ ] `update_agent_stats` 함수가 최신 버전인가?
- [ ] SQL 실행 후 브라우저를 새로고침했는가?
- [ ] 하드 리프레시(Ctrl+Shift+R)를 시도했는가?
- [ ] Supabase에서 직접 데이터를 확인했는가?
- [ ] `total_api_calls`, `total_tasks`는 그대로 유지되는가?

## 추가 도움

문제가 계속되면:

1. **Supabase Dashboard → Database → Tables → agents**에서 직접 데이터 확인
2. **Supabase Dashboard → Database → Functions → update_agent_stats**에서 함수 정의 확인
3. 브라우저 개발자 도구 → Console에서 에러 확인
4. 브라우저 개발자 도구 → Network에서 API 요청 확인
