import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants.js';
import { sendNotificationToTokens } from '../utils/notifications.js';

/**
 * revokePartner — Admin-only API
 * 
 * Revoca el acceso del Partner a la relación:
 * 1. Cambia status del Partner a 'revoked'.
 * 2. Limpia fcmTokens del Partner.
 * 3. Limpia partnerUid en AppConfig.
 * 4. Envía FCM al Partner.
 * 5. Log Activity.
 */
export const revokePartner = onCall({ region: 'us-central1', cors: true }, async (request) => {
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
        const configRef = db.collection('relationships').doc(relationshipId).collection('config').doc(SINGLETON_DOCS.APP_CONFIG);
        const configSnap = await configRef.get();

        if (!configSnap.exists) {
            logger.warn(`[revokePartner] Config doc 'main' missing for rel: ${relationshipId}`);
            throw new HttpsError('not-found', `No se encontró la configuración 'main' para la relación ${relationshipId}.`);
        }

        const configData = configSnap.data();
        const { partnerUid } = configData;

        if (!partnerUid) {
            logger.error(`[revokePartner] partnerUid missing in config for rel: ${relationshipId}`, configData);
            throw new HttpsError('failed-precondition', 'No hay un Partner asignado en la base de datos para esta relación. Prueba regenerando el enlace de invitación.');
        }

        // ── SECURITY CHECK: Validar que el Partner pertenece a la misma relación ──
        const partnerRef = db.collection(COLLECTIONS.USERS).doc(partnerUid);
        const partnerSnap = await partnerRef.get();

        if (!partnerSnap.exists) {
            throw new HttpsError('not-found', 'Documento de usuario del Partner no encontrado.');
        }

        const partnerData = partnerSnap.data();
        if (partnerData.relationshipId !== relationshipId) {
            logger.error('Cross-relationship revoke attempt blocked!', { adminUid: request.auth.uid, partnerUid, adminRel: relationshipId, partnerRel: partnerData.relationshipId });
            throw new HttpsError('permission-denied', 'El usuario no pertenece a tu relación.');
        }

        const partnerTokens = partnerData.fcmTokens || [];

        const batch = db.batch();

        // 1. Update Partner User Doc
        batch.update(partnerRef, {
            accountStatus: 'revoked',
            fcmTokens: [],
            updatedAt: FieldValue.serverTimestamp()
        });

        // 2. Update config
        batch.update(configRef, {
            partnerUid: null,
            updatedAt: FieldValue.serverTimestamp()
        });

        // 3. Log Activity
        const activityRef = db.collection(COLLECTIONS.ACTIVITY_LOG).doc();
        batch.set(activityRef, {
            relationshipId,
            userId: request.auth.uid,
            action: 'partner_revoked',
            displayText: 'Se ha revocado el acceso del Partner a esta relación 🔒',
            createdAt: FieldValue.serverTimestamp()
        });

        await batch.commit();

        // 4. Send FCM Notification
        if (partnerTokens.length > 0) {
            try {
                await sendNotificationToTokens(partnerTokens, {
                    title: 'Acceso Revocado 🔒',
                    body: 'Tu acceso a la relación ha sido finalizado.',
                    data: { type: 'revoked' }
                });
            } catch (fcmError) {
                logger.warn('Failed to send revoke notification, but account was revoked.', fcmError);
            }
        }

        logger.info(`Partner ${partnerUid} revoked by Admin ${request.auth.uid} in relationship ${relationshipId}`);

        return {
            success: true,
            message: 'Acceso del Partner revocado exitosamente.'
        };
    } catch (error) {
        logger.error('revokePartner error:', { relationshipId, error: error.message });
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Error al revocar el acceso del Partner.');
    }
});


