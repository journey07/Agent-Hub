# 🚀 다음 단계 가이드

대시보드가 성공적으로 배포되었습니다! 이제 Supabase 설정과 테스트를 진행하세요.

## ✅ Step 1: Supabase 스키마 적용

### 1-1. Supabase SQL Editor에서 스키마 실행

1. **Supabase Dashboard** 접속: https://app.supabase.com
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭
4. **New Query** 클릭
5. `supabase_schema.sql` 파일의 **전체 내용을 복사**해서 붙여넣기
6. **Run** 버튼 클릭 (또는 `Cmd/Ctrl + Enter`)

> **확인**: 에러 없이 실행되면 성공입니다!
> - `agents`, `api_breakdown`, `daily_stats`, `hourly_stats`, `activity_logs` 테이블 생성
> - RLS 정책 적용
> - `update_agent_stats` 함수 생성
> - 월드 견적 에이전트 시드 데이터 삽입

---

## ✅ Step 2: Supabase Auth에 로그인 계정 생성

### 2-1. Authentication 메뉴에서 사용자 생성

1. Supabase Dashboard에서 **Authentication** > **Users** 메뉴로 이동
2. **Add user** 버튼 클릭
3. **Create new user** 선택
4. 다음 정보 입력:
   - **Email**: `steve@dashboard.local`
   - **Password**: `password123`
   - **Auto Confirm User**: ✅ 체크 (이메일 인증 없이 바로 로그인 가능)
5. **Create user** 클릭

> **왜 필요한가?**: 
> - 서버리스 함수(`/api/stats.js`)가 Supabase에 데이터를 쓰려면 인증된 사용자여야 합니다
> - Service Role Key를 사용하면 이 단계 생략 가능하지만, Anon Key만 사용할 경우 필요합니다

---

## ✅ Step 3: 대시보드 로그인 테스트

### 3-1. 대시보드 접속 및 로그인

1. 배포된 대시보드 URL 접속: `https://your-dashboard.vercel.app`
2. 로그인 페이지에서:
   - **Username**: `steve`
   - **Password**: `password123`
3. 로그인 성공하면 대시보드 메인 화면이 표시됩니다

### 3-2. 확인사항

- ✅ 로그인이 정상적으로 되는가?
- ✅ 에이전트 목록이 표시되는가? (Supabase에 데이터가 있으면)
- ✅ 브라우저 콘솔에 에러가 없는가? (F12 > Console)

---

## ✅ Step 4: Supabase 데이터 확인

### 4-1. Table Editor에서 확인

1. Supabase Dashboard > **Table Editor** 메뉴
2. `agents` 테이블 클릭
3. 월드 견적 에이전트(`agent-worldlocker-001`)가 있는지 확인

### 4-2. 에이전트가 없으면 수동 생성

```sql
INSERT INTO agents (id, name, model, client_name, client_id, status, base_url)
VALUES (
    'agent-worldlocker-001',
    '견적 에이전트',
    'gpt-4',
    'World Locker',
    'client-worldlocker',
    'offline',
    'http://localhost:3001'  -- 나중에 월드 에이전트 배포 후 실제 URL로 업데이트
) ON CONFLICT (id) DO NOTHING;
```

---

## ✅ Step 5: Brain Server (Vercel Function) 테스트

### 5-1. Functions 로그 확인

1. Vercel Dashboard > 프로젝트 > **Functions** 탭
2. `/api/stats` 함수 클릭
3. 최근 호출 로그 확인 (에러가 없어야 함)

### 5-2. 수동 테스트 (선택사항)

브라우저 콘솔에서:

```javascript
// Heartbeat 테스트
fetch('https://your-dashboard.vercel.app/api/stats', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentId: 'agent-worldlocker-001',
    apiType: 'heartbeat',
    model: 'gpt-4',
    baseUrl: 'http://localhost:3001'
  })
})
.then(r => r.json())
.then(console.log);
```

성공하면 `{ success: true }`가 반환됩니다.

---

## 🎯 다음 단계 (월드 견적 에이전트 배포 준비)

### 월드 견적 에이전트를 배포할 때:

1. **에이전트를 Vercel에 배포**
2. **에이전트 환경변수 설정**:
   ```
   BRAIN_SERVER_URL=https://your-dashboard.vercel.app
   ```
3. **Supabase에서 에이전트 URL 업데이트**:
   ```sql
   UPDATE agents 
   SET base_url = 'https://your-world-agent.vercel.app'
   WHERE id = 'agent-worldlocker-001';
   ```
4. **에이전트가 자동으로 Brain Server에 통계 전송 시작** 🎉

---

## 🔧 문제 해결

### 로그인이 안 될 때
- Supabase Auth에 `steve@dashboard.local` 계정이 생성되었는지 확인
- 브라우저 콘솔 에러 확인

### 에이전트 목록이 비어있을 때
- Supabase `agents` 테이블에 데이터가 있는지 확인
- Supabase Realtime 연결 상태 확인 (브라우저 콘솔)

### 서버리스 함수 에러
- Vercel Functions 탭에서 에러 로그 확인
- 환경변수(`SUPABASE_URL`, `SUPABASE_ANON_KEY`)가 제대로 설정되었는지 확인

---

## 📝 체크리스트

- [ ] Supabase 스키마 적용 완료
- [ ] Supabase Auth에 `steve@dashboard.local` 계정 생성 완료
- [ ] 대시보드 로그인 성공
- [ ] 에이전트 목록 표시 확인
- [ ] 브라우저 콘솔 에러 없음 확인
- [ ] Vercel Functions 로그 정상 확인

**모든 체크리스트 완료하면, 월드 견적 에이전트 배포 준비 완료!** 🚀
