# 배포 가이드: 대시보드 + 월드 견적 에이전트

## 📋 구조 개요

```
월드 견적 에이전트 (Vercel)
    ↓ POST /api/stats
대시보드 Brain Server (Vercel Function)
    ↓ Supabase 저장
Supabase DB
    ↓ Realtime
프론트엔드 대시보드 (Vercel)
```

## ✅ 배포 전 체크리스트

### 1. Supabase 설정

- [ ] Supabase 프로젝트 생성 및 스키마 적용 (`supabase_schema.sql`)
- [ ] `agents` 테이블에 월드 견적 에이전트 등록:
  ```sql
  UPDATE agents 
  SET base_url = 'https://your-world-agent.vercel.app'
  WHERE id = 'agent-worldlocker-001';
  ```
- [ ] Supabase Auth에 시스템 사용자 생성:
  ```sql
  -- Supabase Dashboard > Authentication > Users에서 수동 생성
  -- Email: steve@dashboard.local
  -- Password: password123
  ```

### 2. Vercel 환경변수 설정

**대시보드 프로젝트 (Vercel):**

- `VITE_SUPABASE_URL` - Supabase 프로젝트 URL
- `VITE_SUPABASE_ANON_KEY` - Supabase Anon Key
- `SUPABASE_URL` - (서버리스 함수용) Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY` - (서버리스 함수용) Supabase Anon Key
- `SUPABASE_SERVICE_ROLE_KEY` - (선택사항, 권장) Supabase Service Role Key

> **참고**: Service Role Key를 사용하면 RLS를 우회하므로 더 안정적입니다.
> Anon Key만 사용해도 되지만, `steve@dashboard.local` 계정이 Supabase Auth에 있어야 합니다.

### 3. 월드 견적 에이전트 배포

- [ ] 월드 견적 에이전트를 Vercel에 배포
- [ ] 다음 엔드포인트가 정상 동작하는지 확인:
  - `GET /api/quote/health`
  - `POST /api/quote/verify-api`
  - `POST /api/quote/agent-toggle`
- [ ] CORS 설정: 대시보드 도메인을 허용 목록에 추가

### 4. 에이전트 코드 수정

월드 견적 에이전트가 Brain Server에 통계를 보내는 부분을 확인:

```javascript
// 에이전트 코드에서
const BRAIN_SERVER_URL = process.env.BRAIN_SERVER_URL || 'http://localhost:5001';

// 통계 전송
await fetch(`${BRAIN_SERVER_URL}/api/stats`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: 'agent-worldlocker-001',
    apiType: 'heartbeat',
    // ... 기타 필드
  })
});
```

**배포 후**: `BRAIN_SERVER_URL` 환경변수를 대시보드 Vercel URL로 설정:
```
BRAIN_SERVER_URL=https://your-dashboard.vercel.app
```

## 🚀 배포 단계

### Step 1: 대시보드 배포

1. GitHub에 푸시
2. Vercel에서 프로젝트 연결
3. 환경변수 설정 (위 체크리스트 참고)
4. 배포 완료 후 URL 확인: `https://your-dashboard.vercel.app`

### Step 2: 월드 견적 에이전트 배포

1. 월드 견적 에이전트 프로젝트를 Vercel에 배포
2. 환경변수 설정:
   - `BRAIN_SERVER_URL=https://your-dashboard.vercel.app`
3. 배포 완료 후 URL 확인: `https://your-world-agent.vercel.app`

### Step 3: Supabase 설정 업데이트

```sql
-- 월드 견적 에이전트의 base_url 업데이트
UPDATE agents 
SET base_url = 'https://your-world-agent.vercel.app'
WHERE id = 'agent-worldlocker-001';
```

### Step 4: 테스트

1. **대시보드 접속**: `https://your-dashboard.vercel.app`
2. **로그인**: `steve` / `password123`
3. **에이전트 목록 확인**: 월드 견적 에이전트가 표시되는지 확인
4. **헬스체크**: 에이전트 카드에서 "헬스체크" 버튼 클릭
5. **토글**: 에이전트 on/off 토글 테스트

## 🔧 문제 해결

### 에이전트가 "offline"으로 표시됨

- 월드 견적 에이전트가 `heartbeat`를 정기적으로 보내는지 확인
- `BRAIN_SERVER_URL` 환경변수가 올바른지 확인
- Vercel Function 로그 확인: `Vercel Dashboard > Functions > /api/stats`

### 헬스체크 실패

- 월드 견적 에이전트의 `/api/quote/health` 엔드포인트가 정상 동작하는지 확인
- CORS 설정 확인
- Supabase의 `agents.base_url`이 올바른지 확인

### 통계가 업데이트되지 않음

- Supabase RLS 정책 확인 (Service Role Key 사용 권장)
- Vercel Function 로그에서 에러 확인
- 에이전트가 `/api/stats`로 POST 요청을 보내는지 확인

## 📝 로컬 개발 vs 프로덕션

### 로컬 개발

- Brain Server: `server.js` 실행 (`npm run dev:server` 또는 `node server.js`)
- 프론트엔드: `npm run dev`
- 에이전트: `BRAIN_SERVER_URL=http://localhost:5001`

### 프로덕션

- Brain Server: Vercel Serverless Function (`/api/stats.js`)
- 프론트엔드: Vercel 정적 호스팅
- 에이전트: `BRAIN_SERVER_URL=https://your-dashboard.vercel.app`

## 🎯 핵심 포인트

1. **Brain Server는 이제 Vercel Function**입니다 (`/api/stats.js`)
2. **에이전트들은 여전히 Brain Server에 보고**합니다 (URL만 변경)
3. **Supabase가 중앙 저장소**입니다
4. **프론트엔드는 Supabase Realtime으로 실시간 업데이트**를 받습니다

이 구조는 **확장 가능하고 안정적**입니다! 🚀
