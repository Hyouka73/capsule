import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants.js';

export const handler = async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Unauthorized');

    const { inviteToken } = request.data || {};
    const { uid, email, name, picture } = request.auth.token;

    if (!inviteToken) throw new HttpsError('invalid-argument', 'Invite token is required.');

    const db = getFirestore();

    try {
        const tokenRef = db.collection(COLLECTIONS.INVITE_TOKENS).doc(inviteToken);
        const tokenSnap = await tokenRef.get();

        if (!tokenSnap.exists || tokenSnap.data().expiresAt.toDate() < new Date()) {
            throw new HttpsError('failed-precondition', 'Token inválido o expirado.');
        }

        const { relationshipId } = tokenSnap.data();
        const configColl = db.collection('relationships').doc(relationshipId).collection('config');
        const ts = FieldValue.serverTimestamp();

        await db.runTransaction(async (transaction) => {
            const userRef = db.collection(COLLECTIONS.USERS).doc(uid);
            const userSnap = await transaction.get(userRef);
            const ts = FieldValue.serverTimestamp();

            const userData = {
                uid, email,
                displayName: name || 'Pareja',
                photoURL: picture || null,
                role: 'partner',
                relationshipId,
                accountStatus: 'active',
                updatedAt: ts
            };

            if (!userSnap.exists) {
                userData.createdAt = ts;
            }

            transaction.set(userRef, userData, { merge: true });

            // partnerUid → config/relationship
            transaction.set(configColl.doc(SINGLETON_DOCS.RELATIONSHIP), {
                partnerUid: uid,
                updatedAt: ts
            }, { merge: true });

            transaction.delete(tokenRef);
        });

        return { success: true, relationshipId };
    } catch (error) {
        logger.error('claimPartnerAccount error:', error);
        throw new HttpsError('internal', error.message);
    }
};
