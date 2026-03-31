import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * completeTeaser — Backend API (BFF)
 * 
 * Marca el teaser como completado para el usuario actual.
 */
export const completeTeaser = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { uid } = request.auth;
    const db = getFirestore();

    try {
        const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
        
        await userRef.update({
            teaserCompleted: true,
            teaserLock: null,
            updatedAt: FieldValue.serverTimestamp()
        });

        return {
            success: true,
            message: 'Teaser completado correctamente.'
        };
    } catch (error) {
        logger.error('completeTeaser error:', { uid, error: error.message });
        throw new HttpsError('internal', 'Error al completar el teaser.');
    }
});

