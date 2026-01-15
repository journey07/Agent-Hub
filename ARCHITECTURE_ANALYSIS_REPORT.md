# 대시보드 에이전트 소통 구조 분석 보고서

**작성일**: 2025-01-27  
**분석 범위**: Dashboard 중심 에이전트 모니터링 시스템 전체 아키텍처

---

## 📋 목차

1. [시스템 아키텍처 개요](#1-시스템-아키텍처-개요)
2. [데이터 흐름 분석](#2-데이터-흐름-분석)
3. [데이터베이스 연동](#3-데이터베이스-연동)
4. [프론트엔드 구조](#4-프론트엔드-구조)
5. [백엔드 구조](#5-백엔드-구조)
6. [발견된 문제점](#6-발견된-문제점)
7. [최적화 제안](#7-최적화-제안)
8. [보안 고려사항](#8-보안-고려사항)
9. [결론 및 권장사항](#9-결론-및-권장사항)

---

## 1. 시스템 아키텍처 개요

### 1.1 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard Frontend                        │
│  (React + Vite)                                              │
│  - AgentContext (상태 관리)                                   │
│  - Supabase Realtime (실시간 구독)                           │
│  - AgentService (API 호출)                                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTP/REST API
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              Brain Server (Express.js)                        │
│  - server.js (로컬 개발용)                                     │
│  - api/stats.js (Vercel Serverless Function)                 │
│  - api/stats/check-manual.js (Health Check)                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ Supabase Client
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    Supabase (PostgreSQL)                     │
│  - agents (에이전트 정보)                                     │
│  - activity_logs (활동 로그)                                  │
│  - api_breakdown (API 통계)                                  │
│  - daily_stats (일별 통계)                                   │
│  - hourly_stats (시간별 통계)                                │
│  - Realtime (실시간 변경사항 브로드캐스트)                     │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTP POST /api/stats
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              Agents (World Quotation 등)                      │
│  - statsService.js (통계 전송)                                │
│  - Heartbeat (주기적 등록)                                   │
│  - API Call Tracking                                         │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 주요 컴포넌트

- **Frontend**: React 기반 SPA, Supabase Realtime으로 실시간 업데이트
- **Brain Server**: 중앙 집중식 통계 수집 서버 (Express.js 또는 Vercel Serverless)
- **Supabase**: PostgreSQL 데이터베이스 + Realtime 기능
- **Agents**: 독립적인 에이전트 서비스들 (World Quotation 등)

---

## 2. 데이터 흐름 분석

### 2.1 에이전트 → 대시보드 (통계 전송)

```
Agent (statsService.js)
  ↓
POST /api/stats
  Body: {
    agentId: 'agent-worldlocker-001',
    apiType: 'calculate' | 'heartbeat' | 'status_change' | 'activity_log',
    responseTime: 1234,
    isError: false,
    shouldCountApi: true,
    shouldCountTask: true,
    model: 'gemini-3-pro-image-preview',
    baseUrl: 'http://localhost:3001',
    account: 'admin@worldlocker.com',
    apiKey: 'sk-...',
    logMessage: 'Optional log message'
  }
  ↓
Brain Server (server.js 또는 api/stats.js)
  ↓
Supabase RPC: update_agent_stats()
  ↓
Supabase Tables:
  - agents (업데이트)
  - api_breakdown (업데이트)
  - hourly_stats (업데이트)
  - activity_logs (INSERT)
  ↓
Supabase Realtime (자동 브로드캐스트)
  ↓
Frontend (AgentContext)
  - refreshData() 자동 호출
  - UI 자동 업데이트
```

**주요 흐름**:
1. 에이전트가 API 호출 시 `trackApiCall()` 실행
2. Brain Server의 `/api/stats` 엔드포인트로 POST 요청
3. Brain Server가 Supabase RPC 함수 `update_agent_stats()` 호출
4. Supabase가 통계 업데이트 및 Realtime 이벤트 발생
5. Frontend가 Realtime 구독을 통해 자동으로 데이터 갱신

### 2.2 대시보드 → 에이전트 (상태 제어)

```
Frontend (AgentContext.toggleAgent)
  ↓
POST {agent.baseUrl}/api/quote/agent-toggle
  ↓
Agent (agent-toggle.js)
  - 내부 상태 변경
  - POST /api/stats (status_change)
  ↓
Brain Server
  ↓
Supabase (agents.status 업데이트)
  ↓
Supabase Realtime
  ↓
Frontend (자동 업데이트)
```

### 2.3 수동 Health Check

```
Frontend (checkAgentHealth)
  ↓
POST /api/stats/check-manual
  Body: { agentId: 'agent-worldlocker-001' }
  ↓
Brain Server (check-manual.js)
  1. Supabase에서 agent 조회
  2. GET {agent.base_url}/api/quote/health
  3. POST {agent.base_url}/api/quote/verify-api
  4. Supabase agents 테이블 업데이트
  5. (선택적) Heartbeat 전송
  ↓
Supabase Realtime
  ↓
Frontend (자동 업데이트)
```

### 2.4 Heartbeat (에이전트 등록)

```
Agent 시작 시 (statsService.startHeartbeat)
  ↓
POST /api/stats
  Body: {
    agentId: 'agent-worldlocker-001',
    apiType: 'heartbeat',
    baseUrl: 'http://localhost:3001',
    model: 'gemini-3-pro-image-preview',
    ...
  }
  ↓
Brain Server
  ↓
Supabase agents 테이블:
  - last_active 업데이트
  - status = 'online'
  - base_url, model 업데이트
  - activity_logs에 로그 추가
  ↓
Supabase Realtime
  ↓
Frontend (자동 업데이트)
```

---

## 3. 데이터베이스 연동

### 3.1 스키마 구조

**agents 테이블**:
- 기본 정보: `id`, `name`, `model`, `client_name`, `client_id`
- 상태: `status`, `api_status`, `last_active`
- 통계: `total_api_calls`, `today_api_calls`, `total_tasks`, `today_tasks`
- 성능: `error_rate`, `avg_response_time`, `total_response_time`, `response_count`
- 설정: `base_url`, `account`, `api_key`

**activity_logs 테이블**:
- `agent_id`, `action`, `type`, `status`, `timestamp`, `response_time`
- 인덱스: `(agent_id, timestamp DESC)` - 빠른 조회

**api_breakdown 테이블**:
- `agent_id`, `api_type`, `today_count`, `total_count`
- Primary Key: `(agent_id, api_type)`

**hourly_stats 테이블**:
- `agent_id`, `hour` (HH24 형식), `tasks`, `api_calls`, `updated_at`
- Primary Key: `(agent_id, hour)`

**daily_stats 테이블**:
- `agent_id`, `date`, `tasks`, `api_calls`, `breakdown` (JSONB)

### 3.2 RLS (Row Level Security) 정책

**현재 설정**:
- `authenticated` 역할: SELECT, INSERT, UPDATE, DELETE 모두 허용
- `service_role` 역할: 모든 작업 허용 (RLS 우회)
- `anon` 역할: 정책 없음 (접근 불가)

**인증 방식**:
- **Backend (Brain Server)**: 
  - Service Role Key 우선 사용 (RLS 우회)
  - 없으면 Anon Key + `steve@dashboard.local` 로그인
- **Frontend**: Anon Key 사용 (RLS 정책에 따라 authenticated 사용자만 접근)

### 3.3 RPC 함수: `update_agent_stats`

```sql
CREATE OR REPLACE FUNCTION update_agent_stats(
    p_agent_id TEXT,
    p_api_type TEXT,
    p_response_time INTEGER DEFAULT 0,
    p_is_error BOOLEAN DEFAULT false,
    p_should_count_api BOOLEAN DEFAULT true,
    p_should_count_task BOOLEAN DEFAULT true
)
```

**기능**:
1. `agents` 테이블 통계 업데이트
2. `api_breakdown` 테이블 업데이트 (UPSERT)
3. `hourly_stats` 테이블 업데이트 (UPSERT)
4. 평균 응답 시간 자동 계산

---

## 4. 프론트엔드 구조

### 4.1 주요 컴포넌트

**AgentContext** (`src/context/AgentContext.jsx`):
- **상태 관리**: `agents`, `activityLogs`, `stats`, `isConnected`
- **Supabase Realtime 구독**: 
  - `agents` 테이블 변경 감지
  - `activity_logs` 테이블 변경 감지
  - `api_breakdown` 테이블 변경 감지
  - `daily_stats` 테이블 변경 감지
  - `hourly_stats` 테이블 변경 감지
- **함수**:
  - `refreshData()`: 전체 데이터 새로고침
  - `toggleAgent(agentId)`: 에이전트 상태 토글
  - `checkAgentHealth(agentId)`: 수동 Health Check

**AgentService** (`src/services/agentService.js`):
- `getAllAgents()`: 모든 에이전트 + 관련 데이터 조회
- `updateAgentStats()`: 통계 업데이트 (클라이언트 측에서 직접 호출 가능)
- `checkAgentHealth()`: Health Check API 호출

**AuthService** (`src/services/authService.js`):
- Supabase Auth 기반 인증
- `login()`, `logout()`, `getCurrentSession()`

### 4.2 데이터 로딩 전략

1. **초기 로딩**: `useEffect`에서 `getAllAgents()` 호출
2. **실시간 업데이트**: Supabase Realtime 구독으로 자동 갱신
3. **수동 새로고침**: `refreshData()` 함수 제공

### 4.3 페이지 구조

- **DashboardPage**: 전체 통계 및 최근 활동 표시
- **AgentListPage**: 에이전트 목록 및 필터링
- **AgentDetailPage**: 개별 에이전트 상세 정보, 차트, 로그

---

## 5. 백엔드 구조

### 5.1 Brain Server (server.js)

**로컬 개발용 Express 서버**:
- 포트: 5001 (기본값)
- 엔드포인트:
  - `POST /api/stats`: 통계 수신 및 처리
  - `POST /api/stats/check-manual`: 수동 Health Check

**인증 처리**:
- 서버 시작 시 `systemLogin()` 실행
- `steve@dashboard.local` 계정으로 로그인 (Anon Key 사용 시)

### 5.2 Vercel Serverless Functions

**api/stats.js**:
- Vercel 배포 시 사용되는 Serverless Function
- `server.js`와 동일한 로직
- CORS 헤더 자동 설정

**api/stats/check-manual.js**:
- 수동 Health Check 전용 함수
- 에이전트의 `/api/quote/health` 및 `/api/quote/verify-api` 호출
- 상태 업데이트 후 Heartbeat 전송 (선택적)

### 5.3 중복 코드 문제

**발견된 중복**:
- `server.js`와 `api/stats.js`에 거의 동일한 로직 존재
- `server.js`와 `api/stats/check-manual.js`에 중복된 인증 로직

**영향**:
- 유지보수 어려움
- 버그 수정 시 여러 파일 수정 필요
- 일관성 문제 가능성

---

## 6. 발견된 문제점

### 6.1 🔴 심각한 문제

#### 6.1.1 RLS 정책과 인증 방식의 불일치

**문제**:
- Backend에서 Anon Key 사용 시 `steve@dashboard.local`로 로그인 필요
- 로그인 실패 시 쓰기 작업 실패 가능
- Service Role Key 사용 권장하지만 환경 변수 설정 누락 가능

**위치**:
- `server.js:43-51` (systemLogin)
- `api/stats.js:19-34` (ensureAuthenticated)
- `api/stats/check-manual.js:16-27` (ensureAuthenticated)

**영향**:
- 에이전트 통계 전송 실패
- Health Check 실패
- 데이터 불일치

**권장 해결책**:
```javascript
// 환경 변수 검증 추가
if (!supabaseServiceKey && !supabaseAnonKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY required');
}

// Service Role Key 우선 사용 명시
const supabaseKey = supabaseServiceKey || supabaseAnonKey;
if (!supabaseServiceKey) {
  console.warn('⚠️ Using ANON_KEY - Service Role Key recommended for production');
}
```

#### 6.1.2 불필요한 전체 데이터 새로고침

**문제**:
- Supabase Realtime 이벤트 발생 시 `refreshData()` 호출
- `refreshData()`는 모든 에이전트의 모든 관련 데이터를 다시 조회
- 단일 에이전트 업데이트 시에도 전체 새로고침

**위치**:
- `src/context/AgentContext.jsx:89-173` (Realtime 구독)

**영향**:
- 불필요한 네트워크 트래픽
- 성능 저하 (특히 에이전트 수가 많을 때)
- Supabase 쿼리 비용 증가

**예시**:
```javascript
// 현재: 모든 이벤트에서 전체 새로고침
.on('postgres_changes', { table: 'agents' }, async (payload) => {
  await refreshData(); // 모든 에이전트 + 모든 관련 데이터 조회
});

// 개선: 변경된 에이전트만 업데이트
.on('postgres_changes', { table: 'agents' }, async (payload) => {
  if (payload.eventType === 'UPDATE') {
    // 변경된 에이전트만 조회 및 업데이트
    const { data } = await getAllAgents();
    const updatedAgent = data.find(a => a.id === payload.new.id);
    setAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
  }
});
```

### 6.2 🟡 중간 문제

#### 6.2.1 에러 핸들링 부족

**문제**:
- 여러 곳에서 에러가 발생해도 사용자에게 명확한 피드백 없음
- 네트워크 오류 시 재시도 로직 없음
- 일부 에러는 조용히 실패 (heartbeat 등)

**위치**:
- `src/services/agentService.js` (에러 처리 미흡)
- `src/context/AgentContext.jsx` (에러 상태 관리 없음)

**권장 해결책**:
```javascript
// 에러 상태 추가
const [error, setError] = useState(null);

// 재시도 로직 추가
const retryFetch = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

#### 6.2.2 중복된 코드

**문제**:
- `server.js`와 `api/stats.js`에 동일한 로직
- 인증 로직이 여러 파일에 중복

**권장 해결책**:
- 공통 로직을 별도 모듈로 분리
- 예: `api/lib/statsHandler.js`, `api/lib/auth.js`

#### 6.2.3 타임아웃 설정 부족

**문제**:
- Health Check에만 타임아웃 설정 (5초)
- 다른 API 호출에는 타임아웃 없음
- 장시간 응답 없을 시 사용자 경험 저하

**위치**:
- `api/stats/check-manual.js:114` (타임아웃 있음)
- `src/services/agentService.js` (타임아웃 없음)

### 6.3 🟢 경미한 문제

#### 6.3.1 불필요한 로그

**문제**:
- 개발용 console.log가 프로덕션에도 출력
- 과도한 로깅으로 인한 성능 저하 가능

**권장 해결책**:
```javascript
const isDev = process.env.NODE_ENV === 'development';
const log = isDev ? console.log : () => {};
```

#### 6.3.2 하드코딩된 값

**문제**:
- 일부 설정값이 하드코딩됨
- 예: `'steve@dashboard.local'`, `'password123'`

**위치**:
- `server.js:44`
- `api/stats.js:26`
- `api/stats/check-manual.js:19`

---

## 7. 최적화 제안

### 7.1 성능 최적화

#### 7.1.1 부분 업데이트 구현

**현재**:
```javascript
// 모든 이벤트에서 전체 새로고침
.on('postgres_changes', { table: 'agents' }, async (payload) => {
  await refreshData(); // 모든 에이전트 조회
});
```

**개선**:
```javascript
.on('postgres_changes', { table: 'agents' }, async (payload) => {
  if (payload.eventType === 'UPDATE') {
    // 변경된 에이전트만 조회
    const { data: agent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', payload.new.id)
      .single();
    
    // 관련 데이터만 조회 (필요 시)
    // ... api_breakdown, activity_logs 등
    
    // 상태 업데이트
    setAgents(prev => prev.map(a => 
      a.id === agent.id ? { ...a, ...agent } : a
    ));
  }
});
```

**예상 효과**:
- 네트워크 트래픽 90% 감소 (에이전트 10개 기준)
- 응답 시간 50% 개선
- Supabase 쿼리 비용 감소

#### 7.1.2 데이터 캐싱

**제안**:
- React Query 또는 SWR 도입
- 자동 캐싱 및 백그라운드 갱신
- 중복 요청 방지

**예시**:
```javascript
import { useQuery } from '@tanstack/react-query';

const { data: agents } = useQuery({
  queryKey: ['agents'],
  queryFn: getAllAgents,
  staleTime: 5000, // 5초간 캐시
  refetchInterval: 30000 // 30초마다 백그라운드 갱신
});
```

#### 7.1.3 배치 업데이트

**제안**:
- 여러 이벤트를 배치로 처리
- 디바운싱/쓰로틀링 적용

**예시**:
```javascript
let updateQueue = [];
let updateTimer = null;

const queueUpdate = (agentId) => {
  updateQueue.push(agentId);
  if (updateTimer) clearTimeout(updateTimer);
  updateTimer = setTimeout(() => {
    // 배치로 업데이트
    const uniqueIds = [...new Set(updateQueue)];
    updateAgents(uniqueIds);
    updateQueue = [];
  }, 500); // 500ms 디바운스
};
```

### 7.2 코드 품질 개선

#### 7.2.1 공통 모듈 분리

**제안 구조**:
```
api/
  lib/
    supabase.js          # Supabase 클라이언트 설정
    auth.js              # 인증 로직
    statsHandler.js      # 통계 처리 로직
    healthCheck.js       # Health Check 로직
  stats.js               # Vercel Function (statsHandler 사용)
  stats/
    check-manual.js      # Vercel Function (healthCheck 사용)
```

**예시**:
```javascript
// api/lib/statsHandler.js
export async function handleStatsUpdate(reqBody, supabase) {
  const { agentId, apiType, ... } = reqBody;
  
  if (apiType === 'heartbeat') {
    return await handleHeartbeat(agentId, reqBody, supabase);
  }
  // ... 다른 타입 처리
}

// api/stats.js
import { handleStatsUpdate } from './lib/statsHandler.js';
import { getSupabaseClient } from './lib/supabase.js';

export default async function handler(req, res) {
  const supabase = await getSupabaseClient();
  return await handleStatsUpdate(req.body, supabase);
}
```

#### 7.2.2 타입 안정성

**제안**:
- TypeScript 도입 또는 JSDoc 타입 주석
- API 요청/응답 타입 정의

**예시**:
```javascript
/**
 * @typedef {Object} StatsUpdateRequest
 * @property {string} agentId
 * @property {string} apiType
 * @property {number} responseTime
 * @property {boolean} isError
 * ...
 */

/**
 * @param {StatsUpdateRequest} reqBody
 * @param {SupabaseClient} supabase
 */
export async function handleStatsUpdate(reqBody, supabase) {
  // ...
}
```

### 7.3 모니터링 및 로깅

#### 7.3.1 구조화된 로깅

**제안**:
- Winston 또는 Pino 사용
- 로그 레벨 관리
- 프로덕션에서는 에러만 로깅

**예시**:
```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

logger.info('Stats update received', { agentId, apiType });
```

#### 7.3.2 성능 메트릭 수집

**제안**:
- API 응답 시간 측정
- 에러율 추적
- Supabase 쿼리 성능 모니터링

---

## 8. 보안 고려사항

### 8.1 현재 보안 상태

**✅ 잘 구현된 부분**:
- RLS 정책으로 데이터 접근 제어
- 인증된 사용자만 데이터 조회 가능
- API Key 마스킹 (`sk-...${key.slice(-4)}`)

**⚠️ 개선 필요**:
- CORS 설정이 `*`로 열려있음 (`api/stats.js:38`)
- 환경 변수 검증 부족
- 에러 메시지에 민감한 정보 노출 가능

### 8.2 권장 보안 개선

#### 8.2.1 CORS 제한

**현재**:
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
```

**개선**:
```javascript
const allowedOrigins = [
  'https://your-dashboard.vercel.app',
  process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null
].filter(Boolean);

const origin = req.headers.origin;
if (allowedOrigins.includes(origin)) {
  res.setHeader('Access-Control-Allow-Origin', origin);
}
```

#### 8.2.2 환경 변수 검증

**제안**:
```javascript
function validateEnv() {
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

validateEnv();
```

#### 8.2.3 에러 메시지 정제

**현재**:
```javascript
res.status(500).json({ error: error.message });
```

**개선**:
```javascript
const isDev = process.env.NODE_ENV === 'development';
res.status(500).json({ 
  error: isDev ? error.message : 'Internal server error',
  ...(isDev && { stack: error.stack })
});
```

---

## 9. 결론 및 권장사항

### 9.1 전체 평가

**강점**:
- ✅ 명확한 아키텍처 (중앙 집중식 Brain Server)
- ✅ 실시간 업데이트 (Supabase Realtime)
- ✅ 확장 가능한 구조
- ✅ 타입 안정성 (PostgreSQL 스키마)

**개선 필요**:
- ⚠️ 성능 최적화 (부분 업데이트)
- ⚠️ 코드 중복 제거
- ⚠️ 에러 핸들링 강화
- ⚠️ 보안 강화 (CORS, 환경 변수)

### 9.2 우선순위별 개선 사항

#### 🔴 높은 우선순위 (즉시 수정)

1. **RLS 인증 방식 개선**
   - Service Role Key 사용 강제 또는 명확한 에러 메시지
   - 환경 변수 검증 추가

2. **부분 업데이트 구현**
   - Realtime 이벤트에서 변경된 데이터만 업데이트
   - 전체 새로고침 최소화

3. **에러 핸들링 강화**
   - 사용자에게 명확한 에러 메시지 표시
   - 재시도 로직 추가

#### 🟡 중간 우선순위 (단기 개선)

4. **코드 중복 제거**
   - 공통 모듈 분리
   - 재사용 가능한 함수 생성

5. **타임아웃 설정**
   - 모든 API 호출에 타임아웃 추가
   - 기본값 10초, 설정 가능하도록

6. **로깅 개선**
   - 구조화된 로깅 도입
   - 프로덕션 로그 레벨 관리

#### 🟢 낮은 우선순위 (장기 개선)

7. **데이터 캐싱**
   - React Query 도입 검토
   - 캐시 전략 수립

8. **타입 안정성**
   - TypeScript 도입 검토
   - JSDoc 타입 주석 추가

9. **모니터링**
   - 성능 메트릭 수집
   - 에러 추적 시스템 도입

### 9.3 마이그레이션 계획

**Phase 1 (1주)**: 긴급 수정
- RLS 인증 개선
- 부분 업데이트 구현
- 에러 핸들링 강화

**Phase 2 (2-3주)**: 코드 품질 개선
- 공통 모듈 분리
- 타임아웃 설정
- 로깅 개선

**Phase 3 (1-2개월)**: 장기 개선
- 데이터 캐싱
- 타입 안정성
- 모니터링 시스템

---

## 부록: 주요 파일 참조

### 프론트엔드
- `src/context/AgentContext.jsx`: 상태 관리 및 Realtime 구독
- `src/services/agentService.js`: API 호출 서비스
- `src/features/dashboard/DashboardPage.jsx`: 대시보드 메인 페이지
- `src/features/agents/AgentDetailPage.jsx`: 에이전트 상세 페이지

### 백엔드
- `server.js`: 로컬 개발용 Express 서버
- `api/stats.js`: Vercel Serverless Function (통계 수신)
- `api/stats/check-manual.js`: Vercel Serverless Function (Health Check)

### 데이터베이스
- `supabase_schema.sql`: PostgreSQL 스키마 및 RLS 정책

### 에이전트
- `world_quotation/backend/src/services/statsService.js`: 통계 전송 서비스

---

**보고서 작성 완료**
