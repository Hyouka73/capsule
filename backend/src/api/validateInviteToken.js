import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants.js';

// V2 ROBUSTNESS - 2026-04-05 FORCED REFRESH

export const handler = async (request) => {
    let rawToken = typeof request.data === 'string' ? request.data : request.data?.token;
    if (!rawToken) throw new HttpsError('invalid-argument', 'El código de invitación es requerido.');

    const token = rawToken.trim().toUpperCase();
    const db = getFirestore();

    try {
        const tokenSnap = await db.collection(COLLECTIONS.INVITE_TOKENS).doc(token).get();

        if (!tokenSnap.exists) {
            throw new HttpsError('not-found', 'Enlace de invitación no encontrado o inválido.');
        }

        const data = tokenSnap.data();
        const now = new Date();
        const expiresAt = data.expiresAt?.toDate();

        if (expiresAt && expiresAt < now) {
            throw new HttpsError('deadline-exceeded', 'Este enlace ha expirado.');
        }

        // V2: Don't block isClaimed tokens. We show the join screen anyway, 
        // and exchangeInviteToken will decide if they get their session back.
        if (data.isRevoked) {
            throw new HttpsError('permission-denied', 'Este enlace ha sido revocado.');
        }

        const { relationshipId } = data;
        
        // Check config/relationship for existing identity info
        const configRef = db.collection('relationships').doc(relationshipId)
            .collection('config').doc(SINGLETON_DOCS.RELATIONSHIP);
        const configSnap = await configRef.get();

        const { partnerUid } = configSnap.data() || {};
        
        // V2: No strict user-level blocks here. We trust the EXCHANGE step to 
        // manage UID/Fingerprint matching. This enables multi-device re-entry.
        
        return {
            success: true,
            valid: true,
            isClaimed: data.isClaimed === true,
            relationshipId: data.relationshipId,
            partnerUid: partnerUid || data.claimedBy || null
        };

        return {
            success: true,
            valid: true,
            relationshipId: data.relationshipId,
            partnerUid
        };
    } catch (error) {
        logger.error('validateInviteToken error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Error al validar el token. ' + error.message);
    }
};
