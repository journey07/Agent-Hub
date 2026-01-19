# Dashboard-World_Quotation 연동 설정 가이드

## 📊 사용하는 테이블 및 컬럼

### 1. **world_quotation 프로젝트**
- **테이블**: `users`
- **컬럼**: `name` (VARCHAR(100))
  - 사용자명을 저장하는 컬럼
  - 로그인 시 이 값을 가져와서 Dashboard로 전송

### 2. **Dashboard 프로젝트**
- **테이블**: `activity_logs`
- **컬럼**: `user_name` (TEXT, nullable)
  - world_quotation에서 전송된 사용자명을 저장
  - 기존 로그와의 호환성을 위해 nullable로 설정

## 🔧 추가 설정 필요 사항

### ✅ 1. Supabase 데이터베이스 마이그레이션

Dashboard 프로젝트의 Supabase에서 다음 SQL을 실행해야 합니다:

```sql
-- activity_logs 테이블에 user_name 컬럼 추가
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_name TEXT;
```

또는 `supabase_schema.sql` 파일의 전체 스키마를 다시 실행하셔도 됩니다.

**실행 방법:**
1. Supabase Dashboard 접속
2. SQL Editor 열기
3. 위 SQL 실행

### ✅ 2. 환경 변수 확인

#### world_quotation 프로젝트
다음 환경 변수가 설정되어 있는지 확인하세요:

```bash
# .env 파일 또는 배포 환경 변수
DASHBOARD_API_URL=https://hub.supersquad.kr/api/stats
# 또는 기존 URL 사용 가능:
# DASHBOARD_API_URL=https://agenthub-tau.vercel.app/api/stats
```

**설정 위치:**
- **로컬 개발**: `backend/.env`
- **Vercel 배포**: Vercel Dashboard > Settings > Environment Variables
- **Render 배포**: Render Dashboard > Environment Variables

#### Dashboard 프로젝트
기존 설정 그대로 사용 (변경 불필요)

### ✅ 3. users 테이블에 name 컬럼 확인

world_quotation의 Supabase에서 `users` 테이블에 `name` 컬럼이 있는지 확인:

```sql
-- users 테이블 구조 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users';
```

만약 `name` 컬럼이 없다면:

```sql
-- name 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100);
```

### ✅ 4. 기존 사용자 데이터 업데이트 (선택사항)

기존 사용자들에게 `name` 값을 설정하려면:

```sql
-- 예시: username을 name으로 복사 (임시)
UPDATE users 
SET name = username 
WHERE name IS NULL;

-- 또는 직접 업데이트
UPDATE users 
SET name = '관리자' 
WHERE username = 'admin';
```

## 🔄 데이터 흐름

```
1. 사용자 로그인
   ↓
2. world_quotation/users 테이블에서 name 컬럼 조회
   ↓
3. 프론트엔드: localStorage에 user 객체 저장 (name 포함)
   ↓
4. API 호출 시: X-User-Name 헤더에 name 값 전송
   ↓
5. 백엔드: 헤더에서 name 추출
   ↓
6. Dashboard API로 로그 전송 (userName 포함)
   ↓
7. Dashboard/activity_logs 테이블에 user_name 저장
```

## ✅ 체크리스트

배포 전 확인 사항:

- [ ] Dashboard Supabase에 `activity_logs.user_name` 컬럼 추가 완료
- [ ] world_quotation Supabase에 `users.name` 컬럼 존재 확인
- [ ] world_quotation 환경 변수에 `DASHBOARD_API_URL` 설정
- [ ] 기존 사용자 데이터에 `name` 값 설정 (선택사항)
- [ ] 로그인 테스트 후 Dashboard에서 로그 확인

## 🧪 테스트 방법

1. **로그인 테스트**
   - world_quotation에 로그인
   - Dashboard의 `activity_logs` 테이블에서 최신 로그 확인
   - `user_name` 컬럼에 사용자명이 저장되었는지 확인

2. **에이전트 작업 테스트**
   - 견적 계산, PDF 생성 등 작업 수행
   - Dashboard의 `activity_logs` 테이블에서 해당 작업 로그 확인
   - `user_name` 컬럼에 사용자명이 포함되었는지 확인

## 📝 참고사항

- `user_name`은 nullable이므로 기존 로그에는 영향을 주지 않습니다
- 사용자 정보가 없는 경우 (비로그인 상태 등) `user_name`은 `null`로 저장됩니다
- 모든 API 호출에 자동으로 사용자 정보가 포함되므로 별도 설정 불필요
