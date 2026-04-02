import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { id, title, description, maxRedemptions, type, emoji, tier, status, assignedToOption } = request.data || {};
    const { relationshipId, role } = request.auth.token;

    if (role !== 'admin') {
        throw new HttpsError('permission-denied', 'Only admin can update coupons.');
    }

    if (!id) {
        throw new HttpsError('invalid-argument', 'Coupon ID is required.');
    }

    const db = getFirestore();
    const couponRef = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.COUPONS).doc(id);

    try {
        const doc = await couponRef.get();
        if (!doc.exists) {
            throw new HttpsError('not-found', 'Coupon not found.');
        }

        const updateData = {
            updatedAt: FieldValue.serverTimestamp()
        };

        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (maxRedemptions !== undefined) {
            updateData.maxRedemptions = Number(maxRedemptions);
            // If updating maxRedemptions, we might need to adjust redemptionsLeft. 
            // Simple logic: if new max > old max, add the difference. 
            // But for now, let's just keep it simple if the user didn't specify.
        }
        if (type !== undefined) updateData.type = type;
        if (emoji !== undefined) updateData.emoji = emoji;
        if (tier !== undefined) updateData.tier = Number(tier);
        if (status !== undefined) updateData.status = status;
        
        // Special case for assignment via admin
        if (assignedToOption === 'partner') {
            updateData.assignedTo = 'partner';
            updateData.assignedAt = FieldValue.serverTimestamp();
        }

        await couponRef.update(updateData);

        return {
            success: true
        };
    } catch (error) {
        logger.error('updateCoupon error:', error.message);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Error al actualizar el cupón.');
    }
};
