import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger } from 'firebase-functions';
import { COLLECTIONS, ACTIVITY_ACTIONS } from '../config/constants.js';

/**
 * onMemoryCreated Trigger
 * Handles automatic activity logging and FCM notifications when a memory is created.
 * Supports multiple admins and includes deep linking.
 */
export const onMemoryCreated = onDocumentCreated({
    document: `${COLLECTIONS.MEMORIES}/{memoryId}`,
    region: 'us-central1'
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        logger.error('No snapshot found for onMemoryCreated event');
        return;
    }

    const memoryId = event.params.memoryId;
    const memoryData = snapshot.data();
    const uploadedBy = memoryData.uploadedBy;
    const memoryTitle = memoryData.title || 'Recuerdo sin título';

    const db = getFirestore();
    const messaging = getMessaging();

    try {
        // 1. Fetch uploader info (optional but good for log/push message)
        const uploaderSnap = await db.collection(COLLECTIONS.USERS).doc(uploadedBy).get();
        const uploaderName = uploaderSnap.exists ? (uploaderSnap.data().displayName || 'Partner') : 'Partner';

        // 2. Log Activity with Idempotency (docId = memoryId)
        const logData = {
            userId: uploadedBy,
            relationshipId: memoryData.relationshipId, // Added isolation
            action: ACTIVITY_ACTIONS.MEMORY_CREATED,
            targetType: 'memory',
            targetId: memoryId,
            displayText: `${uploaderName} subió un nuevo recuerdo: ${memoryTitle}`,
            isReadByAdmin: false,
            readAt: null,
            createdAt: FieldValue.serverTimestamp(),
        };

        if (!logData.relationshipId) {
            logger.warn(`[onMemoryCreated] Missing relationshipId for memory ${memoryId}. Skipping log.`);
        } else {
            await db
                .collection('relationships')
                .doc(memoryData.relationshipId)
                .collection(COLLECTIONS.ACTIVITY_LOG)
                .doc(memoryId)
                .set(logData, { merge: true });
        }

        // 3. Find all Admin users in the SAME relationship to send FCM
        const adminsQuery = await db.collection(COLLECTIONS.USERS)
            .where('role', '==', 'admin')
            .where('relationshipId', '==', memoryData.relationshipId)
            .get();

        if (adminsQuery.empty) {
            logger.warn('[onMemoryCreated] No admin users found to notify.');
            return;
        }

        const allTokens = [];
        adminsQuery.docs.forEach(doc => {
            const tokens = doc.data().fcmTokens || [];
            tokens.forEach(t => {
                if (t && !allTokens.includes(t)) allTokens.push(t);
            });
        });

        if (allTokens.length === 0) {
            logger.warn('[onMemoryCreated] No FCM tokens found for admin users.');
            return;
        }

        // 4. Send FCM via Service
        const payload = {
            title: '📸 Nuevo Recuerdo',
            body: `${uploaderName} subió: ${memoryTitle}`,
            data: {
                screen: 'memory',
                memoryId: memoryId,
            },
        };

        const { sendBatchNotifications } = await import('../services/fcmService.js');
        const response = await sendBatchNotifications(allTokens, payload);
        
        logger.info(`[onMemoryCreated] FCM push results: Success=${response.successCount}, Failures=${response.failureCount}`);

    } catch (error) {
        // Error handling per PM request: logger.error, NO automatic retry logic here
        // (Function will only retry if we throw, and PM said NO reintentar automático)
        logger.error('[onMemoryCreated] Critical error in trigger logic:', error);
    }
});
