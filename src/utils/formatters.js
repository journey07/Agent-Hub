// Format numbers with comma separators
// Format numbers with comma separators
export function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return num.toLocaleString('ko-KR');
}

// Format large numbers with K/M suffix
export function formatCompactNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

// Format percentage
export function formatPercent(num, decimals = 1) {
    if (num === null || num === undefined || isNaN(num)) return '0%';
    return (num * 100).toFixed(decimals) + '%';
}

// Format date/time
export function formatDateTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format relative time (e.g., "5분 전")
export function formatRelativeTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    return `${diffDays}일 전`;
}

// Format milliseconds to readable time
export function formatResponseTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

// Get status label in Korean
export function getStatusLabel(status) {
    const labels = {
        online: '활성',
        offline: '비활성',
        processing: '처리중',
        error: '오류'
    };
    return labels[status] || status;
}

// Get status color class
export function getStatusColorClass(status) {
    const classes = {
        online: 'badge--online',
        offline: 'badge--offline',
        processing: 'badge--processing',
        error: 'badge--error'
    };
    return classes[status] || 'badge--offline';
}
