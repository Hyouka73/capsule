import { useState, useEffect } from 'react';

/**
 * Tracks the browser's network status reactively.
 * Uses the native `online` / `offline` window events.
 *
 * @returns {boolean} true = connected, false = offline
 */
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(() => navigator.onLine);

    useEffect(() => {
        const handleOnline  = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online',  handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online',  handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}
