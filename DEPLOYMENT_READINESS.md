# Dashboard Project Deployment Readiness

## Deployment Blockers (Vercel)

- [ ] **Database Persistence**: SQLite `api/database.sqlite` will be reset on every deployment and won't persist data between requests in Vercel.
- [ ] **WebSocket Support**: Vercel Serverless Functions do not support long-lived WebSocket connections used in `server.js`.
- [ ] **API URLs**: Hardcoded `http://localhost:5001` in `AgentContext.jsx` will fail in production.
- [ ] **Background Tasks**: `setInterval` health checks in `server.js` won't run continuously in a serverless environment.

## Recommended Fixes

1. **Switch to a Cloud Database**: Use Vercel Postgres, Supabase, or MongoDB Atlas.
2. **Use Environment Variables**: Replace hardcoded URLs with `import.meta.env.VITE_API_URL`.
3. **Handle Real-time Updates**: Switch to Pusher or use HTTP long-polling/SWR for real-time data.
4. **Decouple Health Checks**: Use a separate service (like Vercel Cron Jobs or an external uptime monitor) to trigger health checks.
