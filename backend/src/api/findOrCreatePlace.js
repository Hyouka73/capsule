import { onCall } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';


function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
}

/**
 * findOrCreatePlace API 
 * Backend Service: Mapea la lógica transaccional de lugares.
 */
export const findOrCreatePlace = onCall({ region: 'us-central1' }, async (request) => {
    // 1. Verificación básica (solo autenticados)
    if (!request.auth) return { success: false, error: 'Unauthorized' };

    const { lat, lng, name, city, category, tags } = request.data;
    if (!lat || !lng) return { success: false, error: 'Coordenadas incompletas.' };

    const db = getFirestore();
    const placesRef = db.collection(COLLECTIONS.PLACES);

    try {
        // 1. Intentar buscar por cercanía primero (Lógica más robusta que nombre exacto)
        // Reutilizamos la lógica de placesApi si es posible, o implementamos una simple aquí.
        const allPlacesSnapshot = await placesRef.get();
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        // Radio de 100 metros para considerar que es el mismo lugar
        const RADIUS_M = 100;

        let existingPlaceId = null;
        allPlacesSnapshot.forEach(doc => {
            const data = doc.data();
            const pLat = data.location?.lat || data.coordinates?.lat;
            const pLng = data.location?.lng || data.coordinates?.lng;

            if (pLat && pLng) {
                const dist = haversineDistance(latNum, lngNum, pLat, pLng);
                if (dist <= RADIUS_M) {
                    existingPlaceId = doc.id;
                }
            }
        });

        if (existingPlaceId) {
            await placesRef.doc(existingPlaceId).update({
                visitCount: FieldValue.increment(1),
                updatedAt: FieldValue.serverTimestamp()
            });
            return { success: true, placeId: existingPlaceId };
        }

        // 2. Si no hay cercano y no hay nombre, generamos uno genérico
        const finalName = name || `Lugar en ${city || 'Mapa'} (${latNum.toFixed(4)}, ${lngNum.toFixed(4)})`;

        // 3. Crear nuevo lugar
        const newPlaceRef = await placesRef.add({
            name: finalName,
            city: city || '',
            location: {
                lat: latNum,
                lng: lngNum
            },
            coordinates: { // Keep both formats for compatibility
                lat: latNum,
                lng: lngNum
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
