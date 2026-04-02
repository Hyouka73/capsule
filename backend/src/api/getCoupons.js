import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * getCoupons — Backend API (BFF)
 * 
 * Lists all coupons and redemptions for the relationship.
 */
export const handler = async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { relationshipId } = request.auth.token;
    const db = getFirestore();
    const relRef = db.collection('relationships').doc(relationshipId);

    try {
        // 1. Fetch Coupons
        const couponsSnap = await relRef
            .collection(COLLECTIONS.COUPONS)
            .orderBy('createdAt', 'desc')
            .get();

        const coupons = couponsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()?.toISOString() || null,
            updatedAt: doc.data().updatedAt?.toDate()?.toISOString() || null
        }));

        // 2. Fetch Redemptions
        const redemptionsSnap = await relRef
            .collection(COLLECTIONS.REDEMPTIONS)
            .orderBy('createdAt', 'desc')
            .get();

        const redemptions = redemptionsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate()?.toISOString() || null,
            updatedAt: doc.data().updatedAt?.toDate()?.toISOString() || null
        }));

        return {
            success: true,
            coupons,
            redemptions
        };
    } catch (error) {
        logger.error('getCoupons error:', { relationshipId, error: error.message });
        throw new HttpsError('internal', 'Error al obtener los cupones.');
    }
};
