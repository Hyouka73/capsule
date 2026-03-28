import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { SINGLETON_DOCS } from '../config/constants.js';

/**
 * updateAppConfig — Admin-only API
 * 
 * Actualiza la configuración de la relación.
 * Ruta: relationships/{id}/config/main
 */
export const updateAppConfig = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { role, relationshipId } = request.auth.token;
    if (role !== 'admin') {
        throw new HttpsError('permission-denied', 'Solo el Admin puede actualizar la configuración.');
    }

    const { config } = request.data;
    if (!config || typeof config !== 'object') {
        throw new HttpsError('invalid-argument', 'El objeto config es obligatorio.');
    }

    const db = getFirestore();

    try {
        const configColl = db.collection('relationships').doc(relationshipId).collection('config');
        const batch = db.batch();
        const now = FieldValue.serverTimestamp();

        // Separate sections from main-level fields
        const sections = [
            'teaser', 'snapshotConfig', 'wrapped', 'map', 'notifications', 
            'onboarding', 'modules', 'partner', 'memoryTags', 'citaConfig'
        ];

        const mainData = { updatedAt: now };
        const updatesBySection = {};

        Object.keys(config).forEach(key => {
            if (sections.includes(key)) {
                updatesBySection[key] = { ...config[key], updatedAt: now };
            } else if (key !== 'updatedAt') {
                mainData[key] = config[key];
            }
        });

        // 1. Update 'main' document
        batch.set(configColl.doc(SINGLETON_DOCS.APP_CONFIG), mainData, { merge: true });

        // 2. Update each section document
        Object.entries(updatesBySection).forEach(([section, data]) => {
            batch.set(configColl.doc(section), data, { merge: true });
        });

        await batch.commit();

        return {
            success: true,
            message: 'Configuración actualizada (Multi-doc) correctamente.'
        };
    } catch (error) {
        logger.error('updateAppConfig error:', { relationshipId, error: error.message });
        throw new HttpsError('internal', 'Error al actualizar la configuración.');
    }
});
