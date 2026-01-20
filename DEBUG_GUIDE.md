# Troubleshooting: Database Storage Failure

데이터가 DB에 저장되지 않을 때 체크해야 할 주요 포인트들입니다.

## 1. 서버 실행 여부 확인
현재 시스템에서 `node_modules`를 삭제 중이거나 재설치 중이라면 **Brain Server (`server.js`)**가 중지되어 있을 가능성이 큽니다. 서버가 실행 중인지 먼저 확인하세요.

```bash
ps aux | grep server.js
```

## 2. Supabase 설정 및 권한 문제 (가장 유력)
`.env.local` 파일을 확인한 결과, **`SUPABASE_SERVICE_ROLE_KEY`**가 누락되어 있습니다.

> [!IMPORTANT]
> 현재 시스템은 `SUPABASE_ANON_KEY`와 시스템 계정 로그인(`steve@dashboard.local`)을 통한 우회 방식을 사용하고 있습니다. 이 방식은 세션 만료나 권한 설정 오류에 취약합니다.

**해결 방법:**
1. Supabase 대시보드 (Settings -> API)에서 `service_role` 세크리트 키를 가져옵니다.
2. `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY=your_key_here`를 추가합니다.
3. 이렇게 하면 RLS(Row Level Security)를 우회하여 백엔드에서 안정적으로 DB에 접근할 수 있습니다.

## 3. 에이전트 설정 확인 (world_quotation)
에이전트가 올바른 주소로 신호를 보내고 있는지 확인해야 합니다.

- 에이전트의 `.env` 파일 내 `DASHBOARD_API_URL`이 `http://localhost:5001/api/stats` (또는 실제 서버 주소)로 정확히 설정되어 있는지 확인하세요.
- 에이전트 서버가 시작될 때 로그에 `✅ Dashboard stats initialized` 또는 `✅ Heartbeat sent to Dashboard` 메시지가 뜨는지 확인하세요.

## 4. 에이전트 ID 일치 여부
DB의 `agents` 테이블에 등록된 `id`와 에이전트가 보내는 `agentId`가 일치해야 합니다.
- 현재 DB에는 `agent-worldlocker-001` (견적 에이전트)이 등록되어 있습니다. 에이전트 소스 코드에서 이 ID를 사용하고 있는지 확인하세요.

## 5. JWT 세션 만료
현재 방식(Anon Key + Login)을 사용할 경우, 서버가 장시간 켜져 있으면 로그인이 만료되어 `401 Unauthorized` 에러가 발생할 수 있습니다. `SUPABASE_SERVICE_ROLE_KEY`를 사용하면 이 문제를 근본적으로 해결할 수 있습니다.

---

### 체크리스트
- [ ] `SUPABASE_SERVICE_ROLE_KEY`가 `.env.local`에 있는가?
- [ ] Brain Server (`server.js`)가 실행 중인가? (5001 포트)
- [ ] 에이전트 서버가 실행 중이며 신호를 보내고 있는가?
- [ ] Supabase Auth에 시스템 계정(`steve@dashboard.local`)이 실제로 존재하는가? (Service Role Key 미사용 시)
