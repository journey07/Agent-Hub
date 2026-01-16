# Agent Dashboard

대시보드를 중심으로 에이전트를 관리하는 모니터링 시스템입니다.

## 🚀 시작하기

### 필수 환경 변수 설정

`.env.local` 파일을 생성하고 다음 환경 변수들을 설정하세요:

```bash
# 🔐 REQUIRED: Security
JWT_SECRET=your-strong-random-secret-key-here

# 🗄️ REQUIRED: Supabase Database
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# 🔑 RECOMMENDED: Supabase Service Role Key (server-side only)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# 👤 OPTIONAL: System User (if not using Service Role Key)
SYSTEM_EMAIL=steve@dashboard.local
SYSTEM_PASSWORD=your-system-user-password-here

# 🌐 OPTIONAL: Server Configuration
VITE_BRAIN_SERVER_URL=http://localhost:5001
PORT=5001
```

#### ⚠️ 중요 보안 사항

1. **JWT_SECRET은 반드시 설정해야 합니다**
   - 강력한 랜덤 문자열을 사용하세요 (최소 32자)
   - 생성 예시: `openssl rand -base64 32`
   - 환경 변수가 없으면 로그인이 작동하지 않습니다

2. **SUPABASE_SERVICE_ROLE_KEY는 절대 프론트엔드에 노출하지 마세요**
   - 서버 사이드에서만 사용됩니다
   - RLS를 우회하므로 신중하게 사용하세요

3. **`.env.local` 파일은 절대 Git에 커밋하지 마세요**
   - `.gitignore`에 이미 포함되어 있습니다

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (Express + Vite)
npm run dev

# 빌드
npm run build

# 프로덕션 미리보기
npm run preview
```

## 📁 프로젝트 구조

```
Dashboard/
├── api/                 # Vercel Serverless Functions
│   ├── login.js        # 인증 엔드포인트
│   ├── stats.js        # 통계 업데이트 엔드포인트
│   └── lib/            # 서버 사이드 유틸리티
├── src/
│   ├── components/     # 재사용 가능한 컴포넌트
│   ├── features/        # 기능별 페이지
│   ├── context/        # React Context (상태 관리)
│   ├── services/       # API 서비스 레이어
│   └── lib/            # 클라이언트 사이드 유틸리티
├── server.js           # Express 개발 서버
└── supabase_schema.sql # 데이터베이스 스키마
```

## 🔧 기술 스택

- **Frontend**: React 19, Vite, React Router
- **Backend**: Express.js, Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Realtime
- **Charts**: Recharts

## 📝 추가 정보

자세한 평가 및 개선 사항은 `PROJECT_EVALUATION.md`를 참고하세요.
