import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { relationshipId } = request.auth.token;
    const { lastDocId, limit = 20 } = request.data || {};

    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'El usuario no tiene una relación asignada.');
    }

    const db = getFirestore();
    const logsColl = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.ACTIVITY_LOG);

    try {
        let query = logsColl.orderBy('createdAt', 'desc').limit(limit);

        if (lastDocId) {
            const lastDocSnap = await logsColl.doc(lastDocId).get();
            if (lastDocSnap.exists) {
                query = query.startAfter(lastDocSnap);
            }
        }

        const snapshot = await query.get();
        const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || null
        }));

        return {
            success: true,
            logs,
            count: snapshot.size,
            hasMore: snapshot.size === limit
        };
    } catch (error) {
        logger.error('getActivityLogs error:', { relationshipId, error: error.message });
        throw new HttpsError('internal', 'Error al obtener los registros de actividad.');
    }
};
