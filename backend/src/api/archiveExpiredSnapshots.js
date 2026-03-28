import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const archiveExpiredSnapshots = onSchedule({
    schedule: 'every 6 hours',
    region: 'us-central1',
    timeZone: 'America/Mexico_City',
    retryCount: 3,
}, async () => {
    const db = getFirestore();
    const now = Timestamp.now();

    // Query snapshots that have expired but are not yet archived across ALL relationships
    const snapshotsSnap = await db.collectionGroup(COLLECTIONS.INSTANTANEAS)
        .where('expiresAt', '<=', now)
        .where('isArchived', '==', false)
        .get();

    if (snapshotsSnap.empty) {
        logger.info('[archiveExpiredSnapshots] No expired snapshots to archive.');
        return;
    }

    // Batch update
    const batch = db.batch();
    snapshotsSnap.docs.forEach(doc => {
        batch.update(doc.ref, {
            isArchived: true,
            archivedAt: now,
        });
    });

    await batch.commit();
    logger.info(`[archiveExpiredSnapshots] Archived ${snapshotsSnap.size} snapshots.`);
});
