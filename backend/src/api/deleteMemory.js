import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    const { memoryId } = request.data || {};
    const { relationshipId, role } = request.auth.token;

    if (role !== 'admin') throw new HttpsError('permission-denied', 'Only admin can delete memories.');
    if (!memoryId) throw new HttpsError('invalid-argument', 'Memory ID is required.');

    const db = getFirestore();
    const memoryRef = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.MEMORIES).doc(memoryId);

    try {
        await memoryRef.delete();
        return { success: true };
    } catch (error) {
        logger.error('deleteMemory error:', error);
        throw new HttpsError('internal', error.message);
    }
};
