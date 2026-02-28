import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * updateMemory API - Modifica un recuerdo existente.
 * Permite actualizaciones parciales enviando solo los campos necesarios.
 */
export const updateMemory = onCall({ region: 'us-central1' }, async (request) => {
    // 1. Verificar autenticación
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión para actualizar un recuerdo.');
    }

    const { memoryId, title, description, eventDate, tags, adminNotes, placeId, placeName, isHidden } = request.data || {};

    // 2. Validación de memoryId
    if (!memoryId) {
        throw new HttpsError('invalid-argument', 'El campo memoryId es obligatorio.');
    }

    const db = getFirestore();
    const updates = {};

    // 3. Construir objeto de actualizaciones solo con los campos presentes
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (eventDate !== undefined) updates.eventDate = eventDate ? new Date(eventDate) : null;
    if (Array.isArray(tags)) updates.tags = tags;
    if (adminNotes !== undefined) updates.adminNotes = adminNotes;
    if (placeId !== undefined) updates.placeId = placeId;
    if (placeName !== undefined) updates.placeName = placeName;
    if (isHidden !== undefined) updates.isHidden = isHidden;

    // Agregar fecha de actualización
    updates.updatedAt = FieldValue.serverTimestamp();

    try {
        const memoryRef = db.collection(COLLECTIONS.MEMORIES).doc(memoryId);

        // Verificar que el documento exista antes de intentar actualizar
        const doc = await memoryRef.get();
        if (!doc.exists) {
            throw new HttpsError('not-found', 'El recuerdo no existe.');
        }

        // 4. Ejecutar la actualización
        await memoryRef.update(updates);

        return {
            success: true,
            memoryId,
            message: 'Recuerdo actualizado correctamente.'
        };
    } catch (error) {
        if (error instanceof HttpsError) throw error;

        logger.error('Error in updateMemory:', error);
        throw new HttpsError('internal', 'Falló la actualización del recuerdo en la base de datos.');
    }
});
