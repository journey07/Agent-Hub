# 로그가 안 남을 때 디버깅 가이드

## 🔍 문제 진단 체크리스트

### 1. Supabase 데이터베이스 확인

**activity_logs 테이블에 user_name 컬럼이 있는지 확인:**

```sql
-- Supabase SQL Editor에서 실행
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'activity_logs'
ORDER BY ordinal_position;
```

**user_name 컬럼이 없다면 추가:**

```sql
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_name TEXT;
```

### 2. 환경 변수 확인

**world_quotation 프로젝트의 환경 변수 확인:**

```bash
# 로컬 개발 환경
cd world_quotation/backend
cat .env | grep DASHBOARD_API_URL

# 또는
echo $DASHBOARD_API_URL
```

**설정되어 있지 않다면:**

```bash
# 로컬 개발
DASHBOARD_API_URL=http://localhost:5001/api/stats

# 프로덕션 (Vercel)
DASHBOARD_API_URL=https://your-dashboard.vercel.app/api/stats
```

### 3. 사용자 데이터 확인

**users 테이블에 name 컬럼 값이 있는지 확인:**

```sql
SELECT id, username, name FROM users;
```

**name이 없다면 업데이트:**

```sql
UPDATE users SET name = '사용자명' WHERE username = '사용자아이디';
```

### 4. 로그 확인 방법

#### world_quotation 백엔드 로그 확인:

```bash
# 로컬 개발 시
cd world_quotation/backend
npm start

# 다음 로그들이 보여야 함:
# - 🔐 Login successful for user: ...
# - 📤 Sending login log to Dashboard...
# - ✅ Activity log sent successfully: ...
# - 📤 Sending API call to Dashboard: ...
# - ✅ Stats reported to Brain: ...
```

#### Dashboard API 로그 확인:

```bash
# 로컬 개발 시
cd Dashboard
npm run dev

# 다음 로그들이 보여야 함:
# - 📥 Incoming API Call: ... [User: ...]
# - 📝 Inserting log to activity_logs: ...
# - ✅ Logged successfully: ...
```

#### Vercel 배포 환경:

1. Vercel Dashboard > 프로젝트 > Functions 탭
2. `/api/stats` 함수 클릭
3. Logs 탭에서 실시간 로그 확인

### 5. 네트워크 확인

**Dashboard API가 접근 가능한지 확인:**

```bash
# 로컬
curl http://localhost:5001/api/stats \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-worldlocker-001",
    "apiType": "activity_log",
    "logAction": "Test log",
    "userName": "Test User"
  }'

# 프로덕션
curl https://your-dashboard.vercel.app/api/stats \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-worldlocker-001",
    "apiType": "activity_log",
    "logAction": "Test log",
    "userName": "Test User"
  }'
```

### 6. 브라우저 콘솔 확인

**프론트엔드에서 헤더가 제대로 전송되는지 확인:**

1. 브라우저 개발자 도구 열기 (F12)
2. Network 탭 열기
3. API 요청 클릭
4. Headers 섹션에서 `X-User-Name` 헤더 확인
5. Console 탭에서 다음 로그 확인:
   - `📤 Sending request with user name: ...`

### 7. Supabase에서 직접 확인

**activity_logs 테이블에서 최신 로그 확인:**

```sql
SELECT 
  id,
  agent_id,
  action,
  type,
  status,
  user_name,
  timestamp
FROM activity_logs
ORDER BY timestamp DESC
LIMIT 20;
```

**user_name이 null인 경우:**
- 사용자 정보가 제대로 전달되지 않았을 수 있음
- 로그 확인 필요

## 🐛 일반적인 문제와 해결책

### 문제 1: "user_name 컬럼이 없다" 에러

**해결:**
```sql
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_name TEXT;
```

### 문제 2: "DASHBOARD_API_URL이 설정되지 않음"

**해결:**
- 환경 변수에 `DASHBOARD_API_URL` 추가
- 서버 재시작

### 문제 3: "사용자명이 null로 저장됨"

**원인:**
- users 테이블에 name 값이 없음
- 프론트엔드에서 헤더가 전송되지 않음

**해결:**
- users 테이블에 name 값 업데이트
- 브라우저 콘솔에서 헤더 전송 확인

### 문제 4: "로그는 전송되지만 activity_logs에 저장 안 됨"

**원인:**
- Supabase RLS 정책 문제
- Supabase 연결 문제

**해결:**
- Supabase 로그 확인
- RLS 정책 확인 (service_role은 RLS 우회)

## 📊 테스트 시나리오

### 1. 로그인 테스트

1. world_quotation에 로그인
2. 백엔드 로그에서 다음 확인:
   ```
   🔐 Login successful for user: ...
   📤 Sending login log to Dashboard...
   ✅ Activity log sent successfully: ...
   ```
3. Dashboard API 로그에서 확인:
   ```
   📥 Incoming API Call: ... [User: ...]
   ✅ Logged successfully: ...
   ```
4. Supabase에서 확인:
   ```sql
   SELECT * FROM activity_logs 
   WHERE action LIKE 'User login%' 
   ORDER BY timestamp DESC LIMIT 1;
   ```

### 2. API 호출 테스트

1. 견적 계산 버튼 클릭
2. 브라우저 Network 탭에서 `/calculate` 요청 확인
3. Headers에서 `X-User-Name` 확인
4. 백엔드 로그에서 확인:
   ```
   👤 User name extracted from header: ...
   📤 Sending API call to Dashboard: ...
   ```
5. Supabase에서 확인:
   ```sql
   SELECT * FROM activity_logs 
   WHERE action LIKE 'Calculated Quote%' 
   ORDER BY timestamp DESC LIMIT 1;
   ```

## 🔧 추가 디버깅 명령어

### Supabase 연결 테스트

```sql
-- activity_logs 테이블 구조 확인
\d activity_logs

-- 최근 로그 확인
SELECT * FROM activity_logs 
ORDER BY timestamp DESC 
LIMIT 10;

-- user_name이 null이 아닌 로그만 확인
SELECT * FROM activity_logs 
WHERE user_name IS NOT NULL
ORDER BY timestamp DESC;
```

### 환경 변수 테스트

```javascript
// world_quotation/backend에서
console.log('DASHBOARD_API_URL:', process.env.DASHBOARD_API_URL);
console.log('AGENT_ID:', 'agent-worldlocker-001');
```

## 📞 문제가 계속되면

다음 정보를 수집하여 확인:

1. **백엔드 로그 전체** (에러 메시지 포함)
2. **Dashboard API 로그** (Vercel Functions 로그)
3. **Supabase 쿼리 결과:**
   ```sql
   SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 5;
   ```
4. **환경 변수 확인:**
   ```bash
   echo $DASHBOARD_API_URL
   ```
5. **브라우저 Network 탭 스크린샷** (헤더 포함)
