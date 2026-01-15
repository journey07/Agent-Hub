# Vercel 환경변수 설정 가이드

## 📋 필수 환경변수 (월드 견적 에이전트 없이도 배포 가능)

### 1. Supabase 연결용 (프론트엔드 + 서버리스 함수)

다음 환경변수들을 Vercel Dashboard > Settings > Environment Variables에서 설정하세요:

#### 필수 (반드시 설정)
```
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

#### 서버리스 함수용 (프론트엔드와 동일한 값 사용 가능)
```
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
```

> **참고**: `SUPABASE_URL`과 `SUPABASE_ANON_KEY`는 서버리스 함수(`/api/stats.js`)에서 사용됩니다.
> `VITE_` 접두사가 없는 버전도 설정해야 합니다.

#### 선택사항 (권장)
```
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

> **Service Role Key를 사용하면**:
> - RLS(Row Level Security)를 우회하므로 더 안정적
> - `steve@dashboard.local` 계정 로그인 없이도 작동
> - **보안 주의**: 이 키는 절대 프론트엔드 코드에 노출되면 안 됩니다!

---

## 🔍 환경변수 찾는 방법

### Supabase 프로젝트에서:

1. **Supabase Dashboard** 접속: https://app.supabase.com
2. 프로젝트 선택
3. **Settings** > **API** 메뉴로 이동
4. 다음 정보 확인:
   - **Project URL** → `VITE_SUPABASE_URL`, `SUPABASE_URL`에 입력
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`, `SUPABASE_ANON_KEY`에 입력
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`에 입력 (선택사항)

---

## ✅ 설정 예시

Vercel Dashboard에서 다음과 같이 설정:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production, Preview, Development |
| `SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview, Development |
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production, Preview, Development |

> **Environment**: 모든 환경(Production, Preview, Development)에 동일하게 설정하는 것을 권장합니다.

---

## 🚀 배포 후 확인사항

1. **대시보드 접속**: `https://your-dashboard.vercel.app`
2. **로그인**: `steve` / `password123` (Supabase Auth에 계정이 있어야 함)
3. **에이전트 목록**: Supabase에 에이전트 데이터가 있으면 표시됨
4. **에러 확인**: Vercel Dashboard > Functions 탭에서 에러 로그 확인

---

## ⚠️ 월드 견적 에이전트가 없을 때

- ✅ **대시보드 UI는 정상 작동**합니다
- ✅ **Supabase에서 에이전트 목록을 불러옵니다**
- ⚠️ **월드 견적 에이전트 관련 기능**은 에이전트가 배포되기 전까지 사용 불가:
  - 헬스체크 (에이전트가 없으면 실패)
  - 토글 기능 (에이전트 URL이 없으면 작동 안 함)
  - 실시간 통계 업데이트 (에이전트가 `/api/stats`로 보고하지 않으면 업데이트 안 됨)

**나중에 월드 견적 에이전트를 배포하면**:
1. Supabase `agents` 테이블에서 `base_url` 업데이트
2. 에이전트 코드에서 `BRAIN_SERVER_URL` 환경변수 설정
3. 자동으로 연동됩니다!

---

## 🔧 문제 해결

### "Missing Supabase environment variables!" 에러
→ 환경변수가 제대로 설정되지 않았습니다. Vercel Dashboard에서 확인하세요.

### 로그인 실패
→ Supabase Auth에 `steve@dashboard.local` 계정이 생성되어 있어야 합니다.

### 서버리스 함수 에러
→ `SUPABASE_URL`, `SUPABASE_ANON_KEY`가 설정되어 있는지 확인하세요.
→ Service Role Key를 사용하면 더 안정적입니다.
