import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * GetActivityLogs API
 * Fetches activity logs for the current relationship.
 * Supports pagination via limit and startAfter.
 */
export const getActivityLogs = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }

    const relationshipId = request.auth.token.relationshipId;
    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'El usuario no tiene una relación activa.');
    }

    const { limit = 50, startAfterLogId = null } = request.data;

    const db = getFirestore();
    let query = db
        .collection('relationships')
        .doc(relationshipId)
        .collection(COLLECTIONS.ACTIVITY_LOG)
        .orderBy('createdAt', 'desc')
        .limit(Math.min(limit, 100)); // Cap limit at 100 for safety

    try {
        if (startAfterLogId) {
            const lastDoc = await db
                .collection('relationships')
                .doc(relationshipId)
                .collection(COLLECTIONS.ACTIVITY_LOG)
                .doc(startAfterLogId)
                .get();
            
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
            }
        }

        const snapshot = await query.get();
        const logs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
            readAt: doc.data().readAt?.toDate?.()?.toISOString() || doc.data().readAt,
        }));

        return {
            success: true,
            logs,
            hasMore: logs.length === limit,
            lastId: logs.length > 0 ? logs[logs.length - 1].id : null
        };
    } catch (error) {
        logger.error('Error fetching activity logs:', error);
        throw new HttpsError('internal', 'Error al obtener los logs de actividad.');
    }
});

