import { HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { logActivity as svcLogActivity } from '../services/activityService.js';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    const { action, targetType, targetId, displayText, metadata } = request.data || {};
    const { relationshipId, uid } = request.auth.token;

    if (!action || !displayText) throw new HttpsError('invalid-argument', 'Action and displayText are required.');
    if (!relationshipId) throw new HttpsError('failed-precondition', 'No relationship found.');

    try {
        const result = await svcLogActivity({
            relationshipId,
            userId: uid,
            action,
            targetType: targetType || null,
            targetId: targetId || null,
            displayText,
            metadata: metadata || {}
        });

        return { success: true, logId: result.id };
    } catch (error) {
        logger.error('logActivity error:', error);
        throw new HttpsError('internal', error.message);
    }
};
