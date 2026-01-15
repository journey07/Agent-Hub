# 🚀 빠른 해결: Today 통계 리셋

## 문제
SQL 실행했는데 브라우저에 반영 안 됨

## 즉시 실행 (3단계)

### 1️⃣ Supabase에서 즉시 리셋

**Supabase Dashboard → SQL Editor**에서 실행:

```sql
-- 필드 추가 (없는 경우)
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE;

-- 모든 today 통계 즉시 0으로 리셋
UPDATE agents 
SET 
    today_api_calls = 0,
    today_tasks = 0,
    last_reset_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE;

UPDATE api_breakdown
SET today_count = 0;
```

### 2️⃣ 결과 확인

같은 SQL Editor에서 실행:

```sql
SELECT 
    id,
    name,
    today_api_calls,  -- 0이어야 함
    today_tasks,      -- 0이어야 함
    total_api_calls,  -- 그대로 유지
    total_tasks,      -- 그대로 유지
    last_reset_date
FROM agents;
```

**확인 사항:**
- ✅ `today_api_calls` = 0
- ✅ `today_tasks` = 0  
- ✅ `total_api_calls`, `total_tasks`는 그대로 유지
- ✅ `last_reset_date` = 오늘 날짜

### 3️⃣ 브라우저 새로고침

1. **하드 리프레시**: `Ctrl+Shift+R` (Windows) 또는 `Cmd+Shift+R` (Mac)
2. 또는 브라우저 개발자 도구 → Network 탭 → "Disable cache" 체크 → 새로고침

## 함수 업데이트 확인

함수가 제대로 업데이트되었는지 확인:

```sql
-- 함수 정의 확인
SELECT pg_get_functiondef('update_agent_stats'::regproc);
```

**확인 사항:**
- `v_last_reset_date` 변수가 있어야 함
- `IF v_last_reset_date < v_today THEN` 조건문이 있어야 함

**함수가 업데이트되지 않았다면:**

```sql
-- update_daily_stats_function.sql 파일의 전체 내용 실행
-- 또는 reset_today_stats_migration.sql 실행
```

## 자동 리셋 작동 원리

1. **자정(00:00)이 지나면** → 날짜가 바뀜
2. **다음 `update_agent_stats` 함수 호출 시**:
   - 오늘 날짜와 `last_reset_date` 비교
   - 날짜가 바뀌었으면 → `today_api_calls = 0`, `today_tasks = 0` 리셋
   - `last_reset_date = 오늘 날짜`로 업데이트
3. **그 후 통계 증가**

## 테스트

함수가 제대로 작동하는지 테스트:

```sql
-- 1. last_reset_date를 어제로 변경 (테스트)
UPDATE agents 
SET last_reset_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE - 1
WHERE id = 'agent-worldlocker-001';

-- 2. 함수 호출 (리셋 후 증가해야 함)
SELECT update_agent_stats(
    'agent-worldlocker-001',
    'test',
    100,
    false,
    true,
    true
);

-- 3. 확인 (today_api_calls가 1이어야 함)
SELECT id, today_api_calls, today_tasks, last_reset_date 
FROM agents 
WHERE id = 'agent-worldlocker-001';
```

## 여전히 안 되면?

1. **Supabase Dashboard → Database → Tables → agents**에서 직접 데이터 확인
2. 브라우저 개발자 도구 → Console에서 에러 확인
3. 브라우저 개발자 도구 → Network에서 API 요청 확인
4. `TODAY_RESET_TROUBLESHOOTING.md` 파일 참고
