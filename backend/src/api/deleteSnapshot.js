import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    const { snapshotId } = request.data || {};
    const { relationshipId, role } = request.auth.token;

    if (role !== 'admin') throw new HttpsError('permission-denied', 'Only admin can delete snapshots.');
    if (!snapshotId) throw new HttpsError('invalid-argument', 'Snapshot ID is required.');

    const db = getFirestore();
    const snapshotRef = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.INSTANTANEAS).doc(snapshotId);

    try {
        await snapshotRef.delete();
        return { success: true };
    } catch (error) {
        logger.error('deleteSnapshot error:', error);
        throw new HttpsError('internal', error.message);
    }
};
