# 🎯 처리해야 할 작업 목록

## ✅ 완료된 작업

### Critical Issue #1: JWT_SECRET 하드코딩 제거
- [x] 코드 수정 완료 (`api/login.js`)
- [x] 환경 변수 필수화
- [x] README 업데이트

---

## 🚨 즉시 처리 필요 (Critical Issues)

### 1. JWT_SECRET 환경 변수 설정 ⚠️ (코드 수정 완료, 설정 필요)

**상태**: 코드 수정 완료, 환경 변수 설정 필요

**해야 할 작업**:

#### A. 로컬 개발 환경 설정

1. **강력한 JWT_SECRET 생성**
   ```bash
   # 방법 1: OpenSSL 사용
   openssl rand -base64 32
   
   # 방법 2: Node.js 사용
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. **`.env.local` 파일에 추가**
   ```bash
   # .env.local 파일 열기 (없으면 생성)
   # 다음 줄 추가:
   JWT_SECRET=생성된_랜덤_문자열_여기에_붙여넣기
   ```

3. **확인**
   ```bash
   # 서버 재시작
   npm run dev
   
   # 로그인 시도하여 정상 작동 확인
   ```

#### B. Vercel 프로덕션 환경 설정

1. **Vercel Dashboard 접속**
   - https://vercel.com/dashboard
   - 프로젝트 선택

2. **환경 변수 추가**
   - Settings > Environment Variables
   - Add New Variable 클릭
   - Name: `JWT_SECRET`
   - Value: (로컬에서 생성한 것과 동일하거나 새로운 강력한 값)
   - Environment: Production, Preview, Development 모두 선택
   - Save

3. **재배포**
   - 자동 재배포되거나
   - Deployments에서 최신 배포를 다시 배포

**⚠️ 중요**: 
- 로컬과 프로덕션의 JWT_SECRET은 다를 수 있음 (보안상 권장)
- JWT_SECRET을 변경하면 기존 로그인 토큰이 모두 무효화됨
- 최소 32자 이상의 강력한 랜덤 문자열 사용

---

### 2. 에이전트 API 키 노출 문제

**위치**: `src/features/agents/AgentDetailPage.jsx:664`

**현재 문제**:
```jsx
<span>{agent.account || agent.apiKey || 'No Account Linked'}</span>
```

**해야 할 작업**:

1. **API 키 마스킹 유틸리티 함수 생성**
   - `src/utils/security.js` 파일 생성
   - API 키를 마스킹하는 함수 작성

2. **AgentDetailPage 수정**
   - API 키 표시 시 마스킹 적용
   - 복사 버튼 추가 시에도 마스킹된 값만 복사되도록

3. **테스트**
   - UI에서 API 키가 마스킹되어 표시되는지 확인
   - 예: `sk-1234****5678`

**예상 작업 시간**: 30분

---

### 3. N+1 쿼리 문제

**위치**: `src/services/agentService.js` - `getAllAgents()` 함수

**현재 문제**:
- 각 에이전트마다 4-5개의 별도 쿼리 실행
- 에이전트 10개 = 40-50개 쿼리

**해야 할 작업**:

1. **배치 쿼리로 변경**
   - 모든 에이전트 ID 수집
   - `IN` 절을 사용하여 한 번에 데이터 가져오기
   - `api_breakdown`, `daily_stats`, `hourly_stats`, `activity_logs` 모두 배치 처리

2. **수정할 함수들**:
   - `getAllAgents()` - 메인 함수
   - `getSingleAgent()` - 단일 에이전트는 유지 가능

3. **테스트**
   - 쿼리 수 확인 (개발자 도구 Network 탭)
   - 성능 개선 확인

**예상 작업 시간**: 2-3시간

**참고 코드 구조**:
```javascript
// ❌ 현재 (N+1)
agents.map(async (agent) => {
  const breakdown = await supabase.from('api_breakdown').eq('agent_id', agent.id);
  const daily = await supabase.from('daily_stats').eq('agent_id', agent.id);
  // ...
});

// ✅ 개선 (배치)
const agentIds = agents.map(a => a.id);
const allBreakdowns = await supabase.from('api_breakdown').in('agent_id', agentIds);
const allDaily = await supabase.from('daily_stats').in('agent_id', agentIds);
// 메모리에서 매핑
```

---

### 4. 컴포넌트 메모이제이션 부족

**영향받는 컴포넌트**:
- `AgentCard` - 자주 리렌더링됨
- `StatCard` - 통계 업데이트 시 리렌더링
- `DashboardPage` - 전체 페이지

**해야 할 작업**:

1. **AgentCard에 React.memo 추가**
   - `src/features/agents/components/AgentCard.jsx`
   - 비교 함수 작성 (필요한 props만 비교)

2. **StatCard에 React.memo 추가**
   - `src/features/dashboard/StatCard.jsx`

3. **useMemo로 계산 최적화**
   - `DashboardPage`의 필터링/정렬 로직

**예상 작업 시간**: 1-2시간

---

### 5. 캐싱 전략 부재

**해야 할 작업**:

1. **React Query 도입**
   ```bash
   npm install @tanstack/react-query
   ```

2. **QueryClient 설정**
   - `src/lib/queryClient.js` 생성
   - 기본 캐싱 설정

3. **기존 데이터 페칭을 React Query로 마이그레이션**
   - `AgentContext`의 데이터 페칭 로직 변경
   - `useQuery` 훅 사용

4. **캐시 무효화 전략**
   - Realtime 업데이트 시 적절한 캐시 무효화

**예상 작업 시간**: 4-6시간

**참고**: 이 작업은 다른 Critical Issues보다 복잡하므로, 우선순위를 낮출 수 있음

---

## 📋 작업 우선순위 권장 순서

### Phase 1: 보안 (즉시)
1. ✅ JWT_SECRET 환경 변수 설정 (30분)
2. ⬜ 에이전트 API 키 마스킹 (30분)

### Phase 2: 성능 (1주 내)
3. ⬜ N+1 쿼리 문제 해결 (2-3시간)
4. ⬜ 컴포넌트 메모이제이션 (1-2시간)

### Phase 3: 최적화 (2주 내)
5. ⬜ 캐싱 전략 구현 (4-6시간)

---

## 🔍 각 작업별 체크리스트

### JWT_SECRET 설정 체크리스트
- [ ] 로컬에서 강력한 JWT_SECRET 생성
- [ ] `.env.local`에 추가
- [ ] 로컬 서버 재시작 후 로그인 테스트
- [ ] Vercel에 환경 변수 추가
- [ ] 프로덕션 배포 후 로그인 테스트

### API 키 마스킹 체크리스트
- [ ] `src/utils/security.js` 생성
- [ ] 마스킹 함수 작성 및 테스트
- [ ] `AgentDetailPage.jsx` 수정
- [ ] UI에서 마스킹 확인
- [ ] 브라우저 DevTools에서 API 키가 노출되지 않음 확인

### N+1 쿼리 해결 체크리스트
- [ ] `getAllAgents()` 함수 분석
- [ ] 배치 쿼리로 변경
- [ ] 데이터 매핑 로직 수정
- [ ] 쿼리 수 확인 (이전: 40-50개 → 이후: 4-5개)
- [ ] 성능 테스트 (로딩 시간 측정)

### 메모이제이션 체크리스트
- [ ] `AgentCard`에 React.memo 추가
- [ ] `StatCard`에 React.memo 추가
- [ ] 비교 함수 작성
- [ ] React DevTools Profiler로 리렌더링 확인
- [ ] 성능 개선 확인

### 캐싱 전략 체크리스트
- [ ] React Query 설치
- [ ] QueryClient 설정
- [ ] 기존 Context 로직 마이그레이션
- [ ] 캐시 무효화 전략 수립
- [ ] Realtime과의 통합 테스트

---

## 💡 작업 시작 전 확인사항

1. **Git 브랜치 생성** (권장)
   ```bash
   git checkout -b fix/critical-issues
   ```

2. **현재 상태 백업**
   ```bash
   git commit -am "Before fixing critical issues"
   ```

3. **테스트 환경 준비**
   - 로컬 개발 서버 실행 가능한지 확인
   - 데이터베이스 연결 확인

---

## 📞 도움이 필요할 때

각 작업을 진행하다가 막히면:
1. 해당 이슈의 코드 위치 확인
2. 관련 파일 읽기
3. 단계별로 진행 (한 번에 다 하지 말고)

**다음 단계**: Critical Issue #1의 환경 변수 설정부터 시작하세요!
