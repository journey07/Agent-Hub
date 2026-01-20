import { useState, useEffect } from 'react';
import { formatRelativeTime } from '../../utils/formatters';

export function TimeAgo({ date, className = '' }) {
    const [timeString, setTimeString] = useState(() => formatRelativeTime(date));

    useEffect(() => {
        // Initial set
        setTimeString(formatRelativeTime(date));

        // Update every 60 seconds
        const intervalId = setInterval(() => {
            setTimeString(formatRelativeTime(date));
        }, 60000);

        return () => clearInterval(intervalId);
    }, [date]);

    return (
        <span className={className}>
            {timeString}
        </span>
    );
}
