const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { COLLECTIONS } = require('../config/constants');

/**
 * LogActivity API 
 * Mapeo controlado del log de actividades.
 */
exports.logActivity = onCall({ region: 'us-central1' }, async (request) => {
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
        console.error('Error logging activity:', error);
        // Fallamos silenciosamente para no bloquear la app
        return { success: false, error: error.message };
    }
});
