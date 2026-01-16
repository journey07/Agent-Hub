# 에이전트 카드 버튼 로직 분석

## 📋 개요

에이전트 카드의 **상태 체크 버튼**과 **전원 토글** 버튼의 활성화/비활성화 조건을 분석한 문서입니다.

---

## 🔍 1. 상태 체크 버튼 (Status Check Button)

### 위치
- `AgentCard.jsx` 103-116줄

### 버튼 표시 조건
```jsx
{(agent.status === 'online' || agent.status === 'offline') ? (
    // 버튼 표시
) : (
    // 상태 표시만 (버튼 없음)
)}
```

**버튼이 표시되는 경우:**
- ✅ `agent.status === 'online'`
- ✅ `agent.status === 'offline'`

**버튼이 표시되지 않는 경우:**
- ❌ `agent.status === 'processing'` → "PROCESSING" 텍스트만 표시
- ❌ `agent.status === 'error'` → "ERROR" 텍스트만 표시

### 버튼 클릭 가능 여부 (disabled 조건)

```jsx
disabled={isChecking || !agent.isLiveAgent}
```

**클릭 가능한 경우:**
- ✅ `isChecking === false` (체크 중이 아님)
- ✅ `agent.isLiveAgent === true` (실제 에이전트, `base_url`이 있음)

**클릭 불가능한 경우:**
- ❌ `isChecking === true` (현재 체크 진행 중)
- ❌ `agent.isLiveAgent === false` (Mock 에이전트, `base_url`이 없음)

### 추가 가드 로직

```jsx
const handleCheck = async () => {
    if (!agent.isLiveAgent || isChecking) return;  // 이중 체크
    // ... 체크 로직 실행
};
```

### 동작 흐름

1. **버튼 클릭** → `handleCheck()` 호출
2. **가드 체크**: `!agent.isLiveAgent || isChecking` → 즉시 리턴
3. **API 호출**: `/api/stats/check-manual` (POST)
   - 에이전트의 `/api/quote/health` 엔드포인트 호출
   - 에이전트의 `/api/quote/verify-api` 엔드포인트 호출
4. **결과 표시**: 
   - 성공: "연결 확인" (3초 후 사라짐)
   - 실패: "연결 실패" 또는 에러 메시지 (3초 후 사라짐)

---

## ⚡ 2. 전원 토글 버튼 (Power Toggle)

### 위치
- `AgentCard.jsx` 69-73줄

### 토글 상태 (checked)

```jsx
checked={agent.status === 'online' || agent.status === 'processing'}
```

**ON 상태 (checked=true):**
- ✅ `agent.status === 'online'`
- ✅ `agent.status === 'processing'`

**OFF 상태 (checked=false):**
- ❌ `agent.status === 'offline'`
- ❌ `agent.status === 'error'`

### 토글 비활성화 조건 (disabled)

```jsx
disabled={agent.status === 'error'}
```

**클릭 가능한 경우:**
- ✅ `agent.status === 'online'`
- ✅ `agent.status === 'offline'`
- ✅ `agent.status === 'processing'`

**클릭 불가능한 경우:**
- ❌ `agent.status === 'error'` → 에러 상태에서는 토글 불가

### Toggle 컴포넌트 내부 가드

```jsx
const handleChange = async () => {
    if (disabled || isLoading || loading) return;  // 추가 가드
    // ... 토글 로직 실행
};
```

### 동작 흐름

#### Live Agent (baseUrl이 있는 경우)

1. **토글 클릭** → `toggleAgent(agentId)` 호출
2. **에이전트 API 호출**: `${agent.baseUrl}/api/quote/agent-toggle` (POST)
3. **응답 처리**: 에이전트가 반환한 `status` 값으로 Supabase 업데이트
4. **Realtime 구독**을 통해 UI 자동 업데이트

#### Mock Agent (baseUrl이 없는 경우)

1. **토글 클릭** → `toggleAgent(agentId)` 호출
2. **직접 상태 변경**:
   - 현재: `online` 또는 `processing` → `offline`으로 변경
   - 현재: `offline` → `online`으로 변경
3. **Supabase 업데이트**: 직접 상태 변경
4. **Realtime 구독**을 통해 UI 자동 업데이트

---

## 📊 상태별 버튼 동작 요약표

| 에이전트 상태 | 상태 체크 버튼 | 전원 토글 | 비고 |
|------------|------------|---------|------|
| `online` | ✅ 표시 + 클릭 가능* | ✅ ON + 클릭 가능 | *Live Agent인 경우만 |
| `offline` | ✅ 표시 + 클릭 가능* | ✅ OFF + 클릭 가능 | *Live Agent인 경우만 |
| `processing` | ❌ 표시 안 됨 | ✅ ON + 클릭 가능 | "PROCESSING" 텍스트만 |
| `error` | ❌ 표시 안 됨 | ❌ OFF + 클릭 불가 | "ERROR" 텍스트만 |

### 상태 체크 버튼 추가 조건

| 조건 | 클릭 가능 여부 |
|------|-------------|
| `isChecking === true` | ❌ 불가 (체크 진행 중) |
| `agent.isLiveAgent === false` | ❌ 불가 (Mock 에이전트) |
| `agent.status === 'online'` + Live Agent | ✅ 가능 |
| `agent.status === 'offline'` + Live Agent | ✅ 가능 |

---

## 🔗 관련 파일

### 프론트엔드
- `src/features/agents/components/AgentCard.jsx` - 버튼 UI 및 클릭 핸들러
- `src/features/agents/AgentListPage.jsx` - 상태 체크 래퍼 함수
- `src/context/AgentContext.jsx` - `toggleAgent`, `checkAgentHealth` 구현
- `src/services/agentService.js` - `checkAgentHealth` 서비스 함수
- `src/components/common/Toggle.jsx` - 토글 컴포넌트

### 백엔드 API
- `api/stats/check-manual.js` - 수동 상태 체크 엔드포인트
- `world_quotation/backend/api/quote/agent-toggle.js` - 에이전트 전원 토글 엔드포인트
- `world_quotation/backend/api/quote/agent-status.js` - 에이전트 상태 변경 엔드포인트

---

## 💡 주요 로직 포인트

### 1. 상태 체크 버튼
- **Live Agent만 가능**: Mock 에이전트(`base_url` 없음)는 체크 불가
- **processing/error 상태에서는 버튼 자체가 표시되지 않음**
- **체크 중에는 중복 클릭 방지** (`isChecking` 플래그)

### 2. 전원 토글
- **error 상태에서는 토글 불가** (에러 해결 후 수동으로 상태 변경 필요)
- **Live Agent**: 에이전트 자체 API를 통해 상태 변경
- **Mock Agent**: Supabase에서 직접 상태 변경

### 3. 실시간 업데이트
- 모든 상태 변경은 **Supabase Realtime 구독**을 통해 자동 반영
- 별도의 수동 새로고침 불필요

---

## 🐛 예외 상황

### 상태 체크 실패 시
- 네트워크 오류: "체크 실패" 메시지 표시 (3초)
- 타임아웃: 10초 후 "요청 시간이 초과되었습니다" 메시지
- API 오류: "연결 실패" 또는 에러 메시지 표시

### 전원 토글 실패 시
- Live Agent API 호출 실패: 콘솔에 에러 로그만 출력 (UI는 변경 안 됨)
- Supabase 업데이트 실패: Realtime 구독이 실패할 수 있음

---

## 📝 코드 참조

### 상태 체크 버튼 disabled 조건
```jsx
// AgentCard.jsx:106
disabled={isChecking || !agent.isLiveAgent}
```

### 전원 토글 disabled 조건
```jsx
// AgentCard.jsx:72
disabled={agent.status === 'error'}
```

### 상태 체크 버튼 표시 조건
```jsx
// AgentCard.jsx:102
{(agent.status === 'online' || agent.status === 'offline') ? (
    // 버튼 표시
) : (
    // 상태만 표시
)}
```
