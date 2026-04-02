import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    const { relationshipId } = request.auth.token;
    if (!relationshipId) throw new HttpsError('failed-precondition', 'No relationship found.');

    const db = getFirestore();
    const snapshotsColl = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.INSTANTANEAS);

    try {
        const snapshot = await snapshotsColl.orderBy('createdAt', 'desc').limit(20).get();
        const snapshots = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || null
        }));

        return { success: true, snapshots };
    } catch (error) {
        logger.error('getSnapshots error:', error);
        throw new HttpsError('internal', error.message);
    }
};
