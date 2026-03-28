/**
 * taskArchiveSnapshot — Cloud Task Handler
 *
 * Corre exactamente 24 horas después de que se crea una instantánea.
 * Encolada por createSnapshot.js via getFunctions().taskQueue().
 *
 * Marca isArchived=true para que aparezca en la galería.
 * Si ya fue archivada (rare dupe), simplemente sale sin error.
 */

import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const taskArchiveSnapshot = onTaskDispatched(
    {
        retryConfig: {
            maxAttempts: 3,
            minBackoffSeconds: 60,
        },
        rateLimits: {
            maxConcurrentDispatches: 10,
        },
    },
    async (request) => {
        const { snapshotId, relationshipId } = request.data;
        if (!snapshotId || !relationshipId) {
            logger.error('[taskArchiveSnapshot] Missing snapshotId or relationshipId in payload, skipping.');
            return;
        }

        const db = getFirestore();
        // Subcollection path: relationships/{id}/snapshots/{snapshotId}
        const snapshotRef = db.collection('relationships')
            .doc(relationshipId)
            .collection(COLLECTIONS.INSTANTANEAS)
            .doc(snapshotId);

        const snap = await snapshotRef.get();
        if (!snap.exists) {
            logger.info(`[taskArchiveSnapshot] Snapshot ${snapshotId} not found in ${relationshipId}. OK.`);
            return;
        }

        const data = snap.data();
        if (data.isArchived) {
            logger.info(`[taskArchiveSnapshot] Snapshot ${snapshotId} already archived. OK.`);
            return;
        }

        await snapshotRef.update({
            isArchived: true,
            archivedAt: Timestamp.now(),
        });

        logger.info(`[taskArchiveSnapshot] Snapshot ${snapshotId} in relationship ${relationshipId} archived successfully.`);
    }
);
