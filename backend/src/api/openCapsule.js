import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    const { capsuleId } = request.data || {};
    const { relationshipId, uid } = request.auth.token;

    if (!capsuleId) throw new HttpsError('invalid-argument', 'Capsule ID is required.');

    const db = getFirestore();
    const capsuleRef = db.collection('relationships').doc(relationshipId).collection(COLLECTIONS.CAPSULES).doc(capsuleId);

    try {
        const capsuleSnap = await capsuleRef.get();
        if (!capsuleSnap.exists) throw new HttpsError('not-found', 'Cápsula no encontrada.');

        const data = capsuleSnap.data();
        if (data.recipientUid !== uid) throw new HttpsError('permission-denied', 'No puedes abrir esta cápsula.');
        if (data.status === 'unlocked') return { success: true, capsule: data };

        // Check if unlock criteria met (if date-based)
        if (data.unlockTrigger === 'date' && data.unlockDate.toDate() > new Date()) {
            throw new HttpsError('failed-precondition', 'La cápsula aún está bloqueada.');
        }

        await capsuleRef.update({
            isUnlocked: true,
            status: 'unlocked',
            unlockedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        logger.error('openCapsule error:', error);
        throw new HttpsError('internal', error.message);
    }
};
