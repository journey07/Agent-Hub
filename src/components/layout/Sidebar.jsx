import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Zap, LogOut } from 'lucide-react';
import {
    DashboardIcon,
    AgentsIcon,
    ClientsIcon,
    AnalyticsIcon,
    SettingsIcon,
    WorldLockerIcon
} from '../common/CustomIcons';

const navItems = [
    {
        section: '',
        items: [
            { path: '/', icon: DashboardIcon, label: 'Dashboard' },
            { path: '/agents', icon: AgentsIcon, label: 'Agents' },
            { path: '/clients', icon: ClientsIcon, label: 'Clients' }
        ]
    }
];

import { useAuth } from '../../context/AuthContext';

export function Sidebar({ isOpen, onClose }) {
    const location = useLocation();
    const { logout } = useAuth();

    return (
        <>
            {/* Mobile overlay */}
            <div
                className={`sidebar-overlay ${isOpen ? 'sidebar-overlay--visible' : ''}`}
                onClick={onClose}
            />

            <aside className={`sidebar ${isOpen ? '' : ''}`}>
                <div className="sidebar__header">
                    <div className="sidebar__logo">
                        <div className="sidebar__logo-icon">
                            <img src="/supersquad_logo.png" alt="Supersquad Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                        </div>
                        <span className="sidebar__logo-text">Agent Hub</span>
                    </div>
                </div>

                <nav className="sidebar__nav">
                    {navItems.map((section, index) => (
                        <div key={index} className="sidebar__nav-section">
                            {section.section && (
                                <div className="sidebar__nav-title">{section.section}</div>
                            )}
                            <ul className="sidebar__nav-list">
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <li key={item.path}>
                                            <NavLink
                                                to={item.path}
                                                className={`sidebar__nav-item ${isActive ? 'sidebar__nav-item--active' : ''}`}
                                                onClick={onClose}
                                            >
                                                <div className="sidebar__nav-icon-container">
                                                    <Icon className="sidebar__nav-icon" size={24} />
                                                </div>
                                                <span className="sidebar__nav-label">{item.label}</span>
                                                {isActive && <div className="sidebar__nav-indicator" />}
                                            </NavLink>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                <div className="sidebar__footer">
                    <div className="sidebar__user">
                        <div className="sidebar__user-avatar">
                            <img src="https://ui-avatars.com/api/?name=Steve&background=random&length=1" alt="Steve" />
                        </div>
                        <div className="sidebar__user-info">
                            <div className="sidebar__user-name">Steve</div>
                            <div className="sidebar__user-role">Administrator</div>
                        </div>
                        <button className="sidebar__logout-btn" onClick={logout}>
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;
