import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    const { logId } = request.data || {};
    const { relationshipId } = request.auth.token;

    if (!logId) throw new HttpsError('invalid-argument', 'Log ID is required.');

    const db = getFirestore();
    const logRef = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.ACTIVITY_LOG).doc(logId);

    try {
        await logRef.update({
            isReadByAdmin: true,
            readAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        logger.error('markLogAsRead error:', error);
        throw new HttpsError('internal', error.message);
    }
};
