import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * createCapsule — Serverless BFF API
 * 
 * Crea una nueva cápsula del tiempo en la subcolección de la relación.
 */
export const createCapsule = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión para crear una cápsula.');
    }

    const { uid } = request.auth;
    const { relationshipId } = request.auth.token;

    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'El usuario no tiene una relación activa.');
    }

    const { 
        title, teaserMessage, message, unlockTrigger, unlockDate, 
        autoDestroy, notifyOnUnlock, attachments = [] 
    } = request.data;

    if (!title || !unlockTrigger) {
        throw new HttpsError('invalid-argument', 'El título y el motivo de desbloqueo son obligatorios.');
    }

    const db = getFirestore();

    // 1. Fetch Relationship for partner detection (1-a-1)
    const relRef = db.collection('relationships').doc(relationshipId);
    const relSnap = await relRef.get();
    
    if (!relSnap.exists) {
        throw new HttpsError('not-found', 'Relación no encontrada.');
    }
    
    const relData = relSnap.data();
    const partnerUid = relData.members.find(m => m !== uid);

    if (!partnerUid) {
        throw new HttpsError('failed-precondition', 'No se encontró un compañero en la relación.');
    }

    // 2. Parse Unlock Date
    let parsedUnlockDate = null;
    if (unlockTrigger === 'date' && unlockDate) {
        const d = new Date(unlockDate);
        if (isNaN(d.getTime())) {
            throw new HttpsError('invalid-argument', 'La fecha de desbloqueo proporcionada no es válida.');
        }
        parsedUnlockDate = Timestamp.fromDate(d);
    }

    const now = Date.now();
    const isUnlocked = unlockTrigger === 'manual' ? false : (parsedUnlockDate ? parsedUnlockDate.toMillis() <= now : true);

    const capsuleData = {
        title,
        teaserMessage: teaserMessage || 'Tienes un mensaje bloqueado.',
        message: message || null,
        createdBy: uid,
        createdAt: FieldValue.serverTimestamp(),
        relationshipId,
        recipientUid: partnerUid,

        unlockTrigger, 
        unlockDate: parsedUnlockDate,
        isUnlocked: isUnlocked,
        unlockedAt: isUnlocked ? FieldValue.serverTimestamp() : null,
        status: isUnlocked ? 'unlocked' : 'locked',

        autoDestroy: autoDestroy || false, 
        notifyOnUnlock: notifyOnUnlock !== undefined ? notifyOnUnlock : true,

        hasAttachments: attachments.length > 0,
        files: attachments,
    };

    try {
        const capsuleRef = await db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.CAPSULES).add(capsuleData);

        // Si la cápsula aún está bloqueada y depende de la fecha, delegamos el despertador a Cloud Tasks
        if (!isUnlocked && unlockTrigger === 'date' && parsedUnlockDate) {
            const queue = getFunctions().taskQueue('taskUnlockCapsule');

            await queue.enqueue(
                { capsuleId: capsuleRef.id, relationshipId },
                { scheduleTime: parsedUnlockDate.toDate() }
            );
            logger.info(`Cloud Task programada para cápsula ${capsuleRef.id} en ${parsedUnlockDate.toDate()}`);
        }

        // 3. FCM Notification to Partner
        try {
            const { fcm } = await import('../services/fcmService.js');
            await fcm.sendToUser(partnerUid, {
                notification: {
                    title: '🎁 ¡Nueva Cápsula!',
                    body: teaserMessage || `${request.auth.token.name || 'Tu pareja'} enterró algo para ti...`,
                },
                data: {
                    type: 'capsule_created',
                    capsuleId: capsuleRef.id,
                }
            });
        } catch (fcmErr) {
            logger.warn('FCM notification failed in createCapsule:', fcmErr.message);
        }

        return {
            success: true,
            capsuleId: capsuleRef.id,
            message: 'Cápsula creada exitosamente.'
        };
    } catch (error) {
        logger.error('Error in createCapsule:', error);
        throw new HttpsError('internal', 'Ocurrió un error al persistir la cápsula en base de datos.');
    }
});

