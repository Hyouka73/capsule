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
                .where('fcmTokens', '!=', null)
                .get();

            const allTokens = [];
            usersSnap.docs.forEach(doc => {
                const tokens = doc.data().fcmTokens || [];
                tokens.forEach(t => {
                    if (t && !allTokens.includes(t)) {
                        allTokens.push(t);
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
        if (!tokens || tokens.length === 0) return { successCount: 0, failureCount: 0 };

        const messaging = getMessaging();
        const results = { successCount: 0, failureCount: 0 };

        // Chunking: FCM allows max 500 per multicast
        const CHUNK_SIZE = 500;
        for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
            const chunk = tokens.slice(i, i + CHUNK_SIZE);
            const message = {
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                data: payload.data || {},
                tokens: chunk,
            };

            try {
                const response = await messaging.sendEachForMulticast(message);
                results.successCount += response.successCount;
                results.failureCount += response.failureCount;

                if (response.failureCount > 0) {
                    logger.warn(`[fcmService] Batch partially failed. Success: ${response.successCount}, Fail: ${response.failureCount}`);
                }
            } catch (error) {
                logger.error('[fcmService] Critical error in sendEachForMulticast chunk:', error);
            }
        }

        logger.info(`[fcmService] Final batch results: Success=${results.successCount}, Failures=${results.failureCount}`);
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
            if (!userSnap.exists) return;

            const tokens = userSnap.data().fcmTokens || [];
            if (tokens.length === 0) return;

            return await this.sendBatchNotifications(tokens, payload);
        } catch (error) {
            logger.error(`[fcmService] Error sending to user ${uid}:`, error);
        }
    }
};

// Aliases for easier use
export const getTokensByRelationship = fcmService.getTokensByRelationship;
export const sendBatchNotifications = fcmService.sendBatchNotifications;
export const sendToUser = fcmService.sendToUser;
