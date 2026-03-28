import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * markSnapshotAsSeen — Backend API
 * 
 * Marca una instantánea como vista por el destinatario.
 */
export const markSnapshotAsSeen = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { relationshipId } = request.auth.token;
    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'Relationship ID missing in token');
    }

    const { snapshotId } = request.data;
    if (!snapshotId) {
        throw new HttpsError('invalid-argument', 'El snapshotId es obligatorio.');
    }

    const db = getFirestore();

    try {
        // Subcollection path: relationships/{id}/snapshots/{snapshotId}
        const snapshotRef = db.collection('relationships')
            .doc(relationshipId)
            .collection(COLLECTIONS.INSTANTANEAS)
            .doc(snapshotId);
        
        const snapshotSnap = await snapshotRef.get();

        if (!snapshotSnap.exists) {
            throw new HttpsError('not-found', 'Instantánea no encontrada en tu relación.');
        }

        const now = Timestamp.now();
        await snapshotRef.update({
            isSeen: true,
            seenAt: now
        });

        logger.info(`[markSnapshotAsSeen] Snapshot ${snapshotId} marked as seen in relationship ${relationshipId}`);

        return {
            success: true,
            seenAt: now.toDate().toISOString()
        };
    } catch (error) {
        logger.error('[markSnapshotAsSeen] Error:', { snapshotId, relationshipId, error: error.message });
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Error al marcar la instantánea como vista.');
    }
});
