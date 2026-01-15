import { AlertCircle, X } from 'lucide-react';
import { useEffect } from 'react';

/**
 * Error Banner Component
 * Displays user-friendly error messages with auto-dismiss
 * Optimized for performance: minimal re-renders, efficient cleanup
 */
export function ErrorBanner({ error, onDismiss, autoDismiss = true, dismissAfter = 5000 }) {
    useEffect(() => {
        if (error && autoDismiss && onDismiss) {
            const timer = setTimeout(() => {
                onDismiss();
            }, dismissAfter);

            return () => clearTimeout(timer);
        }
    }, [error, autoDismiss, dismissAfter, onDismiss]);

    if (!error) return null;

    return (
        <div className="error-banner" role="alert">
            <div className="error-banner__content">
                <AlertCircle size={20} className="error-banner__icon" />
                <span className="error-banner__message">{error}</span>
            </div>
            {onDismiss && (
                <button
                    className="error-banner__close"
                    onClick={onDismiss}
                    aria-label="Close error message"
                >
                    <X size={18} />
                </button>
            )}
        </div>
    );
}

export default ErrorBanner;
