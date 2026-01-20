# Dashboard & Agent Monitoring System Architecture Guide

이 가이드는 Dashboard와 Agent들이 소통하는 방식, 전체적인 시스템 구조(Frontend, Backend, DB), 그리고 새로운 에이전트를 추가할 때 확장성, 호환성, 성능 및 최적화를 보장하기 위한 가이드라인을 제공합니다.

---

## 🏗 전체 시스템 구조 (System Overview)

시스템은 **Dashboard (Monitoring Center)**와 **Agents (Distributed Workers)** 두 가지 주요 영역으로 나뉩니다.

### 1. Dashboard (The brain)
*   **Frontend**: React (Vite) 기반 SPA. Supabase Client를 통해 DB에 직접 쿼리하거나 Realtime 구독을 통해 데이터를 즉시 업데이트합니다.
*   **Backend (Brain Server)**: Node.js/Express 서버. 에이전트들로부터 텔레메트리(통계 및 로그)를 수신하고 Supabase에 저장하는 게이트웨이 역할을 합니다.
*   **Database**: Supabase (PostgreSQL). 에이전트 메타데이터, 로그, 시계열 통계 데이터를 저장합니다.

### 2. Agents (The workers)
*   **Integration**: 각 에이전트는 `statsService.js`를 내장하여 자신의 활동을 Dashboard에 보고합니다.
*   **Heartbeat & Status**: 자신의 상태(온라인/오프라인)와 가용 모델, API 키 상태 등을 주기적으로 보고합니다.

---

## 📡 소통 방식 (Communication Patterns)

Dashboard와 Agent는 크게 **Push 방식**과 **Pull 방식** 두 가지로 소통합니다.

### 1. Agent ➞ Dashboard (Push: Telemetry)
에이전트가 Dashboard의 `/api/stats` 엔드포인트로 `POST` 요청을 보내 활동을 보고합니다.

*   **Heartbeat**: 서버 시작 시 및 주기적으로 전송. 에이전트를 등록하고 활성 상태를 알립니다.
*   **API/Task Tracking**: 특정 기능(예: 견적 생성, 이미지 업로드)이 실행될 때마다 호출하여 통계를 업데이트합니다.
*   **Activity Logging**: 중요한 이벤트(예: 로그인, 오류 발생)를 사람이 읽을 수 있는 로그 형태로 전송합니다.

### 2. Dashboard ➞ Agent (Pull: Health Check)
Dashboard 서버가 에이전트의 `base_url`로 직접 연결을 시도하여 상태를 확인합니다.

*   **/api/quote/health**: 에이전트 서버의 생존 여부 확인.
*   **/api/quote/verify-api**: 에이전트가 사용하는 외부 API(예: Gemini)가 올바르게 작동하는지 확인.

---

## 💾 데이터베이스 구조 (Database Schema)

Supabase 내의 주요 테이블 및 역할은 다음과 같습니다.

| 테이블명 | 역할 | 주요 컬럼 |
| :--- | :--- | :--- |
| `agents` | 에이전트 메타데이터 및 요약 통계 | `id`, `status`, `last_active`, `total_api_calls`, `base_url` |
| `activity_logs` | 에이전트 활동 이력 (Event-based) | `agent_id`, `action`, `type`, `status`, `response_time`, `user_name` |
| `daily_stats` | 일 단위 누적 통계 (Time-series) | `agent_id`, `date`, `tasks`, `api_calls`, `breakdown` (JSONB) |
| `hourly_stats` | 시간 단위 활동 데이터 (Graph용) | `agent_id`, `hour`, `tasks`, `api_calls`, `updated_at` |
| `api_breakdown` | API 타입별 상세 사용량 | `agent_id`, `api_type`, `today_count`, `total_count` |

> [!TIP]
> **성능 최적화**: 통계 데이터의 원자적(Atomic) 업데이트를 위해 PostgreSQL의 **RPC (Stored Function)**인 `update_agent_stats`를 사용합니다. 이는 여러 테이블에 대한 업데이트를 하나의 트랜잭션으로 처리하여 데이터 무결성을 보장합니다.

---

## 🚀 에이전트 확장 및 매핑 가이드라인 (Integration Guide)

새로운 에이전트를 추가할 때 아래 가이드라인을 준수하여 확장성과 호환성을 확보하십시오.

### 1. 에이전트 아이디 정의
*   `agent-[project]-[sequence]` 형식의 고유 ID를 부여하십시오. (예: `agent-worldlocker-002`)

### 2. 필수 보고 기능 구현 (statsService.js)
새 에이전트는 Dashboard Brain Server (`/api/stats`)와 통신할 수 있는 클래스/모듈을 포함해야 합니다.

```javascript
// 필수 Payload 구조
{
  agentId: "agent-id-001",
  apiType: "api_call", // heartbeat, activity_log, status_change
  responseTime: 1500,  // ms
  isError: false,
  shouldCountTask: true,
  logMessage: "Human readable message",
  userName: "Active User Name"
}
```

### 3. 상태 관리 및 자동 복구
*   **Heartbeat**: 서버 시작 시 Dashboard에 `base_url`을 포함한 하트비트를 보내 자동 등록되게 하십시오.
*   **Error Handling**: Dashboard 서버가 다운되어 보고가 실패하더라도 에이전트의 주 기능에는 영향이 없도록 **Silent Fail** 처리해야 합니다.

### 4. 성능 및 최적화 전략
*   **Batching**: 로그 데이터가 너무 빈번하다면 메모리에 쌓아두었다가 한 번에 보내는 방식을 고려하십시오.
*   **Selective Loading**: Dashboard UI에서는 `getAllAgents` 호출 시 `Promise.all`을 사용하여 관련 데이터를 병렬로 가져와 N+1 쿼리 문제를 방지하고 있습니다. 새로운 필드 추가 시에도 성능을 고려한 배칭 쿼리를 사용하십시오.

---

## 🚢 배포 및 인프라 관리 (Deployment & Infrastructure)

Dashboard와 Agent 시스템은 **Vercel**과 **Render** 두 플랫폼을 전략적으로 활용하여 최적의 성능과 안정성을 확보합니다.

### 배포 플랫폼 구성

#### Vercel (Dashboard 핵심)
*   **배포 대상**: Dashboard Frontend (React) + Brain Server API
*   **핵심 설정**: `vercel.json`
    ```json
    {
      "regions": ["icn1"],  // 서울 리전
      "rewrites": [
        { "source": "/(.*)", "destination": "/index.html" }
      ]
    }
    ```
*   **장점**:
    *   서울 리전(icn1) 지원으로 한국 사용자에게 초저지연 제공 (약 50ms)
    *   프론트엔드와 API가 동일 도메인에서 제공되어 CORS 설정 간소화
    *   서버리스 구조로 인프라 관리 부담 최소화
*   **주요 역할**: 사용자 인증, 통계 수집, 실시간 모니터링 UI 제공

#### Render (Agent 백엔드)
*   **배포 대상**: Agent Backend (world_quotation 등)
*   **핵심 설정**: `render.yaml`
    ```yaml
    services:
      - type: web
        name: world-quotation-backend
        env: node
        buildCommand: npm install
        startCommand: npm start
        healthCheckPath: /health
    ```
*   **장점**:
    *   타임아웃 제한 없이 긴 작업(AI 연산, 파일 생성) 안정적 처리
    *   24시간 상시 구동으로 대시보드의 헬스 체크 요청에 즉시 응답
    *   복잡한 라이브러리(`canvas`, `pdfkit` 등) 안정적 지원
*   **주요 역할**: Gemini AI 연산, 3D 이미지 합성, PDF/Excel 생성

### 배포 전략 비교

| 항목 | Vercel | Render |
| :--- | :--- | :--- |
| **적합한 작업** | 가벼운 API, 인증, 통계 수집 | AI 연산, 파일 생성, 무거운 로직 |
| **응답 속도** | 매우 빠름 (서울 리전) | 보통 (해외 리전) |
| **실행 시간** | 10~30초 제한 | 제한 없음 |
| **관리 방식** | Serverless Functions | Persistent Web Service |
| **비용 구조** | 요청당 과금 | 인스턴스 시간당 과금 |

### 관리 스크립트

**Dashboard (로컬 개발)**
```bash
npm run dev      # Express + Vite 동시 실행 (concurrently)
npm run brain    # Brain Server만 실행 (node --watch)
npm run build    # 프로덕션 빌드
```

**Agent Backend (로컬 개발)**
```bash
npm start        # 프로덕션 모드 실행
npm run dev      # 개발 모드 (node --watch)
```

---

## 🔒 보안 및 권한 (Security)

*   **RLS (Row Level Security)**: 모든 테이블에 RLS가 설정되어 있으며, 서비스 애플리케이션(Backend)은 `service_role`을 사용하고 클라이언트(Frontend)는 익명 또는 인증된 사용자로만 접근하도록 통제됩니다.
*   **API Keywords**: API Key 등 민감 정보는 전체를 노출하지 않고 `sk-...4chars` 형태로 마스킹하여 보고하십시오.

---

이 가이드라인을 준수하면 Dashboard의 일관된 UI에서 모든 에이전트의 상태를 한눈에 모니터링하고 관리할 수 있습니다.
