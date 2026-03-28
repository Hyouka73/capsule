import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

/**
 * createCoupon — Admin-only API
 * 
 * Crea un cupón vinculado a la relación.
 */
export const createCoupon = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { role, relationshipId } = request.auth.token;
    if (role !== 'admin') {
        throw new HttpsError('permission-denied', 'Solo el Admin puede crear cupones.');
    }

    const { title, description, type, emoji, maxRedemptions = 1 } = request.data;

    if (!title) {
        throw new HttpsError('invalid-argument', 'El título del cupón es obligatorio.');
    }

    const db = getFirestore();

    try {
        const couponData = {
            title,
            description: description || '',
            type: type || 'custom',
            emoji: emoji || '💝',
            status: 'active', // active | redeemed | expired
            maxRedemptions,
            redemptionsLeft: maxRedemptions,
            relationshipId,
            createdBy: request.auth.uid,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const docRef = await db.collection('relationships')
            .doc(relationshipId)
            .collection('coupons')
            .add(couponData);

        // --- FCM Notification to Partner ---
        try {
            const { sendBatchNotifications } = await import('../services/fcmService.js');
            const partnerQuery = await db.collection(COLLECTIONS.USERS)
                .where('relationshipId', '==', relationshipId)
                .where('role', '==', 'partner')
                .limit(1)
                .get();

            if (!partnerQuery.empty) {
                const fcmTokens = partnerQuery.docs[0].data().fcmTokens || [];
                if (fcmTokens.length > 0) {
                    await sendBatchNotifications(fcmTokens, {
                        title: '🎫 ¡Nuevo cupón!',
                        body: `Has recibido un nuevo cupón: "${title}" ✨`,
                        data: {
                            type: 'coupon_created',
                            couponId: docRef.id,
                        },
                    });
                }
            }
        } catch (fcmError) {
            logger.error('Error sending FCM for createCoupon:', fcmError);
        }

        return {
            success: true,
            id: docRef.id,
            message: 'Cupón creado exitosamente.'
        };
    } catch (error) {
        logger.error('createCoupon error:', { relationshipId, error: error.message });
        throw new HttpsError('internal', 'Error al crear el cupón.');
    }
});
