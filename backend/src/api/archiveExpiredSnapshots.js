/**
 * archiveExpiredSnapshots — Scheduled Cloud Function (every 6 hours)
 *
 * Queries snapshots where expiresAt <= now and isArchived != true,
 * then marks them as archived so they appear in the gallery.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

export const archiveExpiredSnapshots = onSchedule({
    schedule: 'every 6 hours',
    region: 'us-central1',
    timeZone: 'America/Mexico_City',
    retryCount: 3,
}, async () => {
    const db = getFirestore();
    const now = Timestamp.now();

    // Query snapshots that have expired but are not yet archived
    const snapshot = await db.collection('instantaneas')
        .where('expiresAt', '<=', now)
        .where('isArchived', '==', false)
        .get();

    if (snapshot.empty) {
        console.log('[archiveExpiredSnapshots] No expired snapshots to archive.');
        return;
    }

    // Batch update (max 500 per batch — should be well within limits)
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
            isArchived: true,
            archivedAt: now,
        });
    });

    await batch.commit();
    console.log(`[archiveExpiredSnapshots] Archived ${snapshot.size} snapshots.`);
});
