const { getMessaging } = require('firebase-admin/messaging');

/**
 * sendNotificationToTokens — Sends a push notification to specific FCM tokens.
 * @param {string[]} tokens - Array of device tokens
 * @param {object} payload - Notification data { title, body, data }
 */
async function sendNotificationToTokens(tokens, payload) {
    if (!tokens || tokens.length === 0) return;

    const message = {
        notification: {
            title: payload.title,
            body: payload.body,
        },
        data: payload.data || {},
        tokens: tokens,
    };

    try {
        const response = await getMessaging().sendEachForMulticast(message);
        console.log(`Successfully sent ${response.successCount} messages; ${response.failureCount} errors.`);

        // Optional: you could clean up failed tokens here if you want
        return response;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}

module.exports = { sendNotificationToTokens };
