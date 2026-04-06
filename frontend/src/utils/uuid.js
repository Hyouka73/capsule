/**
 * Generates a UUID v4.
 * Tries to use the native crypto.randomUUID() if available (secure context).
 * Falls back to a pseudo-random implementation if not (insecure context).
 */
export function generateUUID() {
    // 1. Try native API (Secure context or localhost)
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
        try {
            return window.crypto.randomUUID();
        } catch (e) {
            // Silently fall through to fallback if it fails for some reason
        }
    }
    
    // 2. Fallback for non-secure contexts (HTTP on non-localhost IPs)
    // This is a robust v4 compliant implementation for dev environments.
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
