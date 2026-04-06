import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const onSnapshotCreated = onDocumentCreated({
    document: `relationships/{relationshipId}/snapshots/{snapshotId}`,
}, async (event) => {
    const { relationshipId, snapshotId } = event.params;
    logger.info(`[onSnapshotCreated] Triggered for relationship ${relationshipId} and snapshot ${snapshotId}`);

    const snapshot = event.data;
    if (!snapshot) {
        logger.error('[onSnapshotCreated] No snapshot found for event');
        return;
    }
    const data = snapshot.data();
    const createdBy = data.createdBy;
    const message = data.message || '';

    if (!createdBy) {
        logger.error(`[onSnapshotCreated] Missing createdBy for snapshot ${snapshotId}`);
        return;
    }

    const db = (await import('firebase-admin/firestore')).getFirestore();

    try {
        // 1. Throttling: solo notificar si no hay snapshots sin ver previos
        const unseenSnap = await db
            .collection(COLLECTIONS.RELATIONSHIPS)
            .doc(relationshipId)
            .collection(COLLECTIONS.INSTANTANEAS)
            .where('isSeen', '==', false)
            .where('createdBy', '==', createdBy)
            .get();

        if (unseenSnap.size > 1) {
            logger.info(`[onSnapshotCreated] Already ${unseenSnap.size} unseen snapshots. Skipping notification.`);
            return;
        }

        // 1. Fetch uploader info and global names config
        const [uploaderSnap, namesSnap] = await Promise.all([
            db.collection(COLLECTIONS.USERS).doc(createdBy).get(),
            db.collection(COLLECTIONS.RELATIONSHIPS).doc(relationshipId).collection('config').doc('names').get()
        ]);

        const uploaderData = uploaderSnap.exists ? uploaderSnap.data() : {};
        const namesData = namesSnap.exists ? namesSnap.data() : {};

        // Determinar el rol del uploader para saber qué campo usar en names
        const uploaderRole = uploaderData.role || null;
        const nameFromConfig = uploaderRole === 'admin' ? namesData.admin : namesData.partner;
        const uploaderName = nameFromConfig || uploaderData.displayName || 'Tu pareja';

        // 3. Find partner
        const relationshipUsersSnap = await db.collection(COLLECTIONS.USERS)
            .where('relationshipId', '==', relationshipId)
            .get();

        const partnerDoc = relationshipUsersSnap.docs.find(doc => doc.id !== createdBy);

        if (!partnerDoc) {
            logger.warn(`[onSnapshotCreated] No partner found for relationship ${relationshipId}`);
            return;
        }

        const partnerUid = partnerDoc.id;
        const partnerName = partnerDoc.data().displayName || 'Partner';

        // 4. Send notification
        const payload = {
            title: '📸 ¡Nueva Instantánea!',
            body: `${uploaderName} ha capturado un momento para ti ✨${message ? `\n"${message}"` : ''}`,
            image: data.photoUrl || undefined,
            sound: 'default',
            data: {
                type: 'snapshot',
                snapshotId: snapshotId,
                relationshipId: relationshipId,
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
            },
        };

        logger.info(`[onSnapshotCreated] Sending notification to ${partnerName} (${partnerUid})`);
        
        const { sendToUser } = await import('../services/fcmService.js');
        const result = await sendToUser(partnerUid, payload);
        
        if (result) {
            logger.info(`[onSnapshotCreated] Notification sent: Success=${result.successCount}, Failures=${result.failureCount}`);
        } else {
            logger.warn(`[onSnapshotCreated] No tokens found for user ${partnerUid}`);
        }

    } catch (error) {
        logger.error(`[onSnapshotCreated] Critical error for snapshot ${snapshotId}:`, error);
    }
});
