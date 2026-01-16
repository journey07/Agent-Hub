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

function App() {
  return (
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
