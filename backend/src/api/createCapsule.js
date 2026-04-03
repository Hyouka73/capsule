import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { logger } from 'firebase-functions';
import { COLLECTIONS, ACTIVITY_ACTIONS } from '../config/constants.js';
import { logActivity } from '../services/activityService.js';

/**
 * createCapsule — Serverless BFF API
 * 
 * Crea una nueva cápsula del tiempo en la subcolección de la relación.
 */
export const handler = async (request) => {
    if (!request.auth) {
        logger.error('createCapsule: Unauthenticated request');
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión para crear una cápsula.');
    }

    const { uid } = request.auth;
    const { relationshipId } = request.auth.token;
    logger.info(`createCapsule: Starting for uid: ${uid}, relationshipId: ${relationshipId}`);

    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'El usuario no tiene una relación activa.');
    }

    const { 
        id,
        title, teaserMessage, message, unlockTrigger, unlockDate, 
        autoDestroy, notifyOnUnlock, attachments = [] 
    } = request.data;

    if (!title || !unlockTrigger) {
        throw new HttpsError('invalid-argument', 'El título y el motivo de desbloqueo son obligatorios.');
    }

    const db = getFirestore();
    const capsCollection = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.CAPSULES);
    
    let existingData = null;
    let capsuleRef = id ? capsCollection.doc(id) : capsCollection.doc();

    if (id) {
        const snap = await capsuleRef.get();
        if (snap.exists) {
            existingData = snap.data();
            
            // REGLA CRÍTICA: Inmutabilidad si ya fue enviada/desbloqueada
            if (existingData.isUnlocked) {
                throw new HttpsError('failed-precondition', 'Esta cápsula ya fue enviada y no puede ser modificada.');
            }
        }
    }

    // 1. Fetch Relationship for partner detection
    const relRef = db.collection('relationships').doc(relationshipId);
    const relSnap = await relRef.get();
    
    if (!relSnap.exists) {
        throw new HttpsError('not-found', 'Relación no encontrada.');
    }
    
    const relData = relSnap.data();
    // FIX: Usamos adminUid y partnerUid reales, sin inventar un campo "members".
    const partnerUid = uid === relData.adminUid ? relData.partnerUid : relData.adminUid;

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
    const unlockMillis = parsedUnlockDate ? parsedUnlockDate.toMillis() : 0;
    
    logger.info(`createCapsule Timing Check: now=${now}, unlockDate=${unlockMillis}, diff=${unlockMillis - now}ms`);

    const isUnlocked = unlockTrigger === 'manual' ? false : (parsedUnlockDate ? unlockMillis <= now : false);

    const capsuleData = {
        title,
        teaserMessage: teaserMessage || 'Tienes un mensaje bloqueado.',
        message: message || null,
        createdBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
        relationshipId,
        recipientUid: partnerUid,

        unlockTrigger, 
        unlockDate: parsedUnlockDate,
        isUnlocked: isUnlocked,
        unlockedAt: isUnlocked ? (existingData?.unlockedAt || FieldValue.serverTimestamp()) : null,
        status: isUnlocked ? 'unlocked' : 'locked',

        autoDestroy: autoDestroy || false, 
        notifyOnUnlock: notifyOnUnlock !== undefined ? notifyOnUnlock : true,

        // MANEJO DE ARCHIVOS: Si es edición, combinamos los existentes con los nuevos.
        files: existingData?.files 
            ? [...existingData.files, ...attachments] 
            : attachments,
        hasAttachments: (existingData?.files?.length || 0) + attachments.length > 0,
    };

    if (!id) {
        capsuleData.createdAt = FieldValue.serverTimestamp();
    }

    // Determinar cambios para gestión de Cloud Tasks
    // Usamos el operador ?. para evitar errores si las fechas son nulas/no válidas
    const existingDateMillis = existingData?.unlockDate?.toMillis?.() || 0;
    const newDateMillis = parsedUnlockDate?.toMillis?.() || 0;
    
    const dateChanged = existingData && existingData.unlockTrigger === 'date' && 
                      existingDateMillis !== newDateMillis;
    
    const triggerToManual = existingData && existingData.unlockTrigger === 'date' && unlockTrigger === 'manual';

    try {
        // 1. Eliminar task anterior si existe y cambió la fecha o el trigger
        if ((dateChanged || triggerToManual) && existingData?.cloudTaskName) {
            try {
                const queue = getFunctions().taskQueue('taskUnlockCapsule');
                await queue.delete(existingData.cloudTaskName);
                logger.info(`Eliminada Cloud Task anterior: ${existingData.cloudTaskName}`);
                capsuleData.cloudTaskName = null;
            } catch (err) {
                logger.warn('No se pudo borrar la tarea anterior (tal vez ya se ejecutó o no existe):', err.message);
            }
        }

        // 2. Encolar nueva task si aplica
        if (!isUnlocked && unlockTrigger === 'date' && parsedUnlockDate) {
            // Solo encolar si es nueva o si la fecha cambió
            if (!id || dateChanged || existingData?.unlockTrigger !== 'date') {
                try {
                    const queue = getFunctions().taskQueue('taskUnlockCapsule');
                    const taskResult = await queue.enqueue(
                        { capsuleId: capsuleRef.id, relationshipId },
                        { scheduleTime: parsedUnlockDate.toDate() }
                    );
                    // Guardamos el nombre completo de la tarea para poder borrarla después
                    capsuleData.cloudTaskName = taskResult.name;
                    logger.info(`Nueva Cloud Task programada: ${taskResult.name} para ${parsedUnlockDate.toDate()}`);
                } catch (taskErr) {
                    logger.warn('Error al encolar Cloud Task (posiblemente omitido en emulador):', taskErr.message);
                    // No lanzamos error para permitir que la cápsula se cree/actualice de todos modos
                }
            }
        }

        logger.info(`createCapsule: Saving to Firestore for capsule ${capsuleRef.id}`);
        // Guardar en Firestore
        if (existingData) {
            await capsuleRef.update(capsuleData);
        } else {
            // Si no existía, añadimos el timestamp de creación
            await capsuleRef.set({
                ...capsuleData,
                createdAt: FieldValue.serverTimestamp()
            });
        }

        // 3. FCM Notification to Partner (solo si es nueva)
        if (!existingData) {
            try {
                const { fcmService } = await import('../services/fcmService.js');
                await fcmService.sendToUser(partnerUid, {
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
        }

        // 4. Log Activity (non-critical — don't kill the operation if this fails)
        try {
            await logActivity({
                relationshipId,
                userId: uid,
                action: existingData ? ACTIVITY_ACTIONS.CAPSULE_UPDATED : ACTIVITY_ACTIONS.CAPSULE_CREATED,
                targetType: COLLECTIONS.CAPSULES,
                targetId: capsuleRef.id,
                displayText: existingData ? `actualizó la cápsula: ${title}` : `enterró una nueva cápsula: ${title}`,
                metadata: {
                    title,
                    unlockTrigger,
                    unlockDate: parsedUnlockDate ? parsedUnlockDate.toDate() : null
                }
            });
        } catch (logErr) {
            logger.warn('Activity logging failed (non-critical):', logErr.message);
        }

        return {
            success: true,
            capsuleId: capsuleRef.id,
            message: id ? 'Cápsula actualizada exitosamente.' : 'Cápsula creada exitosamente.'
        };
    } catch (error) {
        logger.error('Error in createCapsule handler:', error.message, error.stack);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', `Error al procesar la cápsula: ${error.message}`);
    }
};

