import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

/**
 * Converts a Firestore Timestamp, Date, seconds-object, or number to milliseconds.
 */
function toMs(val) {
    if (!val) return 0;
    if (typeof val.toMillis === 'function') return val.toMillis();
    // Support for both standard ('seconds') and emulator ('_seconds') formats
    if (typeof val === 'object') {
        if (val.seconds) return val.seconds * 1000;
        if (val._seconds) return val._seconds * 1000;
    }
    if (typeof val === 'number') return val;
    if (val instanceof Date) return val.getTime();
    return 0;
}

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    const { relationshipId } = request.auth.token;
    if (!relationshipId) throw new HttpsError('failed-precondition', 'Relationship ID missing from token.');

    const { clientUpdatedAt } = request.data || {};

    const db = getFirestore();
    const relRef = db.collection('relationships').doc(relationshipId);
    const configColl = relRef.collection('config');

    try {
        const [relSnap, snapshots] = await Promise.all([
            relRef.get(),
            configColl.get()
        ]);

        if (!relSnap.exists) {
            return { success: false, error: 'Relación no encontrada.' };
        }

        if (snapshots.empty) {
            return { success: false, error: 'Configuración no encontrada.' };
        }

        const config = {};
        let maxUpdatedAt = 0;
        snapshots.forEach(doc => {
            const data = doc.data();
            config[doc.id] = data;
            
            const updatedAt = data.updatedAt;
            if (updatedAt) {
                const ms = toMs(updatedAt);
                if (ms > maxUpdatedAt) maxUpdatedAt = ms;
            }
        });

        // If client is already up-to-date, skip the response payload
        if (clientUpdatedAt && clientUpdatedAt >= maxUpdatedAt) {
            return { unchanged: true };
        }

        // Incorporate primary relationship data as an virtual 'config' doc
        config['relationship'] = {
            ...config['relationship'],
            ...relSnap.data()
        };

        return {
            success: true,
            config,
            serverUpdatedAt: maxUpdatedAt
        };
    } catch (error) {
        logger.error('getAppConfig error:', { relationshipId, error: error.message });
        throw new HttpsError('internal', 'Error al obtener configuración.');
    }
};
