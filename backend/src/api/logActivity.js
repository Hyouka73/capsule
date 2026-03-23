import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * LogActivity API 
 * Mapeo controlado del log de actividades.
 */
export const logActivity = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Operación denegada.');
    }

    const { action, targetType, targetId, metadata, displayText } = request.data;

    if (!action || !targetType || !targetId) {
        throw new HttpsError('invalid-argument', 'Faltan campos obligatorios para el log.');
    }

    const db = getFirestore();

    const logData = {
        userId: request.auth.uid,
        action,
        targetType,
        targetId,
        metadata: metadata || {},
        displayText: displayText || 'Realizó una acción',
        isReadByAdmin: false,
        createdAt: FieldValue.serverTimestamp(),
    };

    try {
        await db.collection(COLLECTIONS.ACTIVITY_LOG).add(logData);
        return { success: true };
    } catch (error) {
        logger.error('Error logging activity:', error);
        // Fallamos silenciosamente para no bloquear la app
        return { success: false, error: 'Error interno del servidor.' };
    }
});
