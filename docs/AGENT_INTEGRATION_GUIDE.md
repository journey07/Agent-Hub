# Agent Integration Guide

Dashboard Hub와 새로운 Agent를 연동하기 위한 완전한 가이드입니다.

---

## 목차

1. [개요](#1-개요)
2. [사전 준비](#2-사전-준비)
3. [Step 1: Database 설정](#3-step-1-database-설정)
4. [Step 2: statsService 구현](#4-step-2-statsservice-구현)
5. [Step 3: Health Endpoint 구현](#5-step-3-health-endpoint-구현)
6. [Step 4: API Route에 Tracking 추가](#6-step-4-api-route에-tracking-추가)
7. [Step 5: Dashboard UI 수정](#7-step-5-dashboard-ui-수정)
8. [Step 6: 환경 변수 설정](#8-step-6-환경-변수-설정)
9. [Step 7: 배포 및 검증](#9-step-7-배포-및-검증)
10. [Troubleshooting](#10-troubleshooting)
11. [API Reference](#11-api-reference)

---

## 1. 개요

### 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│  Your Agent (Next.js / Express)                         │
├─────────────────────────────────────────────────────────┤
│  statsService.trackApiCall()                            │
│  statsService.sendActivityLog()                         │
│  /api/health endpoint                                   │
└──────────────────┬──────────────────────────────────────┘
                   │ POST https://hub.supersquad.kr/api/stats
                   ▼
┌──────────────────────────────────────────────────────────┐
│  Dashboard Hub API                                       │
│  - 통계 수집 및 저장                                      │
│  - Health Check 수행                                     │
└──────────────────┬───────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│  Supabase Database                                       │
│  - agents: 에이전트 상태/통계                             │
│  - api_breakdown: API 타입별 카운트                       │
│  - activity_logs: 활동 로그                              │
│  - daily_stats: 일일 통계                                │
└──────────────────────────────────────────────────────────┘
```

### 통신 방식

- **Agent → Dashboard**: 단방향 POST (Agent가 능동적으로 보고)
- **Dashboard → Agent**: Health Check만 수행 (GET /api/health)

---

## 2. 사전 준비

### 필요 정보

| 항목 | 예시 | 설명 |
|------|------|------|
| Agent ID | `agent-worldlocker-003` | 고유 식별자 (형식: `agent-{client}-{number}`) |
| Agent 이름 | `납품일정 에이전트` | Dashboard에 표시될 이름 |
| Client ID | `client-worldlocker` | 소속 클라이언트 ID |
| Base URL | `https://wl-agent2.supersquad.kr` | 배포된 Agent URL |
| Task Performance 항목 | `teams-read`, `teams-send`, `ai-coach` | 추적할 API 타입들 |

---

## 3. Step 1: Database 설정

### 3.1 agents 테이블에 레코드 추가

Supabase SQL Editor에서 실행:

```sql
-- 새 에이전트 등록
INSERT INTO agents (
    id,
    name,
    model,
    client_name,
    client_id,
    status,
    created_at,
    last_active,
    total_api_calls,
    today_api_calls,
    total_tasks,
    today_tasks,
    total_errors,
    today_errors,
    error_rate,
    avg_response_time,
    base_url
) VALUES (
    'agent-worldlocker-003',           -- 고유 ID
    '납품일정 에이전트',                  -- 표시 이름
    'gemini-2.0-flash',                -- 사용 모델
    '(주)월드락커',                      -- 클라이언트명
    'client-worldlocker',              -- 클라이언트 ID
    'offline',                         -- 초기 상태
    NOW(),
    NOW(),
    0, 0, 0, 0, 0, 0, 0, 0,
    'https://wl-agent2.supersquad.kr'  -- 배포 URL (끝에 / 없이)
);
```

### 3.2 api_breakdown 테이블에 Task Performance 항목 추가

```sql
-- Task Performance로 추적할 API 타입들 등록
INSERT INTO api_breakdown (agent_id, api_type, today_count, total_count)
VALUES
    ('agent-worldlocker-003', 'teams-read', 0, 0),
    ('agent-worldlocker-003', 'teams-send', 0, 0),
    ('agent-worldlocker-003', 'ai-coach', 0, 0);
```

### 3.3 필수 테이블 스키마 참고

<details>
<summary>agents 테이블 전체 스키마</summary>

```sql
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    model TEXT,
    client_name TEXT,
    client_id TEXT,
    status TEXT DEFAULT 'offline',      -- 'online' | 'offline'
    api_status TEXT DEFAULT 'unknown',  -- 'healthy' | 'error' | 'unknown'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ,
    base_url TEXT,                      -- Health check용 URL
    account TEXT,
    api_key TEXT,

    -- 통계 필드
    total_api_calls INTEGER DEFAULT 0,
    today_api_calls INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    today_tasks INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    today_errors INTEGER DEFAULT 0,
    error_rate REAL DEFAULT 0,
    avg_response_time REAL DEFAULT 0,
    total_response_time INTEGER DEFAULT 0,
    response_count INTEGER DEFAULT 0,
    last_reset_date DATE DEFAULT CURRENT_DATE
);
```

</details>

---

## 4. Step 2: statsService 구현

### 4.1 TypeScript 버전 (Next.js App Router용)

파일: `lib/services/statsService.ts`

```typescript
const AGENT_ID = 'agent-worldlocker-003'  // 여기에 Agent ID 입력
const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL || 'https://hub.supersquad.kr/api/stats'
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

/**
 * API 호출 추적 - Dashboard Hub에 보고
 *
 * @param apiType - 추적할 API 타입 (예: 'teams-read', 'ai-coach')
 * @param responseTime - 응답 시간 (ms)
 * @param isError - 에러 여부
 * @param shouldCountApi - API 호출 카운트에 포함할지
 * @param shouldCountTask - Task 카운트에 포함할지
 * @param logMessage - 로그 메시지 (선택)
 * @param userName - 사용자 이름 (선택)
 */
export async function trackApiCall(
  apiType: string,
  responseTime: number = 0,
  isError: boolean = false,
  shouldCountApi: boolean = true,
  shouldCountTask: boolean = true,
  logMessage: string | null = null,
  userName: string | null = null
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      agentId: AGENT_ID,
      apiType,
      responseTime,
      isError,
      shouldCountApi,
      shouldCountTask,
      model: MODEL_NAME,
      account: process.env.ACCOUNT_EMAIL || 'admin@worldlocker.com',
      apiKey: process.env.GEMINI_API_KEY
        ? `sk-...${process.env.GEMINI_API_KEY.slice(-4)}`
        : 'sk-unknown',
      logMessage,
      userName,
    }

    const response = await fetch(DASHBOARD_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      console.error(`[statsService] Failed to report stats: ${response.status}`)
    } else {
      console.log(`[statsService] Stats reported: ${apiType}`)
    }

    return { success: response.ok }
  } catch (error: any) {
    console.error(`[statsService] Dashboard unavailable: ${error.message}`)
    return { success: false, error: error.message }
  }
}

/**
 * 활동 로그 전송 - Dashboard Hub에 보고
 *
 * @param action - 로그 메시지 (예: 'User logged in')
 * @param logType - 로그 타입 ('info' | 'success' | 'error' | 'warning' | 'login')
 * @param responseTime - 응답 시간 (ms)
 * @param userName - 사용자 이름 (선택)
 */
export async function sendActivityLog(
  action: string,
  logType: string = 'info',
  responseTime: number = 0,
  userName: string | null = null
): Promise<{ success: boolean; error?: string; result?: any }> {
  if (!action) {
    console.error('[statsService] sendActivityLog: action is required')
    return { success: false, error: 'action parameter is required' }
  }

  try {
    const payload = {
      agentId: AGENT_ID,
      apiType: 'activity_log',
      logAction: action,
      logType: logType || 'info',
      responseTime: responseTime || 0,
      shouldCountApi: false,
      shouldCountTask: false,
      model: MODEL_NAME,
      account: process.env.ACCOUNT_EMAIL || 'admin@worldlocker.com',
      userName: userName || null,
    }

    const response = await fetch(DASHBOARD_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      console.error(`[statsService] Activity log failed: ${response.status}`)
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    const result = await response.json().catch(() => ({}))
    console.log(`[statsService] Activity log sent: "${action}"`)
    return { success: true, result }
  } catch (error: any) {
    console.error(`[statsService] Dashboard unavailable: ${error.message}`)
    return { success: false, error: error.message }
  }
}

/**
 * Heartbeat 전송 - 서버 시작 시 호출
 */
export async function sendHeartbeat(baseUrl: string): Promise<void> {
  try {
    const response = await fetch(DASHBOARD_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        apiType: 'heartbeat',
        baseUrl,
        shouldCountApi: false,
        shouldCountTask: false,
        model: MODEL_NAME,
        account: process.env.ACCOUNT_EMAIL || 'admin@worldlocker.com',
        apiKey: process.env.GEMINI_API_KEY
          ? `sk-...${process.env.GEMINI_API_KEY.slice(-4)}`
          : 'sk-unknown',
      }),
    })

    if (response.ok) {
      console.log(`[statsService] Heartbeat sent successfully`)
    } else {
      console.error(`[statsService] Heartbeat failed: ${response.status}`)
    }
  } catch (error: any) {
    if (error.code !== 'ECONNREFUSED' && error.code !== 'ENOTFOUND') {
      console.error(`[statsService] Heartbeat error: ${error.message}`)
    }
  }
}
```

### 4.2 JavaScript 버전 (Express용)

파일: `backend/src/services/statsService.js`

```javascript
import dotenv from 'dotenv';
dotenv.config();

const AGENT_ID = 'agent-worldlocker-003';  // 여기에 Agent ID 입력
const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL || 'https://hub.supersquad.kr/api/stats';
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

export async function trackApiCall(
  apiType,
  responseTime = 0,
  isError = false,
  shouldCountApi = true,
  shouldCountTask = true,
  logMessage = null,
  userName = null
) {
  try {
    const payload = {
      agentId: AGENT_ID,
      apiType,
      responseTime,
      isError,
      shouldCountApi,
      shouldCountTask,
      model: MODEL_NAME,
      account: process.env.ACCOUNT_EMAIL || 'admin@worldlocker.com',
      apiKey: process.env.GEMINI_API_KEY
        ? `sk-...${process.env.GEMINI_API_KEY.slice(-4)}`
        : 'sk-unknown',
      logMessage,
      userName,
    };

    const response = await fetch(DASHBOARD_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`[statsService] Failed: ${response.status}`);
    } else {
      console.log(`[statsService] Stats reported: ${apiType}`);
    }

    return { success: response.ok };
  } catch (error) {
    console.error(`[statsService] Dashboard unavailable: ${error.message}`);
    return { success: false, error: error.message };
  }
}

export async function sendActivityLog(
  action,
  logType = 'info',
  responseTime = 0,
  userName = null
) {
  if (!action) {
    return { success: false, error: 'action parameter is required' };
  }

  try {
    const payload = {
      agentId: AGENT_ID,
      apiType: 'activity_log',
      logAction: action,
      logType: logType || 'info',
      responseTime: responseTime || 0,
      shouldCountApi: false,
      shouldCountTask: false,
      model: MODEL_NAME,
      account: process.env.ACCOUNT_EMAIL || 'admin@worldlocker.com',
      userName: userName || null,
    };

    const response = await fetch(DASHBOARD_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const result = await response.json().catch(() => ({}));
    console.log(`[statsService] Activity log sent: "${action}"`);
    return { success: true, result };
  } catch (error) {
    console.error(`[statsService] Dashboard unavailable: ${error.message}`);
    return { success: false, error: error.message };
  }
}

export async function sendHeartbeat(baseUrl) {
  try {
    await fetch(DASHBOARD_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        apiType: 'heartbeat',
        baseUrl,
        shouldCountApi: false,
        shouldCountTask: false,
        model: MODEL_NAME,
        account: process.env.ACCOUNT_EMAIL || 'admin@worldlocker.com',
        apiKey: process.env.GEMINI_API_KEY
          ? `sk-...${process.env.GEMINI_API_KEY.slice(-4)}`
          : 'sk-unknown',
      }),
    });
    console.log(`[statsService] Heartbeat sent`);
  } catch (error) {
    console.error(`[statsService] Heartbeat error: ${error.message}`);
  }
}

export function startHeartbeat(port) {
  if (process.env.NODE_ENV === 'test') return;

  const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
  console.log(`[statsService] Registering Agent ${AGENT_ID}`);
  sendHeartbeat(baseUrl);
}
```

---

## 5. Step 3: Health Endpoint 구현

### 5.1 Next.js App Router

파일: `app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    agent: 'your-agent-name',  // 에이전트 식별자
    timestamp: new Date().toISOString()
  })
}
```

### 5.2 Express

파일: `backend/src/index.js`

```javascript
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    agent: 'your-agent-name',
    timestamp: new Date().toISOString()
  });
});
```

### Health Check 요구사항

| 항목 | 요구사항 |
|------|---------|
| Method | GET |
| Path | `/api/health` |
| Status | 200 OK |
| Response | `{ "status": "ok", ... }` |
| Timeout | 5초 이내 응답 |

---

## 6. Step 4: API Route에 Tracking 추가

### 핵심 규칙: Vercel Serverless에서는 반드시 `await` 사용!

Vercel Serverless Function은 **응답을 보낸 후 즉시 종료**됩니다.
`await` 없이 호출하면 tracking이 실행되지 않습니다.

### 6.1 올바른 예시

```typescript
// app/api/some-feature/route.ts
import { NextResponse } from 'next/server'
import { trackApiCall, sendActivityLog } from '@/lib/services/statsService'

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 비즈니스 로직 실행
    const result = await doSomething()

    // ✅ 반드시 await 사용!
    await trackApiCall('your-api-type', Date.now() - startTime, false, true, true)

    return NextResponse.json(result)
  } catch (error) {
    // ✅ 에러 시에도 await 사용!
    await trackApiCall('your-api-type', Date.now() - startTime, true, true, true)

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### 6.2 잘못된 예시

```typescript
// ❌ 절대 이렇게 하지 마세요!
export async function POST(request: NextRequest) {
  const result = await doSomething()

  // ❌ await 없음 - Vercel에서 실행 안됨!
  trackApiCall('your-api-type', 100, false, true, true)

  // ❌ .then() 사용 - Vercel에서 실행 안됨!
  sendActivityLog('Action', 'info').then(() => console.log('sent'))

  return NextResponse.json(result)  // 응답 후 함수 종료됨
}
```

### 6.3 로그인 예시 (Activity Log)

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { loginUser } from '@/lib/services/authService'
import { sendActivityLog } from '@/lib/services/statsService'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()
    const result = await loginUser(username, password)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    // ✅ 로그인 성공 로그 - 반드시 await!
    const userName = result.user?.name || 'Unknown'
    try {
      const logResult = await sendActivityLog('User logged in', 'login', 0, userName)
      if (logResult.success) {
        console.log(`[LOGIN] Log sent for user: ${userName}`)
      } else {
        console.error(`[LOGIN] Log failed: ${logResult.error}`)
      }
    } catch (err) {
      console.error(`[LOGIN] Exception:`, err)
    }

    return NextResponse.json({ success: true, user: result.user })
  } catch (error) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
```

---

## 7. Step 5: Dashboard UI 수정

### 7.1 Task Performance 항목 추가

파일: `src/features/agents/AgentDetailPage.jsx`

`getTaskPerformanceData` 함수에 새 에이전트 분기 추가:

```jsx
// 새 에이전트 (agent-your-id)
if (agent.id === 'agent-your-id') {
    const sumTotal = (types) => (agent.dailyHistory || []).reduce((acc, d) => {
        if (!d.breakdown) return acc;
        let breakdown = d.breakdown;
        if (typeof breakdown === 'string') {
            try { breakdown = JSON.parse(breakdown); } catch (e) { return acc; }
        }
        return acc + types.reduce((s, t) => s + (Number(breakdown[t]) || 0), 0);
    }, 0);

    // API 타입별 카운트 계산
    const type1Count = sum(['your-api-type-1']);
    const type1Total = sumTotal(['your-api-type-1']);

    const type2Count = sum(['your-api-type-2']);
    const type2Total = sumTotal(['your-api-type-2']);

    return [
        {
            id: 'your-api-type-1',
            name: 'API Type 1 (API Call)',
            period: type1Count,
            total: type1Total,
            icon: <PremiumIcon type="activity" color="blue" size={20} />,
            color: '#3b82f6'
        },
        {
            id: 'your-api-type-2',
            name: 'API Type 2 (API Call)',
            period: type2Count,
            total: type2Total,
            icon: <PremiumIcon type="zap" color="purple" size={20} />,
            color: '#8b5cf6'
        }
    ];
}
```

### 7.2 mockData.js에 에이전트 추가

파일: `src/data/mockData.js`

```javascript
export const agents = [
    // ... 기존 에이전트들
    {
        id: 'agent-your-id',
        name: '새 에이전트',
        client: '(주)클라이언트',
        clientId: 'client-id',
        status: 'online',
        createdAt: '2026-02-01',
        lastActive: '2026-02-11T00:00:00',
        todayTasks: 0,
        totalTasks: 0,
        todayApiCalls: 0,
        totalApiCalls: 0,
        errorRate: 0,
        avgResponseTime: 0,
        isLiveAgent: true,  // 실시간 데이터 사용
        description: '에이전트 설명',
        category: 'your-category'
    }
];
```

---

## 8. Step 6: 환경 변수 설정

### 8.1 로컬 개발 (.env.local)

```env
DASHBOARD_API_URL=https://hub.supersquad.kr/api/stats
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.0-flash
ACCOUNT_EMAIL=admin@yourcompany.com
```

### 8.2 Vercel 배포

Vercel Dashboard → Project Settings → Environment Variables:

| Key | Value | Environment |
|-----|-------|-------------|
| `DASHBOARD_API_URL` | `https://hub.supersquad.kr/api/stats` | All |
| `SUPABASE_URL` | `https://xxx.supabase.co` | All |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | All |
| `GEMINI_API_KEY` | `AIza...` | All |

---

## 9. Step 7: 배포 및 검증

### 9.1 배포 체크리스트

- [ ] Database: agents 테이블에 레코드 추가됨
- [ ] Database: api_breakdown에 API 타입 추가됨
- [ ] Database: base_url이 정확함 (끝에 `/` 없이)
- [ ] Code: statsService 구현됨
- [ ] Code: /api/health 엔드포인트 구현됨
- [ ] Code: 모든 trackApiCall에 `await` 사용
- [ ] Vercel: 환경 변수 설정됨
- [ ] Vercel: 배포 완료됨
- [ ] Dashboard: Task Performance UI 수정됨

### 9.2 검증 방법

#### Health Check 테스트

```bash
curl https://your-agent.vercel.app/api/health
# Expected: {"status":"ok","agent":"...","timestamp":"..."}
```

#### Dashboard 상태체크 테스트

```bash
curl -X POST https://hub.supersquad.kr/api/stats/check-manual \
  -H "Content-Type: application/json" \
  -d '{"agentId":"agent-your-id"}'
# Expected: {"success":true}
```

#### 로그 저장 테스트

1. Agent에서 로그인 또는 API 호출
2. Supabase → activity_logs 테이블 확인
3. Dashboard Hub UI에서 로그 확인

---

## 10. Troubleshooting

### 문제: 상태체크 404 에러

**원인**:
- base_url이 잘못됨
- /api/health가 배포 안됨
- DNS 전파 지연

**해결**:
1. Supabase에서 base_url 확인
2. curl로 직접 health endpoint 테스트
3. Vercel에서 재배포

### 문제: 로그가 DB에 저장 안됨

**원인**:
- `await` 누락 (가장 흔한 원인!)
- 환경 변수 미설정
- 네트워크 오류

**해결**:
1. 모든 trackApiCall/sendActivityLog에 `await` 추가
2. Vercel 환경 변수 확인
3. Vercel Runtime Logs에서 "External APIs" 확인

### 문제: Vercel 로그에 "No outgoing requests"

**원인**: `await` 없이 비동기 함수 호출

**해결**: 반드시 `await` 사용

```typescript
// ❌ Wrong
trackApiCall('type', 100)
return NextResponse.json(result)

// ✅ Correct
await trackApiCall('type', 100)
return NextResponse.json(result)
```

### 문제: Task Performance 카운트가 안 올라감

**원인**:
- apiType 불일치
- api_breakdown에 해당 타입 없음
- shouldCountTask가 false

**해결**:
1. trackApiCall의 apiType과 api_breakdown의 api_type 일치 확인
2. shouldCountTask를 true로 설정

---

## 11. API Reference

### POST /api/stats

Dashboard Hub에 통계/로그를 보고합니다.

#### Request Body

```typescript
{
  // 필수
  agentId: string;           // 에이전트 ID
  apiType: string;           // 'heartbeat' | 'activity_log' | 'your-api-type'

  // API 통계 (apiType이 일반 API일 때)
  responseTime?: number;     // 응답 시간 (ms)
  isError?: boolean;         // 에러 여부
  shouldCountApi?: boolean;  // API 카운트 포함 여부 (default: true)
  shouldCountTask?: boolean; // Task 카운트 포함 여부 (default: true)

  // 메타 정보
  model?: string;            // 사용 모델
  account?: string;          // 계정 이메일
  apiKey?: string;           // API 키 (마스킹됨)

  // Activity Log (apiType === 'activity_log')
  logAction?: string;        // 로그 메시지
  logType?: string;          // 'info' | 'success' | 'error' | 'warning' | 'login'

  // Heartbeat (apiType === 'heartbeat')
  baseUrl?: string;          // 에이전트 base URL

  // 부가 정보
  userName?: string;         // 사용자 이름
}
```

#### Response

```typescript
{ success: boolean }
```

### POST /api/stats/check-manual

에이전트 상태를 수동으로 체크합니다.

#### Request Body

```typescript
{ agentId: string }
```

#### Response

```typescript
{ success: boolean }
```

---

## 체크리스트 요약

```
□ Step 1: Database 설정
  □ agents 테이블에 레코드 추가
  □ api_breakdown에 API 타입 추가

□ Step 2: statsService 구현
  □ trackApiCall 함수
  □ sendActivityLog 함수
  □ sendHeartbeat 함수

□ Step 3: Health Endpoint 구현
  □ GET /api/health → 200 OK

□ Step 4: API Route에 Tracking 추가
  □ 모든 호출에 await 사용!

□ Step 5: Dashboard UI 수정
  □ Task Performance 항목 추가
  □ mockData.js에 에이전트 추가

□ Step 6: 환경 변수 설정
  □ Vercel에 DASHBOARD_API_URL 등 설정

□ Step 7: 배포 및 검증
  □ Health check 테스트
  □ 로그 저장 테스트
  □ Dashboard UI 확인
```

---

*Last Updated: 2026-02-11*
