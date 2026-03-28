// TODO (v1.1): Implement rate limiting
import { getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants.js';

/**
 * validateInviteToken — HTTPS Callable (Public — no auth required)
 *
 * Partner opens /join?t=TOKEN, frontend calls this to validate before
 * showing the password setup form.
 *
 * Input:  { token: string }
 * Output: { valid: true, relationshipId: string, partnerUid: string }
 *         OR throws HttpsError
 */
export const validateInviteToken = onCall({ region: 'us-central1', cors: true }, async (request) => {
    try {
        logger.info('[validateInviteToken] Request data received:', request.data);
        
        // Support both direct string, object { token: "..." } or data nested by SDK
        const token = typeof request.data === 'string' 
            ? request.data 
            : request.data?.token;

        if (!token) {
            logger.error('[validateInviteToken] Missing token in data payload:', request.data);
            throw new HttpsError('invalid-argument', 'El código de invitación es requerido.');
        }

        const db = getFirestore();

        // 1. Validate token against inviteTokens collection (Global lookup)
        const tokenRef = db.collection(COLLECTIONS.INVITE_TOKENS).doc(token);
        const tokenSnap = await tokenRef.get();

        if (!tokenSnap.exists) {
            throw new HttpsError('not-found', 'Link de invitación inválido o expirado');
        }

        const tokenData = tokenSnap.data();

        if (tokenData.isClaimed || tokenData.isRevoked) {
            throw new HttpsError('permission-denied', 'Esta invitación ya no es válida');
        }

        if (tokenData.expiresAt && tokenData.expiresAt.toDate() < new Date()) {
            throw new HttpsError('permission-denied', 'La invitación ha expirado');
        }

        const { relationshipId } = tokenData;

        // 2. Get Relationship Config (to link on claim)
        const configRef = db.collection('relationships').doc(relationshipId)
            .collection('config').doc('main');
        const configSnap = await configRef.get();

        if (!configSnap.exists) {
            throw new HttpsError('not-found', 'Configuración de la relación no encontrada');
        }

        // partnerUid is now optional during validation
        const { partnerUid } = configSnap.data() || {};

        // 3. Check partner hasn't already claimed the account (Defense in depth)
        const partnerRef = db.collection(COLLECTIONS.USERS).doc(partnerUid);
        const partnerSnap = await partnerRef.get();

        if (partnerSnap.exists && partnerSnap.data().accountStatus === 'active') {
            throw new HttpsError('failed-precondition', 'Esta invitación ya fue utilizada');
        }

        if (partnerSnap.exists && partnerSnap.data().accountStatus === 'revoked') {
            throw new HttpsError('permission-denied', 'Esta cuenta ha sido revocada');
        }

        logger.info(`Token validated for token=${token.substring(0, 8)}... relationship=${relationshipId}`);

        return {
            valid: true,
            relationshipId,
            partnerUid,
        };
    } catch (error) {
        // Log interno para trazabilidad
        logger.error('validateInviteToken error:', {
            error: error.message,
            stack: error.stack
        });

        if (error instanceof HttpsError) throw error;

        throw new HttpsError(
            'internal',
            'Error al validar el token de invitación. Por favor, intenta de nuevo.'
        );
    }
});
