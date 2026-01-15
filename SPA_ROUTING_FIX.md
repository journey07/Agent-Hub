# Dashboard SPA 라우팅 404 문제 해결

## 문제

- Dashboard에서 페이지를 새로고침하면 404 에러 발생
- 직접 URL로 접속하면 정상 작동
- React Router를 사용하는 SPA에서 흔한 문제

## 원인

React Router는 **클라이언트 사이드 라우팅**을 사용합니다:
- `/agents/123` 같은 경로는 실제 파일이 아님
- 새로고침하면 서버가 해당 경로를 찾으려고 시도
- 파일이 없어서 404 에러 발생

## 해결 방법

`vercel.json`에 `rewrites` 설정 추가:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**의미:**
- 모든 경로(`/(.*)`)를 `index.html`로 리다이렉트
- React Router가 클라이언트에서 라우팅 처리
- 404 에러 방지

## 적용 방법

1. `vercel.json` 파일 수정 (이미 완료됨)
2. GitHub에 푸시
3. Vercel 자동 재배포
4. 새로고침 테스트

## 확인

수정 후:
- ✅ 모든 경로에서 새로고침 가능
- ✅ 직접 URL 접속 가능
- ✅ 브라우저 뒤로가기/앞으로가기 정상 작동

## 참고

이 설정은 React Router, Vue Router 등 모든 클라이언트 사이드 라우팅에 적용됩니다.
