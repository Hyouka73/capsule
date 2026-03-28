import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * deleteMemory API - Realiza un borrado lógico de un recuerdo.
 * Marca el documento como isDeleted: true para ocultarlo sin borrar los datos físicamente.
 */
export const deleteMemory = onCall({ region: 'us-central1', cors: true }, async (request) => {
    // 1. Verificar autenticación
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión para borrar un recuerdo.');
    }

    const { memoryId } = request.data || {};

    // 2. Validación de memoryId
    if (!memoryId) {
        throw new HttpsError('invalid-argument', 'El campo memoryId es obligatorio.');
    }

    const db = getFirestore();

    try {
        const relationshipId = request.auth.token.relationshipId;
        if (!relationshipId) {
            throw new HttpsError('failed-precondition', 'El usuario no tiene una relación asignada.');
        }

        const memoryRef = db.collection('relationships')
            .doc(relationshipId)
            .collection(COLLECTIONS.MEMORIES)
            .doc(memoryId);

        // Verificar que el documento exista antes de intentar actualizar
        const doc = await memoryRef.get();
        if (!doc.exists) {
            throw new HttpsError('not-found', 'El recuerdo no existe.');
        }

        // 3. Ejecutar el borrado lógico (soft delete)
        await memoryRef.update({
            isDeleted: true,
            deletedAt: FieldValue.serverTimestamp()
        });

        return {
            success: true,
            message: 'Recuerdo borrado (lógicamente) correctamente.'
        };
    } catch (error) {
        if (error instanceof HttpsError) throw error;

        logger.error('Error in deleteMemory:', error);
        throw new HttpsError('internal', 'Falló el borrado del recuerdo en la base de datos.');
    }
});
