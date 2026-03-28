import { sendBatchNotifications, getTokensByRelationship, sendToUser } from '../services/fcmService.js';

/**
 * notifications.js — Compatibility wrapper for FCM Service.
 */

/**
 * sendNotificationToTokens — Legacy wrapper for sendBatchNotifications.
 */
export async function sendNotificationToTokens(tokens, payload) {
    return await sendBatchNotifications(tokens, payload);
}

export { sendBatchNotifications, getTokensByRelationship, sendToUser };
