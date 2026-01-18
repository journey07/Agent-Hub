# 새로운 에이전트 통합 가이드

## 📊 현재 구조 평가

### ✅ **효율적인 부분**

1. **자동 통계 수집**
   - 에이전트가 `/api/stats`에 데이터만 보내면 자동으로 통계 업데이트
   - Supabase Realtime으로 대시보드 자동 반영
   - 별도의 프론트엔드 코드 수정 불필요

2. **표준화된 API 인터페이스**
   - 모든 에이전트가 동일한 API 형식 사용
   - `agentService.js`에서 일관된 데이터 처리

3. **실시간 업데이트**
   - WebSocket 기반 Realtime 구독
   - 에이전트 상태 변경 시 즉시 반영

### ⚠️ **개선이 필요한 부분**

1. **에이전트 초기 등록 프로세스**
   - 현재: Supabase DB에 수동으로 레코드 추가 필요
   - 개선: 자동 등록 API 또는 마이그레이션 스크립트 제공

2. **에이전트 설정 관리**
   - 에이전트별 커스텀 설정 관리 부재
   - 카테고리/타입 구분 없음

3. **문서화 부족**
   - 에이전트 개발자를 위한 통합 가이드 부재
   - API 스펙 문서화 필요

## 🚀 새로운 에이전트 추가 방법

### 방법 1: 수동 DB 등록 (현재 방식)

```sql
-- Supabase SQL Editor에서 실행
INSERT INTO agents (id, name, model, client_name, client_id, status, base_url)
VALUES (
    'agent-yourname-001',  -- 고유 ID
    '에이전트 이름',
    'gpt-4',               -- 모델명
    '클라이언트 이름',
    'client-id',            -- 클라이언트 ID
    'offline',             -- 초기 상태
    'https://your-agent-url.com'  -- 에이전트 URL (선택)
) ON CONFLICT (id) DO NOTHING;
```

### 방법 2: Heartbeat로 자동 등록 (권장)

에이전트가 시작할 때 heartbeat를 보내면 자동으로 등록됩니다:

```javascript
// 에이전트 코드에서
const response = await fetch('https://your-dashboard.com/api/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        agentId: 'agent-yourname-001',
        apiType: 'heartbeat',
        model: 'gpt-4',
        baseUrl: 'https://your-agent-url.com',
        account: 'your-account',
        apiKey: 'your-api-key'
    })
});
```

**주의**: DB에 레코드가 이미 있어야 heartbeat가 작동합니다.

### 방법 3: 자동 등록 API (개선 제안)

향후 개선을 위해 자동 등록 엔드포인트를 추가할 수 있습니다:

```javascript
// /api/agents/register
POST {
    agentId: 'agent-yourname-001',
    name: '에이전트 이름',
    model: 'gpt-4',
    clientName: '클라이언트 이름',
    clientId: 'client-id',
    baseUrl: 'https://your-agent-url.com'
}
```

## 📝 에이전트 개발 가이드

### 필수 구현 사항

1. **Heartbeat 전송** (주기적으로)
```javascript
setInterval(async () => {
    await fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            agentId: 'agent-yourname-001',
            apiType: 'heartbeat',
            model: 'gpt-4',
            baseUrl: 'https://your-agent-url.com'
        })
    });
}, 30000); // 30초마다
```

2. **통계 업데이트 전송** (API 호출 시)
```javascript
await fetch('/api/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        agentId: 'agent-yourname-001',
        apiType: 'calculate',  // 또는 'preview-image', 'generate-3d-installation', 'pdf', 'excel'
        responseTime: 1234,     // 응답 시간 (ms)
        isError: false,
        shouldCountApi: true,
        shouldCountTask: true,
        logMessage: 'Quote calculated successfully'
    })
});
```

3. **상태 변경 알림**
```javascript
await fetch('/api/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        agentId: 'agent-yourname-001',
        apiType: 'status_change',
        status: 'online'  // 또는 'offline', 'processing', 'error'
    })
});
```

### API 타입 종류

- `heartbeat`: 주기적 생존 신호
- `status_change`: 상태 변경
- `calculate`: 견적 계산
- `preview-image`: 2D 레이아웃 이미지 생성
- `generate-3d-installation`: 3D 설치 이미지 생성
- `pdf`: PDF 생성
- `excel`: Excel 파일 생성
- `activity_log`: 일반 활동 로그

## 🔧 개선 제안

### 1. 에이전트 등록 API 추가

```javascript
// api/agents/register.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { agentId, name, model, clientName, clientId, baseUrl } = req.body;

    // 에이전트 등록 또는 업데이트
    const { error } = await supabase
        .from('agents')
        .upsert({
            id: agentId,
            name,
            model,
            client_name: clientName,
            client_id: clientId,
            base_url: baseUrl,
            status: 'offline'
        });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true });
}
```

### 2. 에이전트 설정 관리

```sql
-- agents 테이블에 설정 컬럼 추가
ALTER TABLE agents ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
```

### 3. 통합 가이드 문서화

- 에이전트 SDK/라이브러리 제공
- 예제 코드 템플릿
- 테스트 가이드

## 📈 현재 구조의 효율성 점수

| 항목 | 점수 | 평가 |
|------|------|------|
| 자동 통계 수집 | ⭐⭐⭐⭐⭐ | 매우 효율적 |
| 실시간 업데이트 | ⭐⭐⭐⭐⭐ | 매우 효율적 |
| 초기 등록 프로세스 | ⭐⭐ | 수동 작업 필요 |
| 문서화 | ⭐⭐ | 부족 |
| 확장성 | ⭐⭐⭐⭐ | 좋음 |
| **종합** | **⭐⭐⭐⭐** | **전반적으로 효율적** |

## 🎯 결론

**현재 구조는 새로운 에이전트를 추가하기에 전반적으로 효율적입니다.**

### 장점:
- ✅ 에이전트 개발자는 API만 호출하면 자동으로 통계 수집
- ✅ 대시보드 코드 수정 없이 새 에이전트 추가 가능
- ✅ 실시간 업데이트로 즉시 반영

### 개선 필요:
- ⚠️ 초기 DB 등록을 자동화하면 더욱 편리
- ⚠️ 개발자 가이드 문서화 필요
- ⚠️ 에이전트 설정 관리 기능 추가

### 권장 사항:
1. **단기**: 이 가이드 문서를 README에 추가
2. **중기**: 자동 등록 API 구현
3. **장기**: 에이전트 SDK/라이브러리 제공
