import React from 'react';

export const DashboardIcon = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="2" y="2" width="9" height="9" rx="2" fill="#4B6BFB" />
        <rect x="13" y="2" width="9" height="9" rx="2" fill="#4B6BFB" fillOpacity="0.4" />
        <rect x="2" y="13" width="9" height="9" rx="2" fill="#4B6BFB" fillOpacity="0.4" />
        <rect x="13" y="13" width="9" height="9" rx="2" fill="#4B6BFB" fillOpacity="0.4" />
    </svg>
);

export const AgentsIcon = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="12" cy="12" r="9" fill="#FFB74D" fillOpacity="0.2" />
        <path d="M12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7Z" fill="#FF9800" />
        <circle cx="10" cy="11" r="1" fill="white" />
        <circle cx="14" cy="11" r="1" fill="white" />
        <path d="M10 14C10.5 14.8 11.2 15 12 15C12.8 15 13.5 14.8 14 14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

export const ClientsIcon = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="12" cy="8" r="4" fill="#66BB6A" />
        <path d="M6 18C6 15.7909 8.68629 14 12 14C15.3137 14 18 15.7909 18 18V20H6V18Z" fill="#66BB6A" fillOpacity="0.4" />
    </svg>
);

export const AnalyticsIcon = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M18 20V10" stroke="#EF5350" strokeWidth="4" strokeLinecap="round" />
        <path d="M12 20V4" stroke="#42A5F5" strokeWidth="4" strokeLinecap="round" />
        <path d="M6 20V14" stroke="#FFA726" strokeWidth="4" strokeLinecap="round" />
    </svg>
);

export const SettingsIcon = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" fill="#78909C" />
        <path fillRule="evenodd" clipRule="evenodd" d="M20 12C20 11.4 19.9 10.9 19.8 10.4L21.7 8.3C22 8 22 7.5 21.8 7.1L20 4.3C19.7 3.9 19.3 3.8 18.9 3.9L16.2 4.7C15.6 4.3 14.9 3.9 14.3 3.6L13.7 0.9C13.6 0.4 13.2 0 12.7 0H9.1C8.6 0 8.2 0.3 8.1 0.8L7.5 3.5C6.9 3.8 6.3 4.2 5.7 4.6L2.9 3.8C2.5 3.7 2 3.8 1.8 4.2L0.3 7C0.1 7.4 0.1 7.9 0.4 8.2L2.3 10.3C2.2 10.8 2.2 11.4 2.3 11.9L0.4 14C0.1 14.3 0.1 14.8 0.3 15.2L1.8 18C2 18.4 2.5 18.5 2.9 18.4L5.6 17.6C6.2 18 6.8 18.4 7.4 18.7L8 21.4C8.1 21.9 8.5 22.2 9 22.2H12.6C13.1 22.2 13.5 21.9 13.6 21.4L14.2 18.7C14.8 18.4 15.4 18 16 17.6L18.7 18.5C19.1 18.6 19.6 18.5 19.8 18.1L21.6 15.3C21.8 14.9 21.7 14.4 21.4 14.1L19.5 12C19.8 11.4 20 10.7 20 10V12Z" stroke="#78909C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const WorldLockerIcon = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M21 16V8C20.9996 7.64927 20.9071 7.30481 20.7315 7.00116C20.556 6.69751 20.3037 6.44536 20 6.27L13 2.27C12.696 2.09446 12.3511 2.00205 12 2.00205C11.6489 2.00205 11.304 2.09446 11 2.27L4 6.27C3.69626 6.44536 3.44398 6.69751 3.26846 7.00116C3.09294 7.30481 3.00036 7.64927 3 8V16C3.00036 16.3507 3.09294 16.6952 3.26846 16.9988C3.44398 17.3025 3.69626 17.5546 4 17.73L11 21.73C11.304 21.9055 11.6489 21.9979 12 21.9979C12.3511 21.9979 12.696 21.9055 13 21.73L20 17.73C20.3037 17.5546 20.556 17.3025 20.7315 16.9988C20.9071 16.6952 20.9996 16.3507 21 16Z" stroke="#8E24AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#8E24AA" fillOpacity="0.1" />
        <path d="M3.27002 6.96002L12 12.01L20.73 6.96002" stroke="#8E24AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 22.08V12" stroke="#8E24AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// Dashboard Page Icons - Clean, no background style
export const BotIcon = ({ size = 24, className, color = '#6366F1', strokeWidth = 1.5 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 14C8.5 15.5 10 17 12 17C14 17 15.5 15.5 16 14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="10" r="1.5" fill={color} />
        <circle cx="15" cy="10" r="1.5" fill={color} />
        <path d="M12 2V0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <circle cx="12" cy="-1" r="1" fill={color} />
    </svg>
);

export const UsersIconClean = ({ size = 24, className, color = '#F59E0B' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M17 20C17 18.3431 14.7614 17 12 17C9.23858 17 7 18.3431 7 20" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="10" r="3" stroke={color} strokeWidth="1.5" />
        <path d="M21 20C21 18.3431 19.2091 17 17 17C16.0929 17 15.2569 17.2161 14.5569 17.5789" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="17" cy="10" r="2" stroke={color} strokeWidth="1.5" />
        <path d="M3 20C3 18.3431 4.79086 17 7 17C7.90714 17 8.74306 17.2161 9.44306 17.5789" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="7" cy="10" r="2" stroke={color} strokeWidth="1.5" />
    </svg>
);

export const ZapIconClean = ({ size = 24, className, color = '#3B82F6' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M13 2L4.09344 12.6879C3.74463 13.1064 3.57023 13.3157 3.56756 13.4925C3.56524 13.6461 3.63372 13.7923 3.75324 13.8889C3.89073 14 4.16316 14 4.70802 14H12L11 22L19.9065 11.3121C20.2553 10.8936 20.4297 10.6843 20.4324 10.5075C20.4347 10.3539 20.3662 10.2077 20.2467 10.1111C20.1092 10 19.8368 10 19.292 10H12L13 2Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const ZapIconFilled = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M13 2L4.09344 12.6879C3.74463 13.1064 3.57023 13.3157 3.56756 13.4925C3.56524 13.6461 3.63372 13.7923 3.75324 13.8889C3.89073 14 4.16316 14 4.70802 14H12L11 22L19.9065 11.3121C20.2553 10.8936 20.4297 10.6843 20.4324 10.5075C20.4347 10.3539 20.3662 10.2077 20.2467 10.1111C20.1092 10 19.8368 10 19.292 10H12L13 2Z" fill="currentColor" />
    </svg>
);

export const ActivityIconClean = ({ size = 24, className, color = '#10B981', strokeWidth = 1.5 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M22 12H18L15 21L9 3L6 12H2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const BuildingIconClean = ({ size = 24, className, color = '#6366F1' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M3 21H21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 21V7L13 3V21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M13 21V9H19V21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 9V9.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M9 12V12.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M9 15V15.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M9 18V18.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M16 12V12.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M16 15V15.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <path d="M16 18V18.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
);

export const AlertCircleIconClean = ({ size = 24, className, color = '#EF4444' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
        <path d="M12 8V12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="16" r="1" fill={color} />
    </svg>
);

export const CheckCircleIconClean = ({ size = 24, className, color = '#10B981' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
        <path d="M9 12L11 14L15 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const ClockIconClean = ({ size = 24, className, color = '#6366F1' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
        <path d="M12 7V12L15 15" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const ClockIconFilled = ({ size = 24, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path fillRule="evenodd" clipRule="evenodd" d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM12.75 6.75V12.25H16.25V13.75H11.25V6.75H12.75Z" fill="currentColor" />
    </svg>
);

export const InfoIconClean = ({ size = 24, className, color = '#3B82F6' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" />
        <path d="M12 16V12" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="8" r="1" fill={color} />
    </svg>
);

export const HeartIconClean = ({ size = 24, className, color = '#EF4444' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M20.84 4.61C20.3292 4.099 19.7228 3.69364 19.0554 3.41708C18.3879 3.14052 17.6725 2.99817 16.95 2.99817C16.2275 2.99817 15.5121 3.14052 14.8446 3.41708C14.1772 3.69364 13.5708 4.099 13.06 4.61L12 5.67L10.94 4.61C9.9083 3.57831 8.50903 2.99871 7.05 2.99871C5.59096 2.99871 4.19169 3.57831 3.16 4.61C2.1283 5.64169 1.54871 7.04097 1.54871 8.5C1.54871 9.95903 2.1283 11.3583 3.16 12.39L4.22 13.45L12 21.23L19.78 13.45L20.84 12.39C21.351 11.8792 21.7564 11.2728 22.0329 10.6054C22.3095 9.93789 22.4518 9.22248 22.4518 8.5C22.4518 7.77752 22.3095 7.0621 22.0329 6.39464C21.7564 5.72718 21.351 5.12075 20.84 4.61Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill={color} fillOpacity="0.1" />
    </svg>
);
