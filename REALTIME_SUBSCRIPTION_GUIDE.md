# Supabase Realtime Subscription 상세 가이드

## 📡 전체 아키텍처

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │────────▶│   Supabase   │◀────────│  Supabase   │
│  (Vercel)   │ WebSocket│   Realtime   │         │  Database   │
│             │         │   Server     │         │ (PostgreSQL)│
└─────────────┘         └──────────────┘         └─────────────┘
       │                                              ▲
       │                                              │
       │                                              │
       │         ┌──────────────┐                    │
       │         │   Vercel     │                    │
       └────────▶│   API        │────────────────────┘
                 │ /api/stats   │  HTTP POST
                 └──────────────┘
                        ▲
                        │
                 ┌──────┴──────┐
                 │             │
          ┌──────┴───┐   ┌────┴────┐
          │  Agent   │   │ Agent   │
          │ (Render) │   │(Render) │
          └──────────┘   └─────────┘
```

## 🔄 데이터 흐름

### 1. **에이전트 → 데이터베이스 (로그 생성)**

```
Agent (Render) 
  → POST /api/stats (Vercel Serverless Function)
  → Supabase Database INSERT
  → PostgreSQL Write-Ahead Log (WAL)
  → Supabase Realtime Server 감지
```

**경로:**
- **Agent (Render)** → **Vercel API** → **Supabase DB**
- **속도 영향 요소:**
  - Render → Vercel 네트워크 지연 (보통 50-200ms)
  - Vercel Serverless Function 실행 시간 (50-300ms)
  - Supabase DB 쓰기 시간 (10-50ms)
  - **총 지연: 110-550ms**

### 2. **데이터베이스 → 브라우저 (실시간 업데이트)**

```
Supabase Database 변경
  → PostgreSQL WAL (Write-Ahead Log)
  → Supabase Realtime Server (Elixir/Phoenix)
  → WebSocket 연결 (브라우저)
  → React 상태 업데이트
```

**경로:**
- **Supabase DB** → **Supabase Realtime Server** → **Browser (WebSocket)**
- **속도 영향 요소:**
  - WAL 읽기 시간 (1-5ms)
  - Realtime Server 처리 시간 (5-20ms)
  - WebSocket 전송 시간 (10-50ms, 네트워크에 따라)
  - **총 지연: 16-75ms**

## 🚀 Realtime Subscription 작동 원리

### 1. **WebSocket 연결 설정**

```javascript
// 프론트엔드 (src/context/AgentContext.jsx)
const channel = supabase
  .channel('dashboard-realtime')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'activity_logs'
  }, (payload) => {
    // 새 로그가 추가되면 즉시 실행
    setActivityLogs(prev => [newLog, ...prev]);
  })
  .subscribe();
```

**연결 과정:**
1. 브라우저가 Supabase Realtime 서버에 WebSocket 연결 시도
2. Supabase 인증 (JWT 토큰 검증)
3. 구독 요청 전송 (어떤 테이블/이벤트를 구독할지)
4. Supabase가 PostgreSQL의 WAL을 모니터링 시작
5. 연결 성공 → `SUBSCRIBED` 상태

### 2. **PostgreSQL WAL (Write-Ahead Log)**

Supabase Realtime은 PostgreSQL의 **WAL (Write-Ahead Log)**을 사용합니다:

- 모든 데이터베이스 변경사항이 WAL에 기록됨
- Realtime 서버가 WAL을 실시간으로 읽음
- 변경사항을 감지하면 WebSocket으로 브라우저에 전송

**장점:**
- ✅ 데이터베이스 레벨에서 변경 감지 (애플리케이션 코드 불필요)
- ✅ 매우 빠른 감지 (WAL은 거의 실시간)
- ✅ 트랜잭션 보장

### 3. **이벤트 필터링**

```javascript
.on('postgres_changes', {
  event: 'INSERT',        // INSERT, UPDATE, DELETE, 또는 '*' (모두)
  schema: 'public',       // 스키마 이름
  table: 'activity_logs' // 테이블 이름
}, callback)
```

**필터 옵션:**
- `event`: 특정 이벤트 타입만 구독
- `schema`: 특정 스키마만
- `table`: 특정 테이블만
- 추가 필터: `filter` 옵션으로 특정 조건만 구독 가능

## 🌐 서버 경로 분석

### **Vercel vs Render 역할**

#### **Vercel (프론트엔드 + API)**
- **프론트엔드**: React 앱 배포
- **API**: `/api/stats.js` Serverless Function
- **역할**: 
  - 에이전트로부터 통계 데이터 수신
  - Supabase DB에 데이터 저장
  - **Realtime과 직접 연결 없음** (브라우저가 직접 연결)

#### **Vercel WebSocket 지원 여부**
- ❌ **Vercel은 WebSocket 서버를 지원하지 않습니다**
  - Serverless Functions는 stateless이고 짧은 실행 시간만 지원
  - WebSocket은 장기 연결이 필요한데, Vercel의 서버리스 모델과 맞지 않음
- ✅ **하지만 문제 없습니다!**
  - Supabase Realtime은 **브라우저에서 직접 Supabase Realtime 서버에 WebSocket 연결**
  - Vercel을 거치지 않으므로 Vercel의 WebSocket 지원 여부는 중요하지 않음
  - 브라우저 → Supabase Realtime (직접 WebSocket 연결)

#### **Render (에이전트 백엔드)**
- **역할**: 
  - 실제 비즈니스 로직 실행 (견적 생성, 이미지 생성 등)
  - Vercel API로 통계 전송
  - **Realtime과 직접 연결 없음**

#### **Supabase (데이터베이스 + Realtime)**
- **PostgreSQL**: 데이터 저장
- **Realtime Server**: WebSocket 서버 (별도 인프라)
- **역할**:
  - 데이터베이스 변경 감지
  - WebSocket으로 브라우저에 실시간 전송

### **실제 데이터 경로**

```
1. 로그 생성:
   Agent (Render) 
   → HTTP POST → Vercel API (/api/stats)
   → Supabase DB INSERT
   
2. 실시간 업데이트:
   Supabase DB 변경
   → WAL 감지
   → Supabase Realtime Server
   → WebSocket → Browser (Vercel에 배포된 프론트엔드)
```

**중요:** Realtime은 **브라우저가 Supabase에 직접 WebSocket 연결**하므로, Vercel이나 Render를 거치지 않습니다!

## ⚡ 속도에 영향을 주는 요소

### 1. **네트워크 지연**

#### **에이전트 → Vercel API**
- Render → Vercel: **50-200ms** (지리적 거리, 네트워크 품질)
- Vercel Serverless Cold Start: **0-1000ms** (첫 요청 시)

#### **Supabase Realtime → Browser**
- Supabase Realtime Server 위치: 보통 **미국 동부/서부**
- 한국 → 미국: **150-300ms** (WebSocket 지연)
- 같은 리전: **10-50ms**

**최적화:**
- Supabase 프로젝트를 한국과 가까운 리전에 생성 (현재는 불가능, Supabase는 특정 리전만 지원)
- Vercel API를 Supabase와 같은 리전에 배포

### 2. **데이터베이스 성능**

#### **INSERT 속도**
- 단순 INSERT: **10-50ms**
- 인덱스 업데이트: **추가 5-20ms**
- 트리거 실행: **추가 10-100ms** (복잡도에 따라)

#### **WAL 읽기 속도**
- WAL 읽기: **1-5ms** (매우 빠름)
- Realtime 서버 처리: **5-20ms**

### 3. **WebSocket 연결 품질**

#### **연결 상태**
- **안정적**: 지연 10-50ms
- **불안정**: 지연 100-500ms, 재연결 필요
- **끊김**: Fallback polling으로 전환 (30초마다)

#### **메시지 크기**
- 작은 payload (<1KB): **10-50ms**
- 큰 payload (>10KB): **50-200ms**

### 4. **브라우저 처리 속도**

#### **React 렌더링**
- 상태 업데이트: **1-10ms**
- 컴포넌트 리렌더링: **10-100ms** (복잡도에 따라)
- 차트 업데이트: **50-200ms** (Recharts)

## 📊 실제 지연 시간 분석

### **전체 파이프라인 (로그 생성 → UI 업데이트)**

```
Agent (Render) 
  → Vercel API: 50-200ms
  → Supabase DB INSERT: 10-50ms
  → WAL 감지: 1-5ms
  → Realtime Server: 5-20ms
  → WebSocket 전송: 10-50ms (한국 기준 150-300ms)
  → React 업데이트: 1-10ms
  → UI 렌더링: 10-100ms

총 지연: 87-435ms (한국 기준: 227-735ms)
```

### **최적화된 시나리오 (같은 리전)**

```
Agent → Vercel API: 10-50ms
→ Supabase DB: 10-50ms
→ Realtime: 5-20ms
→ WebSocket: 10-50ms
→ React: 1-10ms

총 지연: 36-180ms
```

### **정상 지연 시간 기준**

| 시나리오 | 예상 지연 | 정상 여부 |
|---------|----------|----------|
| **최적 (같은 리전)** | 36-180ms | ✅ 매우 빠름 |
| **한국 기준 (일반)** | 227-735ms | ✅ 정상 |
| **네트워크 불안정** | 500-1000ms | ⚠️ 느리지만 허용 가능 |
| **1초 이상** | >1000ms | ❌ 문제 있음 (재연결 필요) |

**결론:**
- ✅ **1초 이내면 정상** (대부분의 경우 200-700ms)
- ⚠️ **1-2초면 느리지만 허용 가능** (네트워크 지연 가능)
- ❌ **2초 이상이면 문제** (Realtime 연결 끊김 또는 네트워크 문제)

### **실제 측정 방법**

브라우저 콘솔에서 다음 코드로 측정 가능:

```javascript
// AgentContext.jsx의 Realtime subscription에 추가
.on('postgres_changes', {
  event: 'INSERT',
  table: 'activity_logs'
}, (payload) => {
  const receivedTime = Date.now();
  const logTime = new Date(payload.new.timestamp).getTime();
  const delay = receivedTime - logTime;
  console.log(`⏱️ 지연 시간: ${delay}ms`);
  
  if (delay > 1000) {
    console.warn(`⚠️ 지연이 1초를 초과했습니다: ${delay}ms`);
  }
})
```

## 🔧 성능 최적화 팁

### 1. **Realtime 구독 최적화**

```javascript
// ❌ 나쁜 예: 모든 이벤트 구독
.on('postgres_changes', { event: '*', table: '*' })

// ✅ 좋은 예: 필요한 이벤트만 구독
.on('postgres_changes', { 
  event: 'INSERT',  // INSERT만
  table: 'activity_logs'  // 특정 테이블만
})
```

### 2. **Payload 크기 최소화**

```javascript
// ❌ 나쁜 예: 전체 행 구독
.on('postgres_changes', { table: 'agents' })

// ✅ 좋은 예: 필요한 컬럼만 선택 (현재는 불가능, 항상 전체 행)
// 대신 프론트엔드에서 필요한 데이터만 사용
```

### 3. **Debouncing/Batching**

```javascript
// ✅ 여러 업데이트를 묶어서 처리
const queueAgentUpdate = useCallback((agentId) => {
  updateQueueRef.current.add(agentId);
  clearTimeout(updateTimerRef.current);
  updateTimerRef.current = setTimeout(async () => {
    // 300ms 동안 모아서 한 번에 처리
    await Promise.all(agentIds.map(id => updateSingleAgent(id)));
  }, 300);
}, []);
```

### 4. **연결 상태 모니터링**

```javascript
.subscribe((status, err) => {
  if (status === 'SUBSCRIBED') {
    // Realtime 연결됨 → polling 비활성화
    setIsConnected(true);
  } else if (status === 'CLOSED') {
    // Realtime 끊어짐 → fallback polling 활성화
    setIsConnected(false);
  }
});
```

## 🐛 문제 해결

### **로그가 업데이트되지 않는 경우**

1. **Realtime 구독 확인**
   ```sql
   -- Supabase SQL Editor에서 실행
   SELECT * FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime';
   ```
   - `activity_logs` 테이블이 목록에 있어야 함

2. **브라우저 콘솔 확인**
   - "⚡⚡⚡ 실시간 로그 이벤트 수신!" 메시지 확인
   - WebSocket 연결 상태 확인

3. **네트워크 탭 확인**
   - WebSocket 연결이 `wss://[project].supabase.co/realtime/v1/websocket`로 되어 있는지
   - 연결 상태가 `101 Switching Protocols`인지

4. **Fallback 확인**
   - Realtime이 끊어지면 자동으로 30초마다 polling으로 전환
   - `isConnected` 상태 확인

## 📝 요약

### **Realtime Subscription 특징**

1. **직접 연결**: 브라우저 ↔ Supabase Realtime (Vercel/Render 거치지 않음)
2. **WAL 기반**: PostgreSQL WAL을 실시간으로 모니터링
3. **WebSocket**: 지속적인 양방향 연결
4. **자동 재연결**: 연결이 끊어지면 자동으로 재시도

### **속도 영향 요소**

1. **지리적 거리**: Supabase 서버 위치와 사용자 위치
2. **네트워크 품질**: 인터넷 연결 상태
3. **데이터베이스 성능**: INSERT 속도, 인덱스, 트리거
4. **브라우저 성능**: React 렌더링 속도

### **최적화 전략**

1. 필요한 이벤트만 구독
2. Debouncing으로 여러 업데이트 묶기
3. Realtime 연결 상태 모니터링
4. Fallback polling으로 안정성 확보
