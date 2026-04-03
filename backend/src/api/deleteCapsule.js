import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    const { uid } = request.auth;
    const { capsuleId } = request.data || {};
    let { relationshipId, role } = request.auth.token || {};

    if (!capsuleId) throw new HttpsError('invalid-argument', 'Capsule ID is required.');

    const db = getFirestore();

    // FALLBACK: Si el token no tiene relationshipId, buscar en el documento del usuario
    if (!relationshipId) {
        logger.info(`RelationshipId missing in token for user ${uid}. Fetching from user document...`);
        const userSnap = await db.collection('users').doc(uid).get();
        if (userSnap.exists) {
            relationshipId = userSnap.data().relationshipId;
            const userData = userSnap.data();
            relationshipId = relationshipId || userData.relationshipId;
            role = role || userData.role;
        }
    }

    if (!relationshipId) {
        logger.error(`No relationshipId found for user ${uid} after fallback.`);
        throw new HttpsError('failed-precondition', 'El usuario no tiene una relación asignada.');
    }

    const capsuleRef = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.CAPSULES).doc(capsuleId);

    try {
        const capsuleSnap = await capsuleRef.get();
        if (!capsuleSnap.exists) throw new HttpsError('not-found', 'Cápsula no encontrada.');

        const data = capsuleSnap.data();

        // 1. Permisos: Admin siempre puede, Creador puede de su propia cápsula, Partner solo si es el destinatario y la cápsula es efímera
        const isAdmin = role === 'admin';
        const isCreator = data.createdBy === uid;
        // FLEX: Si eres el partner y no eres el creador, eres el destinatario legítimo (igual que en openCapsule)
        const isRecipient = data.recipientUid === uid || (role === 'partner' && !isCreator);
        const isEphemeral = data.autoDestroy === true;

        if (!isAdmin && !isCreator && !(isRecipient && isEphemeral)) {
            logger.warn(`Permission Denied in deleteCapsule: uid=${uid}, isRecipient=${isRecipient}, isEphemeral=${isEphemeral}`);
            throw new HttpsError('permission-denied', 'No tienes permiso para eliminar esta cápsula.');
        }

        await capsuleRef.delete();
        logger.info(`Cápsula ${capsuleId} eliminada exitosamente.`);
        return { success: true };
    } catch (error) {
        logger.error('deleteCapsule error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', error.message || 'Error al eliminar la cápsula');
    }
};
