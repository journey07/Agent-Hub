# Today 통계 자동 리셋 가이드

## 문제
한국 시간대 기준 자정(00:00)이 지나도 `today_api_calls`, `today_tasks` 등 오늘 통계가 리셋되지 않는 문제

## 해결 방법
`update_agent_stats` 함수가 호출될 때마다 날짜가 바뀌었는지 확인하고, 바뀌었으면 자동으로 리셋하도록 수정했습니다.

## 마이그레이션 실행 방법

### 1. Supabase Dashboard에서 SQL Editor 열기

### 2. 다음 SQL 실행 (순서대로)

#### 방법 A: 전체 마이그레이션 파일 실행 (권장)
```sql
-- reset_today_stats_migration.sql 파일의 전체 내용을 복사해서 실행
```

#### 방법 B: 단계별 실행

**Step 1: agents 테이블에 last_reset_date 필드 추가**
```sql
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS last_reset_date DATE DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE;

UPDATE agents 
SET last_reset_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul')::DATE
WHERE last_reset_date IS NULL;
```

**Step 2: update_agent_stats 함수 업데이트**
```sql
-- update_daily_stats_function.sql 파일의 전체 내용을 복사해서 실행
```

### 3. 확인

마이그레이션 후 다음을 확인하세요:

1. **agents 테이블에 last_reset_date 필드가 추가되었는지**
```sql
SELECT id, name, today_api_calls, today_tasks, last_reset_date 
FROM agents 
LIMIT 5;
```

2. **함수가 정상 작동하는지 테스트**
```sql
-- 테스트: update_agent_stats 함수 호출
SELECT update_agent_stats(
    'agent-worldlocker-001',
    'test',
    100,
    false,
    true,
    true
);

-- 결과 확인
SELECT id, today_api_calls, today_tasks, last_reset_date 
FROM agents 
WHERE id = 'agent-worldlocker-001';
```

## 작동 원리

1. **last_reset_date 필드**: 각 에이전트의 마지막 리셋 날짜를 저장
2. **자동 리셋**: `update_agent_stats` 함수가 호출될 때마다:
   - 오늘 날짜(한국 시간대 기준)와 `last_reset_date` 비교
   - 날짜가 바뀌었으면 (`last_reset_date < 오늘 날짜`):
     - `today_api_calls = 0`
     - `today_tasks = 0`
     - `api_breakdown.today_count = 0` (해당 에이전트의 모든 API 타입)
     - `last_reset_date = 오늘 날짜`로 업데이트
   - 그 후 통계 증가

3. **한국 시간대 기준**: 모든 날짜 계산은 `Asia/Seoul` 시간대를 사용
   - 자정(00:00)이 지나면 자동으로 다음 날로 인식
   - `CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Seoul'` 사용

## 수동 리셋 (필요시)

모든 에이전트의 오늘 통계를 수동으로 리셋하려면:

```sql
SELECT reset_today_stats_for_all_agents();
```

## 주의사항

1. **첫 실행**: 마이그레이션 후 첫 번째 `update_agent_stats` 호출 시 모든 에이전트의 통계가 리셋될 수 있습니다 (last_reset_date가 NULL이거나 과거 날짜인 경우)

2. **시간대**: 모든 날짜는 한국 시간대(Asia/Seoul) 기준입니다

3. **hourly_stats**: 시간별 통계는 `updated_at` 필드로 날짜를 추적하므로 별도 리셋이 필요 없습니다

## 문제 해결

### Q: 리셋이 안 되는 경우
1. `last_reset_date` 필드가 제대로 추가되었는지 확인
2. `update_agent_stats` 함수가 최신 버전인지 확인
3. Supabase SQL Editor에서 함수 정의 확인:
```sql
SELECT pg_get_functiondef('update_agent_stats'::regproc);
```

### Q: 시간대가 맞지 않는 경우
- 모든 날짜 계산은 `Asia/Seoul` 시간대를 사용합니다
- Supabase 서버의 시간대와 무관하게 한국 시간 기준으로 작동합니다

### Q: 기존 데이터가 리셋되지 않는 경우
- `update_agent_stats` 함수가 호출되어야 리셋됩니다
- 수동으로 리셋하려면 `reset_today_stats_for_all_agents()` 함수 실행
