import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants.js';

/**
 * getAppConfig — Backend API (BFF)
 * 
 * Obtiene la configuración de la aplicación vinculada a la relación.
 * Nueva ruta: relationships/{id}/config/main
 */
export const getAppConfig = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { relationshipId } = request.auth.token;
    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'Relationship ID missing.');
    }

    const db = getFirestore();

    try {
        const configColl = db.collection('relationships').doc(relationshipId).collection('config');
        const configSnap = await configColl.get();

        if (configSnap.empty) {
            // Check legacy root collection if subcollection is empty
            const oldConfigRef = db.collection(COLLECTIONS.APP_CONFIG).doc(SINGLETON_DOCS.APP_CONFIG);
            const oldSnap = await oldConfigRef.get();
            
            if (oldSnap.exists) {
                logger.warn(`[getAppConfig] Reading from legacy global config for relationship ${relationshipId}`);
                return { success: true, isLegacy: true, ...oldSnap.data() };
            }
            throw new HttpsError('not-found', 'Configuración no encontrada para esta relación.');
        }

        // Merge all documents in the 'config' subcollection
        const combinedData = {};
        let maxUpdatedAt = 0;

        configSnap.docs.forEach(doc => {
            const docData = doc.data();
            const docId = doc.id;
            
            // If the doc is 'main', merge its fields to the root
            if (docId === SINGLETON_DOCS.APP_CONFIG) {
                Object.assign(combinedData, docData);
            } else {
                // Otherwise nest it under its document ID (module/section name)
                combinedData[docId] = docData;
            }

            // Robust timestamp tracking
            const docUpdatedAt = docData.updatedAt?.toMillis?.() || 
                               (typeof docData.updatedAt === 'number' ? docData.updatedAt : 0);
            if (docUpdatedAt > maxUpdatedAt) maxUpdatedAt = docUpdatedAt;
        });

        // Final consolidated updatedAt
        combinedData.updatedAt = maxUpdatedAt;

        const { clientUpdatedAt } = request.data || {};

        // Robust numeric comparison for timestamps (MS since epoch)
        const toMillis = (ts) => {
            if (!ts) return null;
            if (typeof ts === 'number') return ts;
            if (typeof ts === 'string') return new Date(ts).getTime();
            if (ts._seconds) return ts._seconds * 1000;
            if (typeof ts.toMillis === 'function') return ts.toMillis();
            return null;
        };

        const msClient = toMillis(clientUpdatedAt);
        const msServer = toMillis(maxUpdatedAt);

        // If numeric timestamps match, notify the client that they have the latest version
        if (msClient && msServer && msClient === msServer) {
            return {
                success: true,
                unchanged: true,
                message: 'Configuración al día.'
            };
        }

        return {
            success: true,
            ...combinedData
        };
    } catch (error) {
        logger.error('getAppConfig error:', { relationshipId, error: error.message });
        throw new HttpsError('internal', 'Error al obtener la configuración.');
    }
});

