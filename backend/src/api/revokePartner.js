import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants.js';
import { sendNotificationToTokens } from '../utils/notifications.js';

export const handler = async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Unauthorized');
    }

    const { role, relationshipId } = request.auth.token;
    if (!relationshipId) {
        throw new HttpsError('failed-precondition', 'Relationship ID missing in admin token.');
    }

    if (role !== 'admin') {
        throw new HttpsError('permission-denied', 'Solo el Admin puede revocar cuentas.');
    }

    const db = getFirestore();

    try {
        const configRef = db.collection('relationships').doc(relationshipId).collection('config').doc(SINGLETON_DOCS.RELATIONSHIP);
        const configSnap = await configRef.get();

        if (!configSnap.exists) {
            logger.warn(`[revokePartner] Config doc 'relationship' missing for rel: ${relationshipId}`);
            throw new HttpsError('not-found', `No se encontró la configuración 'relationship' para la relación ${relationshipId}.`);
        }

        const configData = configSnap.data();
        const { partnerUid } = configData;

        if (!partnerUid) {
            throw new HttpsError('failed-precondition', 'No hay un Partner asignado.');
        }

        const partnerRef = db.collection(COLLECTIONS.USERS).doc(partnerUid);
        const partnerSnap = await partnerRef.get();

        if (!partnerSnap.exists) {
            throw new HttpsError('not-found', 'Documento de usuario del Partner no encontrado.');
        }

        const partnerData = partnerSnap.data();
        if (partnerData.relationshipId !== relationshipId) {
            throw new HttpsError('permission-denied', 'El usuario no pertenece a tu relación.');
        }

        const partnerTokens = partnerData.fcmTokens || [];

        const batch = db.batch();
        // 1. Mark partner as revoked
        batch.update(partnerRef, {
            accountStatus: 'revoked',
            fcmTokens: [],
            updatedAt: FieldValue.serverTimestamp()
        });

        // 2. IMPORTANT: Revoke all active invite tokens for this relationship
        // This ensures the partner cannot "use an old link" to get back in.
        const activeTokensSnap = await db.collection(COLLECTIONS.INVITE_TOKENS)
            .where('relationshipId', '==', relationshipId)
            .where('isRevoked', '==', false)
            .get();
        
        if (!activeTokensSnap.empty) {
            activeTokensSnap.forEach(doc => {
                batch.update(doc.ref, {
                    isRevoked: true,
                    revokedAt: FieldValue.serverTimestamp(),
                    revokedBy: request.auth.uid
                });
            });
        }

        // 3. Update relationship config - keep partnerUid but update timestamp
        batch.update(configRef, {
            updatedAt: FieldValue.serverTimestamp()
        });

        const activityRef = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.ACTIVITY_LOG).doc();
        batch.set(activityRef, {
            relationshipId,
            userId: request.auth.uid,
            action: 'partner_revoked',
            displayText: 'Se ha revocado el acceso del Partner a esta relación 🔒',
            createdAt: FieldValue.serverTimestamp()
        });

        await batch.commit();

        if (partnerTokens.length > 0) {
            try {
                await sendNotificationToTokens(partnerTokens, {
                    title: 'Acceso Revocado 🔒',
                    body: 'Tu acceso a la relación ha sido finalizado.',
                    data: { type: 'revoked' }
                });
            } catch (fcmError) {
                logger.warn('Failed to send revoke notification.', fcmError);
            }
        }

        return { success: true };
    } catch (error) {
        logger.error('revokePartner error:', error.message);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Error al revocar el acceso.');
    }
};
