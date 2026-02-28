import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * findOrCreatePlace API 
 * Backend Service: Mapea la lógica transaccional de lugares.
 */
export const findOrCreatePlace = onCall({ region: 'us-central1' }, async (request) => {
    // 1. Verificación básica (solo autenticados)
    if (!request.auth) return { success: false, error: 'Unauthorized' };

    const { lat, lng, name, city, category, tags } = request.data;
    if (!lat || !lng || !name) return { success: false, error: 'Datos de lugar incompletos.' };

    const db = getFirestore();
    const placesRef = db.collection(COLLECTIONS.PLACES);

    try {
        // En una app real, usaríamos GeoFire. Por ahora, búsqueda exacta o cercanía simple:
        const snapshot = await placesRef
            .where('name', '==', name)
            .where('city', '==', city || '')
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const placeDoc = snapshot.docs[0];
            // Actualizar contadores si aplica
            await placeDoc.ref.update({
                visitCount: FieldValue.increment(1),
                updatedAt: FieldValue.serverTimestamp()
            });
            return { success: true, placeId: placeDoc.id };
        }

        // Si no existe, lo creamos
        const newPlaceRef = await placesRef.add({
            name,
            city: city || '',
            location: {
                lat: parseFloat(lat),
                lng: parseFloat(lng)
            },
            category: category || 'otro',
            tags: tags || [],
            visitCount: 1,
            photoCount: 0,
            createdBy: request.auth.uid,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        return { success: true, placeId: newPlaceRef.id };

    } catch (err) {
        logger.error('Error finding/creating place:', err);
        return { success: false, error: err.message };
    }
});
