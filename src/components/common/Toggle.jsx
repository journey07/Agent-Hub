import { useState } from 'react';

export function Toggle({ checked, onChange, disabled = false, loading = false }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = async () => {
        if (disabled || isLoading || loading) return;

        setIsLoading(true);
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));
        onChange(!checked);
        setIsLoading(false);
    };

    return (
        <label className={`toggle ${(loading || isLoading) ? 'toggle--loading' : ''}`}>
            <input
                type="checkbox"
                className="toggle__input"
                checked={checked}
                onChange={handleChange}
                disabled={disabled || isLoading || loading}
            />
            <span className="toggle__slider"></span>
        </label>
    );
}

export default Toggle;
