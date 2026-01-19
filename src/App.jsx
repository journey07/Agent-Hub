import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AgentProvider } from './context/AgentContext';
import { MainLayout } from './components/layout';
import { DashboardPage } from './features/dashboard';
import { AgentListPage, AgentDetailPage } from './features/agents';
import { ClientListPage } from './features/clients';

// Import styles
import './styles/index.css';
import './styles/components.css';
import './styles/layout.css';

import { AuthProvider } from './context/AuthContext';
import LoginPage from './features/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { queryClient } from './lib/queryClient';

// Environment variable validation component
function EnvCheck({ children }) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const missingVars = [];
    if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
    if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#111111',
        color: '#ffffff',
        padding: '2rem',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          maxWidth: '600px',
          backgroundColor: '#1a1a1a',
          padding: '2rem',
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <h1 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '1.5rem' }}>
            ❌ 환경 변수 설정 오류
          </h1>
          <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
            다음 환경 변수가 설정되지 않았습니다:
          </p>
          <ul style={{ 
            marginBottom: '1.5rem', 
            paddingLeft: '1.5rem',
            color: '#fbbf24'
          }}>
            {missingVars.map(v => <li key={v} style={{ marginBottom: '0.5rem' }}>{v}</li>)}
          </ul>
          <div style={{
            backgroundColor: '#1e293b',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
            fontFamily: 'monospace'
          }}>
            <p style={{ marginBottom: '0.5rem', color: '#94a3b8' }}>해결 방법:</p>
            <p style={{ marginBottom: '0.5rem' }}>
              1. Dashboard 디렉토리에 <code style={{ color: '#60a5fa' }}>.env.local</code> 파일을 생성하세요
            </p>
            <p style={{ marginBottom: '0.5rem' }}>
              2. 다음 내용을 추가하세요:
            </p>
            <pre style={{
              backgroundColor: '#0f172a',
              padding: '0.75rem',
              borderRadius: '4px',
              overflow: 'auto',
              marginTop: '0.5rem'
            }}>
{`VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key`}
            </pre>
            <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#94a3b8' }}>
              💡 ENV_SETUP.md 또는 INTEGRATION_SETUP.md 파일을 참고하세요
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}
          >
            환경 변수 설정 후 새로고침
          </button>
        </div>
      </div>
    );
  }

  return children;
}

function App() {
  return (
    <EnvCheck>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AgentProvider>
            <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route index element={<DashboardPage />} />
                <Route path="agents" element={<AgentListPage />} />
                <Route path="agents/:id" element={<AgentDetailPage />} />
                <Route path="clients" element={<ClientListPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
            </BrowserRouter>
          </AgentProvider>
        </AuthProvider>
      </QueryClientProvider>
    </EnvCheck>
  );
}

// Placeholder pages
function AnalyticsPage() {
  return (
    <div className="page animate-slideUp">
      <h2 className="page__title">분석</h2>
      <p className="page__description">상세 분석 페이지 (개발 예정)</p>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="page animate-slideUp">
      <h2 className="page__title">설정</h2>
      <p className="page__description">설정 페이지 (개발 예정)</p>
    </div>
  );
}

export default App;
