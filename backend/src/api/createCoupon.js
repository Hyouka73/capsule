import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS, ACTIVITY_ACTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { title, description, maxRedemptions = 1, type = 'simple', emoji, tier = 1 } = request.data || {};
    const { relationshipId, role, uid } = request.auth.token;

    if (role !== 'admin') {
        throw new HttpsError('permission-denied', 'Only admin can create coupons.');
    }

    if (!title) {
        throw new HttpsError('invalid-argument', 'Title is required.');
    }

    const db = getFirestore();
    const relRef = db.collection('relationships').doc(relationshipId);
    const couponsColl = relRef.collection(COLLECTIONS.COUPONS);

    try {
        const couponRef = couponsColl.doc();
        const now = FieldValue.serverTimestamp();

        const couponData = {
            id: couponRef.id,
            title,
            description: description || '',
            maxRedemptions,
            redemptionsLeft: maxRedemptions,
            type,
            emoji: emoji || '🎁',
            tier: Number(tier),
            status: 'active',
            relationshipId,
            createdAt: now,
            updatedAt: now
        };

        await couponRef.set(couponData);

        return {
            success: true,
            couponId: couponRef.id
        };
    } catch (error) {
        logger.error('createCoupon error:', error.message);
        throw new HttpsError('internal', 'Error al crear el cupón.');
    }
};
