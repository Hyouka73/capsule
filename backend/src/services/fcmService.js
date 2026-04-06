import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * FCM Service — Centralized push notification logic.
 */
export const fcmService = {
    /**
     * filterTokensByRelationship — efficient query to get tokens for a relationship.
     * @param {string} relationshipId 
     * @returns {Promise<string[]>}
     */
    async getTokensByRelationship(relationshipId) {
        const db = getFirestore();
        try {
            const usersSnap = await db.collection(COLLECTIONS.USERS)
                .where('relationshipId', '==', relationshipId)
                .get();

            const allTokens = [];
            usersSnap.docs.forEach(doc => {
                const tokensMap = doc.data().fcmTokens || {};
                Object.keys(tokensMap).forEach(token => {
                    const tokenData = tokensMap[token];
                    // Only include active tokens
                    if (tokenData && tokenData.active !== false && !allTokens.includes(token)) {
                        allTokens.push(token);
                    }
                });
            });
            return allTokens;
        } catch (error) {
            logger.error(`[fcmService] Error fetching tokens for relationship ${relationshipId}:`, error);
            return [];
        }
    },

    /**
     * sendBatchNotifications — Sends notifications with 500-token chunking.
     * @param {string[]} tokens 
     * @param {object} payload { title, body, data }
     */
    async sendBatchNotifications(tokens, payload) {
        if (!tokens || tokens.length === 0) {
            logger.warn('[fcmService] No tokens provided for batch sending.');
            return { successCount: 0, failureCount: 0 };
        }

        const messaging = getMessaging();
        const results = { successCount: 0, failureCount: 0, deadTokens: [] };

        // Chunking: FCM allows max 500 per multicast
        const CHUNK_SIZE = 500;
        for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
            const chunk = tokens.slice(i, i + CHUNK_SIZE);
            const message = {
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                webpush: {
                    notification: {
                        title: payload.title,
                        body: payload.body,
                        icon: '/logo.svg',
                        ...(payload.image && { image: payload.image }),
                    },
                    fcmOptions: {
                        link: '/',
                    },
                },
                data: payload.data
                    ? Object.fromEntries(
                        Object.entries(payload.data).map(([k, v]) => [k, String(v)])
                      )
                    : {},
                tokens: chunk,
            };

            // Optional enhancement: sound
            if (payload.sound) {
                // message.notification.sound = payload.sound; // Removed top-level for better compatibility
                message.android = { notification: { sound: payload.sound } };
                message.apns = { payload: { aps: { sound: payload.sound } } };
            }

            try {
                // Using multicast for efficiency
                const response = await messaging.sendEachForMulticast(message);
                results.successCount += response.successCount;
                results.failureCount += response.failureCount;

                if (response.failureCount > 0) {
                    logger.warn(`[fcmService] Batch partially failed. Success: ${response.successCount}, Fail: ${response.failureCount}`);
                    
                    const deadTokens = [];
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success) {
                            logger.error(`[fcmService] Token failed [${idx}]: code=${resp.error?.code} message=${resp.error?.message} token_prefix=${chunk[idx]?.substring(0, 20)}`);
                            if (resp.error?.code === 'messaging/registration-token-not-registered') {
                                deadTokens.push(chunk[idx]);
                            }
                        }
                    });
                    results.deadTokens = [...(results.deadTokens || []), ...deadTokens];
                }
            } catch (error) {
                logger.error('[fcmService] Critical error in sendEachForMulticast chunk:', error);
            }
        }

        logger.info(`[fcmService] Final results: Success=${results.successCount}, Failures=${results.failureCount}`);
        return results;
    },

    /**
     * sendToUser — Sends notification to a specific user's tokens.
     * @param {string} uid 
     * @param {object} payload 
     */
    async sendToUser(uid, payload) {
        const db = getFirestore();
        try {
            const userSnap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
            if (!userSnap.exists) {
                logger.warn(`[fcmService] User ${uid} not found.`);
                return;
            }

            const tokensMap = userSnap.data().fcmTokens || {};
            const activeTokens = Object.keys(tokensMap).filter(token => tokensMap[token].active !== false);
            
            if (activeTokens.length === 0) {
                logger.warn(`[fcmService] No active tokens for user ${uid}.`);
                return;
            }

            const result = await fcmService.sendBatchNotifications(activeTokens, payload);

            // Cleanup dead tokens if any
            if (result?.deadTokens?.length > 0) {
                const { FieldValue } = await import('firebase-admin/firestore');
                const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
                const cleanupData = {};
                result.deadTokens.forEach(token => {
                    cleanupData[`fcmTokens.${token}`] = FieldValue.delete();
                });
                await userRef.update(cleanupData);
                logger.info(`[fcmService] Cleaned up ${result.deadTokens.length} dead tokens for user ${uid}`);
            }

            return result;
        } catch (error) {
            logger.error(`[fcmService] Error sending to user ${uid}:`, error);
        }
    }
};

// Aliases for easier use - Bind to preserve context
export const getTokensByRelationship = fcmService.getTokensByRelationship.bind(fcmService);
export const sendBatchNotifications = fcmService.sendBatchNotifications.bind(fcmService);
export const sendToUser = fcmService.sendToUser.bind(fcmService);
