import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants.js';

/**
 * exchangeInviteToken - V2 Robustness Update (2026-04-05 FORCED)
 * Uses a transaction to ensure atomic claim and re-entry logic.
 */
export const handler = async (request) => {
    try {
        const { token: rawToken, deviceFingerprint } = request.data;
        if (!rawToken || !deviceFingerprint) {
            throw new HttpsError('invalid-argument', 'Token y deviceFingerprint son obligatorios.');
        }

        const token = rawToken.trim().toUpperCase();
        const db = getFirestore();
        const auth = getAuth();

        const result = await db.runTransaction(async (transaction) => {
            // 1. Get Token Data
            const tokenRef = db.collection(COLLECTIONS.INVITE_TOKENS).doc(token);
            const tokenSnap = await transaction.get(tokenRef);

            if (!tokenSnap.exists) throw new HttpsError('not-found', 'Token no encontrado.');
            const tokenData = tokenSnap.data();
            if (tokenData.isRevoked) throw new HttpsError('permission-denied', 'Este token ha sido revocado.');

            const { relationshipId } = tokenData;
            if (!relationshipId) throw new HttpsError('internal', 'Invite token is not linked to a relationship.');

            // 2. Resolve Partner UID (Smart Reuse Logic)
            let realPartnerUid = null;

            // Check if already claimed by this device (Idempotency)
            if (tokenData.isClaimed) {
                if (tokenData.claimedDeviceId === deviceFingerprint) {
                    realPartnerUid = tokenData.claimedBy;
                } else {
                    const relConfigRef = db.collection('relationships').doc(relationshipId).collection('config').doc(SINGLETON_DOCS.RELATIONSHIP);
                    const relConfigSnap = await transaction.get(relConfigRef);
                    const currentPartnerUid = relConfigSnap.exists ? relConfigSnap.data().partnerUid : null;

                    if (currentPartnerUid) {
                        realPartnerUid = currentPartnerUid; // Allow re-entry for existing partner
                    } else {
                        throw new HttpsError('permission-denied', 'Este token ya fue usado.');
                    }
                }
            }

            // 2.1 Check Relationship config for existing partner identity
            if (!realPartnerUid) {
                const relConfigRef = db.collection('relationships').doc(relationshipId).collection('config').doc(SINGLETON_DOCS.RELATIONSHIP);
                const relConfigSnap = await transaction.get(relConfigRef);
                if (relConfigSnap.exists && relConfigSnap.data().partnerUid) {
                    realPartnerUid = relConfigSnap.data().partnerUid;
                }
            }

            // 3. Obtain User Auth Record
            let userRecord;
            if (realPartnerUid) {
                try {
                    userRecord = await auth.getUser(realPartnerUid);
                } catch (authError) {
                    if (authError.code === 'auth/user-not-found') {
                        userRecord = await auth.createUser({ uid: realPartnerUid, displayName: 'Partner' });
                    } else throw authError;
                }
            } else {
                userRecord = await auth.createUser({ displayName: 'Partner' });
                realPartnerUid = userRecord.uid;
            }

            // 4. Update Partner User Document in Firestore
            const userRef = db.collection(COLLECTIONS.USERS).doc(realPartnerUid);
            const userSnap = await transaction.get(userRef);
            const existingData = userSnap.exists ? userSnap.data() : {};

            transaction.set(userRef, {
                uid: realPartnerUid,
                role: 'partner',
                accountStatus: 'active',
                relationshipId,
                displayName: existingData.displayName || 'Pareja',
                deviceId: deviceFingerprint,
                deviceInfo: {
                    ...existingData.deviceInfo,
                    lastSeenAt: FieldValue.serverTimestamp(),
                    platform: 'web',
                    userAgent: request.rawRequest?.headers?.['user-agent'] ?? '',
                },
                isRevoked: false,
                updatedAt: FieldValue.serverTimestamp(),
                lastActiveAt: FieldValue.serverTimestamp(),
                createdAt: existingData.createdAt || FieldValue.serverTimestamp(),
            }, { merge: true });

            // 5. Update Relationship Config & Token Status
            const relConfigRef = db.collection('relationships').doc(relationshipId).collection('config').doc(SINGLETON_DOCS.RELATIONSHIP);
            transaction.set(relConfigRef, { partnerUid: realPartnerUid, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

            const inviteConfigRef = db.collection('relationships').doc(relationshipId).collection('config').doc(SINGLETON_DOCS.INVITE_CONFIG);
            transaction.set(inviteConfigRef, { isActive: false, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

            if (!tokenData.isClaimed) {
                transaction.update(tokenRef, {
                    isClaimed: true,
                    claimedBy: realPartnerUid,
                    claimedAt: FieldValue.serverTimestamp(),
                    claimedDeviceId: deviceFingerprint,
                });
            }

            return { realPartnerUid, relationshipId };
        });

        const { realPartnerUid, relationshipId: finalRelId } = result;

        // 6. Finalize: Set Custom Claims & Return Custom Token
        await auth.setCustomUserClaims(realPartnerUid, {
            role: 'partner',
            deviceId: deviceFingerprint,
            relationshipId: finalRelId,
        });

        const customToken = await auth.createCustomToken(realPartnerUid, {
            role: 'partner',
            deviceId: deviceFingerprint,
            relationshipId: finalRelId,
        });

        logger.info(`[exchangeInviteToken] V2 Success for ${realPartnerUid} in ${finalRelId}`);
        return { success: true, customToken, userId: realPartnerUid };

    } catch (error) {
        logger.error('exchangeInviteToken error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Error al procesar el token: ' + error.message);
    }
};
