# Dashboard 프로젝트 규칙

## 중복 코드 주의 (CRITICAL)

### Stats API 엔드포인트
`server.js`와 `api/stats.js`는 **동일한 역할**을 합니다:
- `server.js` → 로컬 개발용 (Express)
- `api/stats.js` → Vercel 프로덕션용 (Serverless)

**새 필드 추가 시 반드시 두 곳 모두 수정:**
1. `server.js` - req.body 추출 + DB 저장
2. `api/stats.js` - req.body 추출 + DB 저장

### Activity Logs 필드 추가 체크리스트
새 필드 추가 시 아래 **모든 파일** 수정 필요:

| 단계 | 파일 | 수정 내용 |
|------|------|-----------|
| 1. DB 스키마 | `supabase_schema.sql` | 컬럼 추가 |
| 2. 마이그레이션 | `add_*_migration.sql` | ALTER TABLE |
| 3. 서버 (로컬) | `server.js` | req.body 추출 + insert |
| 4. 서버 (프로덕션) | `api/stats.js` | req.body 추출 + insert |
| 5. 서비스 조회 | `src/services/agentService.js` | select + 매핑 (camelCase) |
| 6. 실시간 구독 | `src/context/AgentContext.jsx` | payload.new 매핑 |
| 7. UI 표시 | `DashboardPage.jsx`, `AgentDetailPage.jsx` | 렌더링 |

### 예시: productType 필드
```
DB: product_type (snake_case)
JS: productType (camelCase)
```

## 파일 구조

```
Dashboard/
├── server.js              # 로컬 개발 서버
├── api/
│   └── stats.js           # Vercel 서버리스 (프로덕션)
├── src/
│   ├── services/
│   │   └── agentService.js    # DB 조회 함수
│   ├── context/
│   │   └── AgentContext.jsx   # 실시간 구독 + 상태관리
│   └── features/
│       ├── dashboard/
│       │   └── DashboardPage.jsx
│       └── agents/
│           └── AgentDetailPage.jsx
└── supabase_schema.sql    # DB 스키마
```

## 네이밍 컨벤션

- DB 컬럼: `snake_case` (product_type, user_name, image_url)
- JS 변수: `camelCase` (productType, userName, imageUrl)
- 매핑은 `agentService.js`와 `AgentContext.jsx`에서 수행
