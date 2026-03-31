import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * markLogAsRead API
 * Allows an Admin to mark a specific activity log or ALL logs as read.
 * Scoped by relationshipId.
 */
export const markLogAsRead = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión.');
    }

    const { logId, markAll = false } = request.data;
    const relationshipId = request.auth.token.relationshipId;
    const isAdmin = request.auth.token.role === 'admin';

    if (!isAdmin) {
        throw new HttpsError('permission-denied', 'Solo los administradores pueden marcar logs como leídos.');
    }

    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'No tienes una relación activa.');
    }

    const db = getFirestore();
    const logRef = db
        .collection('relationships')
        .doc(relationshipId)
        .collection(COLLECTIONS.ACTIVITY_LOG);

    try {
        if (markAll) {
            const unreadQuery = await logRef
                .where('isReadByAdmin', '==', false)
                .get();

            if (unreadQuery.empty) return { success: true, count: 0 };

            const batch = db.batch();
            unreadQuery.docs.forEach(doc => {
                batch.update(doc.ref, { 
                    isReadByAdmin: true,
                    readAt: FieldValue.serverTimestamp()
                });
            });

            await batch.commit();
            return { success: true, count: unreadQuery.size };
        } else {
            if (!logId) {
                throw new HttpsError('invalid-argument', 'Se requiere logId para marcar un log individual.');
            }

            const docRef = logRef.doc(logId);
            const snap = await docRef.get();

            if (!snap.exists) {
                throw new HttpsError('not-found', 'Log no encontrado.');
            }

            // DOUBLE VALIDATION: Check that the log's relationshipId matches the admin's relationshipId
            // (Even though it's already in the subcollection path, we check the data too for consistency)
            if (snap.data().relationshipId !== relationshipId) {
                throw new HttpsError('permission-denied', 'No tienes permiso para modificar este log (pertenece a otra relación).');
            }

            await docRef.update({ 
                isReadByAdmin: true,
                readAt: FieldValue.serverTimestamp()
            });
            return { success: true };
        }
    } catch (error) {
        logger.error('Error in markLogAsRead:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Error al actualizar el estado del log.');
    }
});

