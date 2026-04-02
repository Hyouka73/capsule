import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS, ACTIVITY_ACTIONS } from '../config/constants.js';

/**
 * redeemCoupon Handler
 */
export const handler = async (request) => {
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
    const relRef = db.collection('relationships').doc(relationshipId);
    const couponRef = relRef.collection(COLLECTIONS.COUPONS).doc(couponId);
    const redemptionsRef = relRef.collection(COLLECTIONS.REDEMPTIONS);

    try {
        return await db.runTransaction(async (transaction) => {
            const couponSnap = await transaction.get(couponRef);
            if (!couponSnap.exists) {
                throw new HttpsError('not-found', 'Cupón no encontrado.');
            }

            const couponData = couponSnap.data();
            
            if (couponData.relationshipId && couponData.relationshipId !== relationshipId) {
                throw new HttpsError('permission-denied', 'No tienes permiso para canjear este cupón.');
            }

            if (couponData.status !== 'active' && couponData.status !== 'activo') {
                throw new HttpsError('failed-precondition', 'El cupón no está disponible para canje.');
            }

            if (couponData.redemptionsLeft <= 0) {
                throw new HttpsError('failed-precondition', 'Este cupón ya no tiene canjes disponibles.');
            }

            const existingPending = await redemptionsRef
                .where('couponId', '==', couponId)
                .where('status', 'in', ['pending_approval', 'approved'])
                .limit(1)
                .get();

            if (!existingPending.empty) {
                throw new HttpsError('already-exists', 'Ya tienes una solicitud en curso para este cupón.');
            }

            const redemptionId = db.collection('_').doc().id; 
            const redemptionDoc = redemptionsRef.doc(redemptionId);
            
            transaction.set(redemptionDoc, {
                id: redemptionId,
                couponId,
                couponTitle: couponData.title,
                status: 'pending_approval',
                requestedBy: uid,
                notes: notes || '',
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            });

            const activityRef = relRef.collection(COLLECTIONS.ACTIVITY_LOG).doc();
            transaction.set(activityRef, {
                relationshipId,
                userId: uid,
                action: ACTIVITY_ACTIONS.COUPON_REQUESTED,
                targetType: 'coupon',
                targetId: couponId,
                redemptionId: redemptionId,
                displayText: `Ha solicitado el canje del cupón "${couponData.title}"`,
                metadata: { notes: notes || '', couponTitle: couponData.title },
                isReadByAdmin: false,
                readAt: null,
                createdAt: FieldValue.serverTimestamp()
            });

            // FCM logic
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
                            title: 'Cupón solicitado',
                            body: `Tu pareja quiere canjear: "${couponData.title}"`,
                            data: { type: 'coupon_requested', couponId, redemptionId },
                        });
                    }
                }
            } catch (fcmError) {
                logger.error('Error sending FCM:', fcmError);
            }

            return { success: true, message: 'Solicitud enviada exitosamente.', redemptionId };
        });
    } catch (error) {
        logger.error('redeemCoupon error:', error.message);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Error al procesar la solicitud.');
    }
};
