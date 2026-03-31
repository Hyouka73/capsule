import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS, ACTIVITY_ACTIONS } from '../config/constants.js';

/**
 * redeemCoupon — Backend API (BFF)
 * 
 * Registra el canje de un cupón y actualiza su disponibilidad.
 */
export const redeemCoupon = onCall({ region: 'us-central1', cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { couponId, notes } = request.data;
    const { uid } = request.auth;
    const { relationshipId } = request.auth.token;

    if (!couponId) {
        throw new HttpsError('invalid-argument', 'El couponId es obligatorio.');
    }

    const db = getFirestore();
    const couponRef = db.collection('relationships')
        .doc(relationshipId)
        .collection('coupons')
        .doc(couponId);

    try {
        return await db.runTransaction(async (transaction) => {
            const couponSnap = await transaction.get(couponRef);
            if (!couponSnap.exists) {
                throw new HttpsError('not-found', 'Cupón no encontrado.');
            }

            const couponData = couponSnap.data();
            if (couponData.relationshipId !== relationshipId) {
                throw new HttpsError('permission-denied', 'No tienes permiso para canjear este cupón.');
            }

            if (couponData.status !== 'active') {
                throw new HttpsError('failed-precondition', `El cupón no está activo (status: ${couponData.status}).`);
            }

            if (couponData.redemptionsLeft <= 0) {
                throw new HttpsError('failed-precondition', 'Este cupón ya no tiene canjes disponibles.');
            }

            // 1. Calcular nueva disponibilidad
            const newRedemptionsLeft = couponData.redemptionsLeft - 1;
            const newStatus = newRedemptionsLeft === 0 ? 'redeemed' : 'active';

            // 2. Actualizar Cupón
            transaction.update(couponRef, {
                redemptionsLeft: newRedemptionsLeft,
                status: newStatus,
                updatedAt: FieldValue.serverTimestamp()
            });

            // 3. Registrar Actividad
            const activityRef = db
                .collection('relationships')
                .doc(relationshipId)
                .collection(COLLECTIONS.ACTIVITY_LOG)
                .doc();
            transaction.set(activityRef, {
                relationshipId,
                userId: uid,
                action: ACTIVITY_ACTIONS.COUPON_USED,
                targetType: 'coupon',
                targetId: couponId,
                displayText: `Ha canjeado el cupón "${couponData.title}" ✨`,
                metadata: { notes: notes || '', couponTitle: couponData.title },
                isReadByAdmin: false,
                readAt: null,
                createdAt: FieldValue.serverTimestamp()
            });

            // 4. --- FCM Notification to Admin ---
            try {
                const { sendBatchNotifications } = await import('../services/fcmService.js');
                const adminQuery = await db.collection(COLLECTIONS.USERS)
                    .where('relationshipId', '==', relationshipId)
                    .where('role', '==', 'admin')
                    .limit(1)
                    .get();

                if (!adminQuery.empty) {
                    const fcmTokens = adminQuery.docs[0].data().fcmTokens || [];
                    if (fcmTokens.length > 0) {
                        await sendBatchNotifications(fcmTokens, {
                            title: '🎁 Cupón canjeado',
                            body: `Se ha canjeado el cupón: "${couponData.title}" ✨`,
                            data: {
                                type: 'coupon_redeemed',
                                couponId: couponId,
                            },
                        });
                    }
                }
            } catch (fcmError) {
                logger.error('Error sending FCM for redeemCoupon:', fcmError);
            }

            return {
                success: true,
                message: 'Cupón canjeado exitosamente.',
                status: newStatus
            };
        });
    } catch (error) {
        logger.error('redeemCoupon error:', { relationshipId, error: error.message });
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Error al procesar el canje del cupón.');
    }
});

