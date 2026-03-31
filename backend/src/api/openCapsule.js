import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS, CAPSULE_DESTRUCTION_WINDOW_MS } from '../config/constants.js';

export const openCapsule = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión para abrir una cápsula.');
    }

    const { relationshipId, role, uid } = request.auth.token;
    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'Usuario sin relación activa.');
    }

    const { capsuleId } = request.data;
    if (!capsuleId) {
        throw new HttpsError('invalid-argument', 'Se requiere el ID de la cápsula.');
    }

    const db = getFirestore();
    const capsuleRef = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.CAPSULES).doc(capsuleId);

    try {
        let capsuleData;

        // 1. Transactional Update
        await db.runTransaction(async (t) => {
            const snap = await t.get(capsuleRef);
            if (!snap.exists) {
                throw new HttpsError('not-found', 'Cápsula no encontrada.');
            }
            capsuleData = snap.data();

            if (!capsuleData.isUnlocked) {
                throw new HttpsError('permission-denied', 'Esta cápsula aún está bloqueada.');
            }

            if (capsuleData.status === 'destroyed') {
                throw new HttpsError('failed-precondition', 'Esta cápsula ya fue destruida.');
            }

            const updates = {
                openedAt: FieldValue.serverTimestamp(),
                status: 'opened'
            };

            // Behavior: Auto-Destruct
            if (capsuleData.autoDestroy) {
                // We mark it as 'pending_destruction' and set a 24h window.
                updates.status = 'pending_destruction';
                updates.destroyedAt = Timestamp.fromMillis(Date.now() + CAPSULE_DESTRUCTION_WINDOW_MS);
            }

            t.update(capsuleRef, updates);

            // 2. Activity Log
            const logEntry = {
                userId: uid,
                relationshipId: relationshipId,
                action: 'capsule_opened',
                targetType: 'capsule',
                targetId: capsuleId,
                displayText: `Abrió la cápsula: ${capsuleData.title || 'sin título'}`,
                isReadByAdmin: false,
                readAt: null,
                createdAt: FieldValue.serverTimestamp(),
            };
            const logRef = db
                .collection('relationships')
                .doc(relationshipId)
                .collection(COLLECTIONS.ACTIVITY_LOG)
                .doc();
            t.set(logRef, logEntry);
        });

        // 3. FCM Notification to Admin (partner opened)
        if (role !== 'admin') {
            try {
                const relSnap = await db.collection('relationships').doc(relationshipId).get();
                const members = relSnap.data()?.members || [];
                const adminUid = members.find(m => m !== uid);
                
                if (adminUid) {
                    const { sendToUser } = await import('../services/fcmService.js');
                    await sendToUser(adminUid, {
                        title: '📂 Cápsula Abierta',
                        body: `Tu pareja ha abierto la cápsula: ${capsuleData.title || 'sin título'}.`,
                        data: {
                            type: 'capsule_opened',
                            capsuleId: capsuleId,
                        }
                    });
                }
            } catch (fcmErr) {
                logger.warn('FCM notification failed in openCapsule:', fcmErr.message);
            }
        }

        return {
            success: true,
            capsule: {
                ...capsuleData,
                id: capsuleId,
                status: capsuleData.autoDestroy ? 'pending_destruction' : 'opened'
            }
        };

    } catch (error) {
        logger.error(`Error in openCapsule [${capsuleId}]:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Falló la apertura de la cápsula.');
    }
});

