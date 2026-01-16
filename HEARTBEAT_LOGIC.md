# 에이전트 Heartbeat 체크 로직 정리

## 개요
에이전트의 생존 상태를 확인하고 Dashboard에 보고하는 heartbeat 메커니즘입니다.

## 현재 구현 상태

### 1. 에이전트 → Dashboard (Heartbeat 전송)

#### 위치
- `world_quotation/backend/src/services/statsService.js`
- `world_quotation/backend/src/index.js`

#### 동작 방식

**서버 시작 시 (1회)**
```javascript
// index.js:92
startHeartbeat(PORT);
```
- 서버가 시작될 때 한 번만 heartbeat를 전송합니다
- `sendHeartbeat()` 함수를 호출하여 Dashboard에 등록

**수동 전송**
```javascript
// statsService.js:145
sendManualHeartbeat(port)
```
- 필요 시 수동으로 heartbeat를 전송할 수 있습니다
- 현재는 명시적으로 호출하는 곳이 없습니다

#### 전송 데이터
```javascript
{
  agentId: 'agent-worldlocker-001',
  apiType: 'heartbeat',
  baseUrl: 'http://localhost:3001',
  model: MODEL_NAME,
  account: 'admin@worldlocker.com',
  apiKey: 'sk-...',
  shouldCountApi: false,
  shouldCountTask: false
}
```

#### 전송 대상
- `POST /api/stats` (Dashboard API)
- 환경변수: `DASHBOARD_API_URL` 또는 기본값 `http://localhost:5001/api/stats`

---

### 2. Dashboard → 에이전트 (Heartbeat 수신 및 처리)

#### 위치
- `Dashboard/api/stats.js` (Vercel Serverless)
- `Dashboard/server.js` (로컬 개발 서버)

#### 처리 로직

**1. Heartbeat 수신** (`api/stats.js:80-143`)
```javascript
if (apiType === 'heartbeat') {
  // 1. agents 테이블 업데이트
  - last_active: 현재 시간
  - model: 모델 정보
  - base_url: 에이전트 URL
  - status: 'online'
  
  // 2. activity_logs에 기록
  - action: "Heartbeat - {agentName}"
  - type: 'heartbeat'
  - status: 'success'
  - timestamp: 현재 시간
}
```

**2. 상태 업데이트**
- `last_active` 필드가 업데이트되어 최근 활동 시간이 기록됩니다
- `status`가 'online'으로 설정됩니다
- Supabase Realtime을 통해 프론트엔드에 자동으로 반영됩니다

---

### 3. 수동 Health Check (Dashboard → 에이전트)

#### 위치
- `Dashboard/api/stats/check-manual.js` (Vercel Serverless)
- `Dashboard/server.js:140-298` (로컬 개발 서버)

#### 동작 방식

**1. Health Check 실행**
```javascript
POST /api/stats/check-manual
Body: { agentId: 'agent-worldlocker-001' }
```

**2. 체크 프로세스**
1. Supabase에서 에이전트 정보 조회
2. `base_url`이 없으면 Mock 체크로 간주하고 통과
3. Health Check: `GET ${base_url}/api/quote/health`
   - 타임아웃: 5초
   - 실패 시: `status = 'offline'`, `api_status = 'error'`
4. API Verify: `POST ${base_url}/api/quote/verify-api`
   - 타임아웃: 5초
   - 실패 시: `api_status = 'error'`
5. Supabase 업데이트:
   - `status`: 'online' 또는 'offline'
   - `api_status`: 'healthy' 또는 'error'
   - `last_active`: 현재 시간
6. **성공 시 Heartbeat 전송**
   - Health check가 성공하면 자동으로 heartbeat를 전송합니다
   - 이는 `last_active` 업데이트와 activity log 기록을 보장합니다

---

## 문제점 및 개선 사항

### ⚠️ 현재 문제점

1. **주기적 Heartbeat 전송 없음**
   - 현재는 서버 시작 시 1회만 전송
   - 에이전트가 계속 실행 중이어도 주기적으로 heartbeat를 보내지 않음
   - Dashboard는 `last_active`를 기반으로 에이전트 상태를 추정해야 함

2. **자동 재연결 없음**
   - 네트워크 오류나 일시적 장애 시 자동으로 재시도하지 않음
   - Dashboard가 down 상태일 때 에이전트는 조용히 실패

3. **타이밍 불명확**
   - 언제 heartbeat를 보내야 하는지 명확한 주기가 없음
   - Health check는 수동 트리거만 가능

### 💡 개선 제안

1. **주기적 Heartbeat 전송 추가**
   ```javascript
   // statsService.js에 추가
   export function startHeartbeat(port) {
     // 즉시 1회 전송
     sendHeartbeat(baseUrl);
     
     // 주기적 전송 (예: 30초마다)
     setInterval(() => {
       sendHeartbeat(baseUrl);
     }, 30000);
   }
   ```

2. **Heartbeat 주기 설정**
   - 권장: 30초 ~ 1분마다
   - 너무 짧으면: 불필요한 트래픽
   - 너무 길면: 에이전트 다운 감지가 늦음

3. **자동 재시도 로직**
   - 실패 시 exponential backoff로 재시도
   - Dashboard가 복구되면 자동으로 재연결

4. **Health Check 자동화**
   - Dashboard에서 주기적으로 health check 실행
   - 예: 5분마다 모든 에이전트 체크

---

## Heartbeat 체크 시점 요약

| 시점 | 위치 | 설명 |
|------|------|------|
| **서버 시작 시** | `index.js:92` | 에이전트 서버가 시작될 때 1회 전송 |
| **수동 체크 후** | `check-manual.js:153-185` | Health check 성공 시 자동으로 heartbeat 전송 |
| **수동 호출** | `statsService.js:145` | `sendManualHeartbeat()` 함수로 수동 전송 가능 (현재 사용 안 함) |

---

## 데이터베이스 스키마

### `agents` 테이블 업데이트
- `last_active`: 마지막 heartbeat 시간
- `status`: 'online', 'offline', 'error', 'processing'
- `api_status`: 'healthy', 'error'
- `model`: 사용 중인 모델
- `base_url`: 에이전트 서버 URL

### `activity_logs` 테이블 기록
- `agent_id`: 에이전트 ID
- `action`: "Heartbeat - {agentName}"
- `type`: 'heartbeat'
- `status`: 'success'
- `timestamp`: heartbeat 시간
- `response_time`: 0 (heartbeat는 통계에 포함 안 함)

---

## 관련 파일 목록

### 에이전트 측 (world_quotation)
- `backend/src/services/statsService.js` - Heartbeat 전송 로직
- `backend/src/index.js` - 서버 시작 시 heartbeat 호출

### Dashboard 측
- `api/stats.js` - Heartbeat 수신 및 처리 (Vercel Serverless)
- `api/stats/check-manual.js` - 수동 Health Check (Vercel Serverless)
- `server.js` - 로컬 개발 서버 (동일한 로직)
- `src/services/agentService.js` - 프론트엔드에서 사용하는 서비스

---

## 결론

현재 heartbeat는 **서버 시작 시 1회만 전송**되며, 이후에는 **수동 health check 시에만** heartbeat가 전송됩니다.

**권장 사항:**
- 주기적 heartbeat 전송 추가 (30초 ~ 1분 간격)
- Dashboard에서 주기적 health check 자동화 (5분 간격)
- 자동 재연결 및 재시도 로직 구현
