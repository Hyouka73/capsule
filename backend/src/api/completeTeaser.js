import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    const { uid } = request.auth;
    const db = getFirestore();

    try {
        const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
        await userRef.update({
            teaserCompleted: true,
            updatedAt: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        logger.error('completeTeaser error:', error);
        throw new HttpsError('internal', error.message);
    }
};
