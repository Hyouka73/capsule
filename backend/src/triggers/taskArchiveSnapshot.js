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
        const { snapshotId } = request.data;
        if (!snapshotId) {
            console.error('[taskArchiveSnapshot] No snapshotId in payload, skipping.');
            return;
        }

        const db = getFirestore();
        const snapshotRef = db.collection(COLLECTIONS.INSTANTANEAS).doc(snapshotId);

        const snap = await snapshotRef.get();
        if (!snap.exists) {
            console.log(`[taskArchiveSnapshot] Snapshot ${snapshotId} not found (may have been deleted). OK.`);
            return;
        }

        const data = snap.data();
        if (data.isArchived) {
            console.log(`[taskArchiveSnapshot] Snapshot ${snapshotId} already archived. OK.`);
            return;
        }

        await snapshotRef.update({
            isArchived: true,
            archivedAt: Timestamp.now(),
        });

        console.log(`[taskArchiveSnapshot] Snapshot ${snapshotId} archived successfully.`);
    }
);
