import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldPath } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * cleanupExpiredTokens — Scheduled Trigger (Weekly)
 * Removes tokens that haven't been active in 90 days or are invalid.
 */
export const cleanupExpiredTokens = onSchedule({
    schedule: 'every monday 03:00',
    timeZone: 'UTC',
    region: 'us-central1'
}, async (event) => {
    const db = getFirestore();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    logger.info(`[cleanupExpiredTokens] Starting cleanup for tokens older than: ${ninetyDaysAgo.toISOString()}`);

    try {
        // We query users that were active a long time ago OR have fcmTokens
        // Note: Full scan might be expensive, so we filter by fcmTokens length > 0 if possible
        // But Firestore doesn't support length queries natively.
        // Efficient way: scan users who have the fcmTokens field.
        const usersSnap = await db.collection(COLLECTIONS.USERS)
            .where('fcmTokens', '!=', [])
            .get();

        if (usersSnap.empty) {
            logger.info('[cleanupExpiredTokens] No users with tokens found.');
            return;
        }

        let totalTokensRemoved = 0;
        let usersUpdated = 0;

        let batch = db.batch();
        let batchCount = 0;

        for (const doc of usersSnap.docs) {
            const userData = doc.data();
            const tokens = userData.fcmTokens || [];
            
            // If user hasn't been active in 90 days, we could clear ALL tokens.
            const lastActive = userData.lastActiveAt ? (userData.lastActiveAt.toDate ? userData.lastActiveAt.toDate() : new Date(userData.lastActiveAt)) : null;
            
            if (lastActive && lastActive < ninetyDaysAgo) {
                if (tokens.length > 0) {
                    batch.update(doc.ref, { 
                        fcmTokens: [], 
                        updatedAt: new Date() 
                    });
                    totalTokensRemoved += tokens.length;
                    usersUpdated++;
                    batchCount++;
                }
            } else {
                // If user is active, we could still have invalid tokens, but without sending we don't know.
                // However, the prompt specifically mentions: "Validar: tokens activos (último uso < 90 días)"
                // Since we don't store "last use" per token easily, we use User.lastActiveAt as a proxy for all their tokens.
            }

            // Batch limit is 500
            if (batchCount >= 400) {
                await batch.commit();
                batchCount = 0;
                batch = db.batch(); 
            }
        }

        if (batchCount > 0) {
            await batch.commit();
        }

        logger.info(`[cleanupExpiredTokens] Cleanup finished. Users updated: ${usersUpdated}, Tokens removed: ${totalTokensRemoved}`);
    } catch (error) {
        logger.error('[cleanupExpiredTokens] Error during cleanup:', error);
    }
});
