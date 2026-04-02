import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

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

        if (data.isClaimed || data.isRevoked) {
            throw new HttpsError('permission-denied', 'Este enlace ya ha sido utilizado o revocado.');
        }

        const { relationshipId } = data;
        
        // Check config/relationship (not config/main) for existing active partner
        const configRef = db.collection('relationships').doc(relationshipId)
            .collection('config').doc('relationship');
        const configSnap = await configRef.get();

        const { partnerUid } = configSnap.data() || {};
        if (partnerUid) {
            const partnerRef = db.collection(COLLECTIONS.USERS).doc(partnerUid);
            const partnerSnap = await partnerRef.get();

            if (partnerSnap.exists && partnerSnap.data().accountStatus === 'active') {
                throw new HttpsError('failed-precondition', 'Esta invitación ya fue utilizada.');
            }
            if (partnerSnap.exists && partnerSnap.data().accountStatus === 'revoked') {
                throw new HttpsError('permission-denied', 'Esta cuenta ha sido revocada.');
            }
        }

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
