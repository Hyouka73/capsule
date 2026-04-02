import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS, ACTIVITY_ACTIONS } from '../config/constants.js';

/**
 * updateRedemptionStatus Handler
 */
export const handler = async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { redemptionId, newStatus, message } = request.data;
    const { uid } = request.auth;
    const { relationshipId, role } = request.auth.token;

    if (!redemptionId || !newStatus) {
        throw new HttpsError('invalid-argument', 'Faltan parámetros: redemptionId o newStatus.');
    }

    const db = getFirestore();
    const relRef = db.collection('relationships').doc(relationshipId);
    const redemptionRef = relRef.collection(COLLECTIONS.REDEMPTIONS).doc(redemptionId);

    try {
        return await db.runTransaction(async (transaction) => {
            const redSnap = await transaction.get(redemptionRef);
            if (!redSnap.exists) {
                throw new HttpsError('not-found', 'Redención no encontrada.');
            }

            const redData = redSnap.data();
            const couponRef = relRef.collection(COLLECTIONS.COUPONS).doc(redData.couponId);

            if (['approved', 'postponed'].includes(newStatus)) {
                if (role !== 'admin') throw new HttpsError('permission-denied', 'Solo el administrador puede aprobar o posponer.');
                if (redData.status !== 'pending_approval') throw new HttpsError('failed-precondition', 'La solicitud ya no está en estado pendiente.');
            }

            if (newStatus === 'dismissed') {
                // Only the partner can dismiss a postponed redemption
                if (redData.status !== 'postponed') throw new HttpsError('failed-precondition', 'Solo se pueden descartar solicitudes pospuestas.');
            }

            if (newStatus === 'claimed') {
                if (redData.status !== 'approved') throw new HttpsError('failed-precondition', 'Solo se pueden cobrar cupones aprobados.');
            }

            let activityAction = null;
            let logText = '';

            if (newStatus === 'approved') {
                activityAction = ACTIVITY_ACTIONS.COUPON_APPROVED;
                logText = `Ha aprobado el canje: "${redData.couponTitle}"`;
                transaction.update(redemptionRef, { status: 'approved', updatedAt: FieldValue.serverTimestamp() });
            } 
            else if (newStatus === 'postponed') {
                activityAction = ACTIVITY_ACTIONS.COUPON_POSTPONED;
                logText = `Ha pospuesto el canje: "${redData.couponTitle}"`;
                transaction.update(redemptionRef, {
                    status: 'postponed',
                    adminNote: message || '',
                    updatedAt: FieldValue.serverTimestamp()
                });
            }
            else if (newStatus === 'dismissed') {
                // Partner acknowledged the postponement — delete the redemption so coupon returns to pool
                activityAction = ACTIVITY_ACTIONS.COUPON_POSTPONED; // Reuse existing action
                logText = `Ha visto la posposición y el cupón "${redData.couponTitle}" está de nuevo disponible`;
                transaction.delete(redemptionRef);
            }
            else if (newStatus === 'claimed') {
                activityAction = ACTIVITY_ACTIONS.COUPON_CLAIMED;
                logText = `Ha completado el canje: "${redData.couponTitle}"`;
                
                const couponSnap = await transaction.get(couponRef);
                const couponData = couponSnap.data();
                const newCount = (couponData.redemptionsLeft || 1) - 1;
                const newCouponStatus = newCount <= 0 ? 'redeemed' : 'active';
                
                transaction.update(couponRef, {
                    redemptionsLeft: newCount,
                    status: newCouponStatus,
                    updatedAt: FieldValue.serverTimestamp()
                });

                transaction.update(redemptionRef, { status: 'claimed', updatedAt: FieldValue.serverTimestamp() });
            }

            const activityRef = relRef.collection(COLLECTIONS.ACTIVITY_LOG).doc();
            transaction.set(activityRef, {
                relationshipId,
                userId: uid,
                action: activityAction,
                targetType: 'coupon',
                targetId: redData.couponId,
                redemptionId,
                displayText: logText,
                metadata: { message: message || '', couponTitle: redData.couponTitle },
                isReadByAdmin: false,
                readAt: null,
                createdAt: FieldValue.serverTimestamp()
            });

            // Notifications
            try {
                const { sendBatchNotifications } = await import('../services/fcmService.js');
                const targetRole = role === 'admin' ? 'partner' : 'admin';
                const targetQuery = await db.collection(COLLECTIONS.USERS)
                    .where('relationshipId', '==', relationshipId)
                    .where('role', '==', targetRole)
                    .limit(1)
                    .get();

                if (!targetQuery.empty) {
                    const fcmTokens = targetQuery.docs[0].data().fcmTokens || [];
                    if (fcmTokens.length > 0) {
                        let fcmData = { title: '', body: '' };
                        if (newStatus === 'approved') fcmData = { title: '¡Cupón aprobado!', body: `Tu pareja ha aprobado: "${redData.couponTitle}"` };
                        else if (newStatus === 'postponed') fcmData = { title: 'Cupón pospuesto', body: message || `Se ha pospuesto: "${redData.couponTitle}"` };
                        else if (newStatus === 'claimed') fcmData = { title: 'Cupón completado', body: `Se ha completado: "${redData.couponTitle}"` };

                        await sendBatchNotifications(fcmTokens, {
                            ...fcmData,
                            data: { type: `coupon_${newStatus}`, redemptionId, message: message || '' },
                        });
                    }
                }
            } catch (fcmError) {
                logger.error('Error sending FCM:', fcmError);
            }

            return { success: true };
        });
    } catch (error) {
        logger.error('updateRedemptionStatus error:', error.message);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Error al actualizar el estado.');
    }
};
