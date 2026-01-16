import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { ErrorBanner } from '../common';
import { useAgents } from '../../context/AgentContext';

const pageTitles = {
    '/': '대시보드',
    '/agents': '에이전트 관리',
    '/clients': '클라이언트',
    '/analytics': '분석',
    '/settings': '설정'
};

const agentFilters = [
    { key: 'all', label: '전체' },
    { key: 'online', label: '활성' },
    { key: 'processing', label: '처리중' },
    { key: 'offline', label: '비활성' },
    { key: 'error', label: '오류' }
];

const clientFilters = [
    { key: 'all', label: '전체' },
    { key: 'Enterprise', label: 'Enterprise' },
    { key: 'Professional', label: 'Professional' },
    { key: 'Starter', label: 'Starter' }
];

export function MainLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const location = useLocation();
    const { agents, clients, error, clearError } = useAgents();

    const title = location.pathname.startsWith('/agents/') ? '에이전트 디테일' : (pageTitles[location.pathname] || "Supersquad's Hub");
    const isAgentsPage = location.pathname === '/agents';
    const isClientsPage = location.pathname === '/clients';
    const isDashboardPage = location.pathname === '/';

    // Reset search term and filter on navigation
    useEffect(() => {
        setSearchTerm('');
        setStatusFilter('all');
    }, [location.pathname]);

    // Prevent body scroll on mobile when sidebar is open
    useEffect(() => {
        const isMobile = window.innerWidth <= 1024;
        if (isMobile && sidebarOpen) {
            // Save current scroll position
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
            
            return () => {
                // Restore scroll position when sidebar closes
                const scrollY = document.body.style.top;
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                document.body.style.overflow = '';
                if (scrollY) {
                    window.scrollTo(0, parseInt(scrollY || '0') * -1);
                }
            };
        }
    }, [sidebarOpen]);

    // Calculate filter counts for agents
    const agentFilterCounts = {
        all: agents.length,
        online: agents.filter(a => a.status === 'online').length,
        processing: agents.filter(a => a.status === 'processing').length,
        offline: agents.filter(a => a.status === 'offline').length,
        error: agents.filter(a => a.status === 'error').length
    };

    // Calculate filter counts for clients
    const clientFilterCounts = {
        all: clients.length,
        Enterprise: clients.filter(c => c.plan === 'Enterprise').length,
        Professional: clients.filter(c => c.plan === 'Professional').length,
        Starter: clients.filter(c => c.plan === 'Starter').length
    };

    // Determine which filters to show
    const currentFilters = isAgentsPage ? agentFilters : isClientsPage ? clientFilters : null;
    const currentFilterCounts = isAgentsPage ? agentFilterCounts : isClientsPage ? clientFilterCounts : null;

    return (
        <div className="app-layout">
            <div className={`app-layout__sidebar ${sidebarOpen ? 'app-layout__sidebar--open' : ''}`}>
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            </div>

            <main className={`app-layout__main ${sidebarOpen ? 'app-layout__main--sidebar-open' : ''}`}>
                <div className="app-layout__header">
                    <Header
                        title={title}
                        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
                        searchValue={searchTerm}
                        onSearchChange={setSearchTerm}
                        showSearch={!isDashboardPage}
                        filters={currentFilters}
                        activeFilter={statusFilter}
                        onFilterChange={setStatusFilter}
                        filterCounts={currentFilterCounts}
                    />
                </div>

                <div className="app-layout__content">
                    {error && (
                        <ErrorBanner 
                            error={error} 
                            onDismiss={clearError}
                            autoDismiss={true}
                            dismissAfter={8000}
                        />
                    )}
                    <Outlet context={{ searchTerm, statusFilter }} />
                </div>
            </main>
        </div>
    );
}

export default MainLayout;
