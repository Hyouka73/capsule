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
        // [DEPURACIÓN] Removido throttling temporalmente para asegurar que la primera notificación llegue
        // 1. Preparar tarea de archivado
        const { cloudTasksService } = await import('../services/cloudTasksService.js');
        const taskPromise = cloudTasksService.createSnapshotArchiveTask(relationshipId, snapshotId, 24);

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

        // 3. Find recipient (the person who did NOT create the snapshot)
        const relationshipUsersSnap = await db.collection(COLLECTIONS.USERS)
            .where('relationshipId', '==', relationshipId)
            .get();

        const partnerDoc = relationshipUsersSnap.docs.find(doc => doc.id !== createdBy);

        if (!partnerDoc) {
            logger.warn(`[onSnapshotCreated] No recipient found for relationship ${relationshipId} other than uploader ${createdBy}`);
            // Aún así esperamos la tarea de archivado
            await taskPromise;
            return;
        }

        const partnerUid = partnerDoc.id;

        // 4. Send notification
        // NOTA: Incluimos title y body a nivel superior para que FCM cree el bloque 'notification' automáticamente
        const payload = {
            title: '📸 ¡Nueva Instantánea!',
            body: `${uploaderName} ha capturado un momento para ti ✨${message ? `\n"${message}"` : ''}`,
            data: {
                title: '📸 ¡Nueva Instantánea!',
                body: `${uploaderName} ha capturado un momento para ti ✨${message ? `\n"${message}"` : ''}`,
                image: data.photoUrl || '',
                type: 'snapshot',
                snapshotId: snapshotId,
                relationshipId: relationshipId,
                link: '/snapshots'
            }
        };

        const { sendToUser } = await import('../services/fcmService.js');
        
        // Ejecución en paralelo: Notificación + Tarea de Archivado
        const [notifResult, taskResult] = await Promise.allSettled([
            sendToUser(partnerUid, payload),
            taskPromise
        ]);
        
        // Logs detallados para depuración en producción
        if (notifResult.status === 'fulfilled') {
            if (notifResult.value) {
                logger.info(`[onSnapshotCreated] Notification SENT successfully to ${partnerUid} for snapshot ${snapshotId}`);
            } else {
                logger.warn(`[onSnapshotCreated] Notification NOT sent to ${partnerUid}: User has no active FCM tokens.`);
            }
        } else {
            logger.error(`[onSnapshotCreated] FAILED to send notification to ${partnerUid}:`, notifResult.reason);
        }
        
        if (taskResult.status === 'fulfilled') {
            logger.info(`[onSnapshotCreated] Archive task scheduled successfully for ${snapshotId}`);
        } else {
            logger.error(`[onSnapshotCreated] FAILED to schedule archive task for ${snapshotId}:`, taskResult.reason);
        }

    } catch (error) {
        logger.error(`[onSnapshotCreated] Critical error for snapshot ${snapshotId}:`, error);
    }
};
