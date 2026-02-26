import { onCall } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { COLLECTIONS } from '../config/constants.js';

/**
 * getMemories API 
 * Retorna las memorias filtradas y ordenadas centralizando la lógica en el backend.
 */
export const getMemories = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) return { success: false, error: 'Unauthorized' };

    const { limit = 20, tag, isSpecial, placeId, lastEventDate } = request.data || {};

    const db = getFirestore();
    let query = db.collection(COLLECTIONS.MEMORIES)
        .where('isHidden', '==', false)
        .orderBy('eventDate', 'desc');

    if (placeId) query = query.where('placeId', '==', placeId);

    if (lastEventDate) {
        query = query.startAfter(new Date(lastEventDate));
    }

    query = query.limit(limit);

    try {
        const snapshot = await query.get();
        const memories = snapshot.docs.map(doc => ({
            id: doc.id,
            // Convertimos Timestamp a ISO String para que pase limpio por la red
            ...doc.data(),
            eventDate: doc.data().eventDate?.toDate()?.toISOString(),
            createdAt: doc.data().createdAt?.toDate()?.toISOString(),
            updatedAt: doc.data().updatedAt?.toDate()?.toISOString(),
        }));

        return {
            success: true,
            memories,
            lastEventDate: memories[memories.length - 1]?.eventDate ?? null
        };
    } catch (error) {
        console.error('Error fetching memories:', error);
        return { success: false, error: 'Error interno del servidor.' };
    }
});
