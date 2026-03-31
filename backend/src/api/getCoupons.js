import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * getCoupons — Backend API (BFF)
 * 
 * Lista todos los cupones de la relación.
 */
export const getCoupons = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { relationshipId } = request.auth.token;
    const db = getFirestore();

    try {
        const couponsSnap = await db.collection('relationships')
            .doc(relationshipId)
            .collection('coupons')
            .orderBy('createdAt', 'desc')
            .get();

        const coupons = couponsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()?.toISOString() || null,
            updatedAt: doc.data().updatedAt?.toDate()?.toISOString() || null
        }));

        return {
            success: true,
            coupons
        };
    } catch (error) {
        logger.error('getCoupons error:', { relationshipId, error: error.message });
        throw new HttpsError('internal', 'Error al obtener los cupones.');
    }
});

