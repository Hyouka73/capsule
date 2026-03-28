import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * getSnapshots — Backend API (BFF)
 * 
 * Obtiene todas las instantáneas de la relación.
 */
export const getSnapshots = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { relationshipId } = request.auth.token;
    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'Relationship ID missing in token');
    }

    const db = getFirestore();

    try {
        // Subcollection path: relationships/{id}/snapshots
        const snapshotsSnap = await db.collection('relationships')
            .doc(relationshipId)
            .collection(COLLECTIONS.INSTANTANEAS)
            .orderBy('createdAt', 'desc')
            .get();

        const snapshots = snapshotsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()?.toISOString() || null,
            expiresAt: doc.data().expiresAt?.toDate()?.toISOString() || null,
            seenAt: doc.data().seenAt?.toDate()?.toISOString() || null,
            archivedAt: doc.data().archivedAt?.toDate()?.toISOString() || null
        }));

        return {
            success: true,
            snapshots
        };
    } catch (error) {
        logger.error('[getSnapshots] Error:', { relationshipId, error: error.message });
        throw new HttpsError('internal', 'Error al obtener las instantáneas.');
    }
});
