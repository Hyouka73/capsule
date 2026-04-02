import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

/**
 * Converts a Firestore Timestamp, Date, seconds-object, or number to milliseconds.
 */
function toMs(val) {
    if (!val) return 0;
    if (typeof val.toMillis === 'function') return val.toMillis();
    if (typeof val === 'object' && val.seconds) return val.seconds * 1000;
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
    const configColl = db.collection('relationships').doc(relationshipId).collection('config');

    try {
        const snapshots = await configColl.get();

        if (snapshots.empty) {
            return { success: false, error: 'Configuración no encontrada.' };
        }

        const config = {};
        let maxUpdatedAt = 0;

        snapshots.forEach(doc => {
            const data = doc.data();
            config[doc.id] = data;
            const docUpdatedAt = toMs(data?.updatedAt);
            if (docUpdatedAt > maxUpdatedAt) maxUpdatedAt = docUpdatedAt;
        });

        // If client is already up-to-date, skip the response payload
        if (clientUpdatedAt && clientUpdatedAt >= maxUpdatedAt) {
            return { unchanged: true };
        }

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
