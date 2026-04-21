import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * taskArchiveSnapshot — Cloud Task Handler (HTTPS)
 * Called by Cloud Tasks 24 hours after snapshot creation.
 */
export const handler = onRequest({
    region: 'us-central1',
    invoker: 'private', // Solo Cloud Tasks (OIDC) via cloudTasksService
}, async (req, res) => {
    // 1. Validar método
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        const { snapshotId, relationshipId } = req.body;

        if (!snapshotId || !relationshipId) {
            logger.error('[taskArchiveSnapshot] Missing snapshotId or relationshipId in body');
            res.status(400).send('Missing parameters');
            return;
        }

        const db = getFirestore();
        const snapshotRef = db.collection(COLLECTIONS.RELATIONSHIPS)
            .doc(relationshipId)
            .collection(COLLECTIONS.INSTANTANEAS)
            .doc(snapshotId);

        const snap = await snapshotRef.get();
        if (!snap.exists) {
            logger.info(`[taskArchiveSnapshot] Snapshot ${snapshotId} not found. Safe skip.`);
            res.status(200).send('Not found');
            return;
        }

        const data = snap.data();
        if (data.isArchived) {
            logger.info(`[taskArchiveSnapshot] Snapshot ${snapshotId} already archived.`);
            res.status(200).send('Already archived');
            return;
        }

        // Ejecutar archivado
        await snapshotRef.update({
            isArchived: true,
            archivedAt: Timestamp.now(),
        });

        logger.info(`[taskArchiveSnapshot] Snapshot ${snapshotId} in ${relationshipId} archived successfully.`);
        res.status(200).send('Archived successfully');

    } catch (error) {
        logger.error('[taskArchiveSnapshot] Error processing task:', error);
        res.status(500).send('Internal Server Error');
    }
});
