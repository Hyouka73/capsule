import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * createMemory API - Solo para usuarios autenticados (Admin o Partner)
 * Valida los datos y maneja la escritura en Firestore de forma segura.
 */
export const createMemory = onCall({ region: 'us-central1' }, async (request) => {
    // 1. Verificar autenticación
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Debes iniciar sesión para crear un recuerdo.');
    }

    const { uid } = request.auth;
    const { title, description, eventDate, tags, adminNotes, placeId, placeName } = request.data;

    // 2. Validación básica de Payload
    if (!eventDate) {
        throw new HttpsError('invalid-argument', 'El campo eventDate es obligatorio.');
    }

    const db = getFirestore();

    // 3. Preparar el mapping de entidad para Firestore
    const memoryData = {
        title: title || 'Recuerdo sin título',
        description: description || null,
        eventDate: new Date(eventDate),
        tags: Array.isArray(tags) ? tags : [],
        adminNotes: adminNotes || null,
        placeId: placeId || null,
        placeName: placeName || null,
        uploadedBy: uid,
        photoCount: 0,
        mainPhotoUrl: null,
        isSpecial: false,
        isHidden: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    try {
        // 4. Escribir a DB desde el lado del servidor
        const memoryRef = await db.collection(COLLECTIONS.MEMORIES).add(memoryData);

        // 5. Retornar solo lo que el Frontend necesita saber
        return {
            success: true,
            memoryId: memoryRef.id,
            message: 'Recuerdo creado correctamente.'
        };
    } catch (error) {
        logger.error('Error in createMemory:', error);
        throw new HttpsError('internal', 'Falló la creación del recuerdo en la base de datos.');
    }
});
