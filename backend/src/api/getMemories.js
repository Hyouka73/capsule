const { onCall } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const { COLLECTIONS } = require('../config/constants');

/**
 * getMemories API 
 * Retorna las memorias filtradas y ordenadas centralizando la lógica en el backend.
 */
exports.getMemories = onCall({ region: 'us-central1' }, async (request) => {
    if (!request.auth) return { success: false, error: 'Unauthorized' };

    const { limit = 20, tag, isSpecial, placeId } = request.data || {};

    const db = getFirestore();
    let query = db.collection(COLLECTIONS.MEMORIES)
        .orderBy('eventDate', 'desc')
        .limit(limit);

    if (tag) query = query.where('tags', 'array-contains', tag);
    if (isSpecial) query = query.where('isSpecial', '==', true);
    if (placeId) query = query.where('placeId', '==', placeId);

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

        return { success: true, memories };
    } catch (error) {
        console.error('Error fetching memories:', error);
        return { success: false, error: 'Error interno del servidor.' };
    }
});
