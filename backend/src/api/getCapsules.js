import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { relationshipId, role, uid } = request.auth.token;

    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'El usuario no tiene una relación asignada.');
    }

    const db = getFirestore();
    const capsulesColl = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.CAPSULES);

    try {
        let query = capsulesColl.orderBy('createdAt', 'desc');

        // Logic for role filtering if necessary
        // Admin sees all? Partner sees only those unlocked?
        // Let's keep it simple: fetch all, frontend filters.
        const snapshot = await query.get();
        const capsules = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || null,
            unlockAt: doc.data().unlockAt?.toDate() || null
        }));

        return {
            success: true,
            capsules
        };
    } catch (error) {
        logger.error('getCapsules error:', { relationshipId, error: error.message });
        throw new HttpsError('internal', 'Error al obtener las cápsulas del tiempo.');
    }
};
