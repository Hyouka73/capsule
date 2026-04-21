import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';
import { getFirestore } from 'firebase-admin/firestore';

const RELATIONSHIP_SNAPSHOT_PATH = `${COLLECTIONS.RELATIONSHIPS}/{relationshipId}/${COLLECTIONS.INSTANTANEAS}/{snapshotId}`;

/**
 * onSnapshotCreatedHandler
 * Procesamiento de la snapshot una vez que el backend ha terminado (isProcessed: true).
 */
export const onSnapshotCreatedHandler = async (event) => {
    const { relationshipId, snapshotId } = event.params;
    const data = event.data?.after?.data();
    const prevData = event.data?.before?.data() || {};
    
    if (!data) return; // Borrado

    // SOLO actuar si isProcessed acaba de cambiar a true
    const wasProcessed = prevData.isProcessed === true;
    const isNowProcessed = data.isProcessed === true;
    
    if (wasProcessed || !isNowProcessed) {
        logger.info(`[onSnapshotCreated] Skipping: not the processing completion event for ${snapshotId}`);
        return;
    }

    logger.info(`[onSnapshotCreated] Triggered for relationship ${relationshipId} and snapshot ${snapshotId}`);

    const createdBy = data.createdBy;
    const message = data.message || '';

    if (!createdBy) {
        logger.error(`[onSnapshotCreated] Missing createdBy for snapshot ${snapshotId}`);
        return;
    }

    const db = getFirestore();

    try {
        // 1. Throttling: solo notificar si no hay snapshots sin ver previos del mismo usuario
        // Esto evita spamear a la pareja si subes 10 fotos seguidas de chingadazo
        const unseenSnap = await db
            .collection(COLLECTIONS.RELATIONSHIPS)
            .doc(relationshipId)
            .collection(COLLECTIONS.INSTANTANEAS)
            .where('isSeen', '==', false)
            .where('createdBy', '==', createdBy)
            .get();

        if (unseenSnap.size > 1) {
            logger.info(`[onSnapshotCreated] Partner already has ${unseenSnap.size} unseen snapshots from this uploader. Skipping notification to prevent spam.`);
            // Aún así creamos la tarea de archivado, por si acaso
            const { cloudTasksService } = await import('../services/cloudTasksService.js');
            await cloudTasksService.createSnapshotArchiveTask(relationshipId, snapshotId, 24);
            return;
        }

        // 2. Fetch uploader info and global names config
        const [uploaderSnap, namesSnap] = await Promise.all([
            db.collection(COLLECTIONS.USERS).doc(createdBy).get(),
            db.collection(COLLECTIONS.RELATIONSHIPS).doc(relationshipId).collection('config').doc('names').get()
        ]);

        const uploaderData = uploaderSnap.exists ? uploaderSnap.data() : {};
        const namesData = namesSnap.exists ? namesSnap.data() : {};

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

        // 4. Send notification (DATA ONLY)
        const payload = {
            data: {
                title: '📸 ¡Nueva Instantánea!',
                body: `${uploaderName} ha capturado un momento para ti ✨${message ? `\n"${message}"` : ''}`,
                image: data.photoUrl || '',
                type: 'snapshot',
                snapshotId: snapshotId,
                relationshipId: relationshipId,
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                link: '/snapshots'
            }
        };

        const { sendToUser } = await import('../services/fcmService.js');
        const { cloudTasksService } = await import('../services/cloudTasksService.js');
        
        // Ejecución en paralelo: Notificación + Tarea de Archivado (24h después)
        const [notifResult, taskResult] = await Promise.allSettled([
            sendToUser(partnerUid, payload),
            cloudTasksService.createSnapshotArchiveTask(relationshipId, snapshotId, 24)
        ]);
        
        if (notifResult.status === 'fulfilled' && notifResult.value) {
            logger.info(`[onSnapshotCreated] Notification sent for snapshot ${snapshotId}`);
        }
        
        if (taskResult.status === 'fulfilled') {
            logger.info(`[onSnapshotCreated] Archive task scheduled successfully for ${snapshotId}`);
        }

    } catch (error) {
        logger.error(`[onSnapshotCreated] Critical error for snapshot ${snapshotId}:`, error);
    }
};
