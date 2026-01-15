export function StatusBadge({ status }) {
    const statusConfig = {
        online: { label: '활성', dot: true, pulse: true },
        offline: { label: '비활성', dot: true, pulse: false },
        processing: { label: '처리중', dot: true, pulse: true },
        error: { label: '오류', dot: true, pulse: true }
    };

    const config = statusConfig[status] || statusConfig.offline;

    return (
        <span className={`badge badge--${status}`}>
            <span className={`badge__dot ${config.pulse ? 'badge__dot--pulse' : ''}`}></span>
            {config.label}
        </span>
    );
}

export default StatusBadge;
