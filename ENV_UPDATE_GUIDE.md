# Dashboard API URL 환경 변수 설정 가이드

## 📍 현재 상황

- **원래 URL**: `https://agenthub-tau.vercel.app/api/stats`
- **새로운 도메인**: `https://hub.supersquad.kr/`
- **새로운 API URL**: `https://hub.supersquad.kr/api/stats`

## 🔧 환경 변수 설정 방법

### 1. world_quotation_backend (Vercel)

**Vercel Dashboard에서 설정:**

1. Vercel Dashboard 접속
2. **world_quotation_backend** 프로젝트 선택
3. **Settings** → **Environment Variables** 클릭
4. 다음 환경 변수 추가/수정:

   ```
   변수명: DASHBOARD_API_URL
   값: https://hub.supersquad.kr/api/stats
   ```

5. **Production**, **Preview**, **Development** 환경 모두에 적용
6. **Save** 클릭
7. **Redeploy** (자동 배포가 안 되면 수동으로 재배포)

### 2. render (Render - 3D 이미지 생성용)

**Render Dashboard에서 설정:**

1. Render Dashboard 접속
2. **world_quotation** 서비스 선택
3. **Environment** 탭 클릭
4. 다음 환경 변수 추가/수정:

   ```
   Key: DASHBOARD_API_URL
   Value: https://hub.supersquad.kr/api/stats
   ```

5. **Save Changes** 클릭
6. 서비스가 자동으로 재시작됨

### 3. 로컬 개발 환경

**world_quotation/backend/.env 파일:**

```bash
DASHBOARD_API_URL=https://hub.supersquad.kr/api/stats
```

또는 기존 URL 유지:

```bash
DASHBOARD_API_URL=https://agenthub-tau.vercel.app/api/stats
```

## ✅ 확인 방법

### 1. 환경 변수 확인

**Vercel에서:**
- Settings → Environment Variables에서 `DASHBOARD_API_URL` 확인

**Render에서:**
- Environment 탭에서 `DASHBOARD_API_URL` 확인

### 2. API 연결 테스트

**터미널에서 테스트:**

```bash
curl https://hub.supersquad.kr/api/stats \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent-worldlocker-001",
    "apiType": "activity_log",
    "logAction": "Test connection",
    "userName": "Test User"
  }'
```

**성공 응답:**
```json
{"success": true}
```

### 3. 로그 확인

**world_quotation 백엔드 로그에서 확인:**

```
📤 Sending activity log to Dashboard: ..., URL: https://hub.supersquad.kr/api/stats
✅ Activity log sent successfully: ...
```

## 🔄 두 도메인 모두 사용 가능

두 도메인 모두 동일한 Vercel 프로젝트를 가리키므로, 둘 다 작동합니다:

- ✅ `https://agenthub-tau.vercel.app/api/stats` (기존)
- ✅ `https://hub.supersquad.kr/api/stats` (새로운 커스텀 도메인)

**권장사항:** 새로운 커스텀 도메인(`hub.supersquad.kr`)을 사용하는 것을 권장합니다.

## ⚠️ 주의사항

1. **도메인 설정 확인**
   - Vercel Dashboard → Settings → Domains에서 `hub.supersquad.kr` 도메인이 추가되어 있는지 확인
   - DNS 설정이 올바르게 되어 있는지 확인

2. **SSL 인증서**
   - Vercel이 자동으로 SSL 인증서를 발급하므로 HTTPS가 자동으로 작동합니다

3. **캐시 문제**
   - 환경 변수 변경 후 즉시 반영되지 않을 수 있음
   - 재배포 필요

## 🐛 문제 해결

### 문제: "Failed to fetch" 에러

**원인:**
- 환경 변수가 설정되지 않음
- 잘못된 URL

**해결:**
1. 환경 변수 확인
2. URL에 `/api/stats` 경로가 포함되어 있는지 확인
3. 서버 재시작/재배포

### 문제: "Connection refused" 에러

**원인:**
- 도메인이 아직 활성화되지 않음
- DNS 설정 문제

**해결:**
1. Vercel Dashboard에서 도메인 상태 확인
2. DNS 설정 확인
3. 일시적으로 기존 URL 사용: `https://agenthub-tau.vercel.app/api/stats`
