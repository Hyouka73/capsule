import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants.js';

/**
 * getTeaserConfig — Backend API (BFF)
 * 
 * Obtiene el estado del teaser (bloqueo individual).
 */
export const getTeaserConfig = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { role, relationshipId } = request.auth.token;
    const { uid } = request.auth;
    const db = getFirestore();

    try {
        const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
        const configRef = db.collection('relationships').doc(relationshipId).collection('config').doc(SINGLETON_DOCS.APP_CONFIG);

        const [userSnap, configSnap] = await Promise.all([
            userRef.get(),
            configRef.get()
        ]);

        if (!userSnap.exists || !configSnap.exists) {
            throw new HttpsError('not-found', 'Usuario o configuración no encontrada.');
        }

        const userData = userSnap.data();
        const configData = configSnap.data();

        // PM Adjustment: Partner usa User.teaserLock, Admin usa AppConfig.teaserLock
        const teaserLock = role === 'partner' 
            ? userData.teaserLock 
            : configData.teaserLock;

        return {
            success: true,
            teaserLock: teaserLock || null,
            teaserCompleted: userData.teaserCompleted || false,
            teaserConfig: configData.teaser || {} // Global status (unlockDate, etc)
        };
    } catch (error) {
        logger.error('getTeaserConfig error:', { uid, relationshipId, error: error.message });
        throw new HttpsError('internal', 'Error al obtener teaser config.');
    }
});
