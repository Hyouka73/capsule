import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    const { capsuleId } = request.data || {};
    const { relationshipId, role } = request.auth.token;

    if (role !== 'admin') throw new HttpsError('permission-denied', 'Only admin can destroy capsules.');
    if (!capsuleId) throw new HttpsError('invalid-argument', 'Capsule ID is required.');

    const db = getFirestore();
    const capsuleRef = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.CAPSULES).doc(capsuleId);

    try {
        await capsuleRef.update({
            status: 'destroyed',
            destroyedAt: new Date(),
            updatedAt: new Date()
        });
        return { success: true };
    } catch (error) {
        logger.error('destroyCapsule error:', error);
        throw new HttpsError('internal', error.message);
    }
};
