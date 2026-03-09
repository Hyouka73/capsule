import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * getMemories API 
 * Retorna las memorias filtradas y ordenadas centralizando la lógica en el backend.
 */
export const getMemories = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) return { success: false, error: 'Unauthorized' };

    const { limit, pageSize, tag, isSpecial, placeId, lastEventDate, includeHidden = false } = request.data || {};
    const resolvedLimit = limit ?? pageSize ?? 20;

    const db = getFirestore();
    const isAdmin = request.auth.token.role === 'admin';

    let query = db.collection(COLLECTIONS.MEMORIES);

    // Si data.includeHidden === true Y el llamador es el admin, omitir el filtro isHidden.
    // En cualquier otro caso, mantener where('isHidden', '==', false).
    if (!(includeHidden === true && isAdmin)) {
        query = query.where('isHidden', '==', false);
    }

    query = query.orderBy('eventDate', 'desc');

    if (placeId) query = query.where('placeId', '==', placeId);

    if (lastEventDate) {
        query = query.startAfter(new Date(lastEventDate));
    }

    query = query.limit(resolvedLimit);

    try {
        const snapshot = await query.get();
        const memories = snapshot.docs.map(doc => {
            const data = doc.data();
            // Handle GeoPoint to plain object conversion for places/location
            if (data.location && typeof data.location.toDate !== 'function' && data.location.latitude) {
                data.location = { lat: data.location.latitude, lng: data.location.longitude };
            }

            return {
                id: doc.id,
                ...data,
                // Convertimos Timestamp a ISO String para que pase limpio por la red
                eventDate: data.eventDate?.toDate()?.toISOString(),
                createdAt: data.createdAt?.toDate()?.toISOString(),
                updatedAt: data.updatedAt?.toDate()?.toISOString(),
            };
        });

        return {
            success: true,
            docs: memories,
            lastEventDate: memories[memories.length - 1]?.eventDate ?? null
        };
    } catch (error) {
        logger.error('Error fetching memories:', error);
        return { success: false, error: 'Error interno del servidor.' };
    }
});
