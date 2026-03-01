export const logToVercel = async (component, event, message = "triggered") => {
    try {
        const url = window.location.hostname.includes('localhost')
            ? '/api/debug' // Local development if using Vercel CLI
            : '/api/debug';

        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                component,
                event,
                message,
                userAgent: navigator.userAgent
            })
        });
        console.log(`[PWA-DEBUG] Sent to Vercel: ${component} - ${event} - ${message}`);
    } catch (error) {
        console.error("Failed to send log to Vercel API:", error);
    }
};
