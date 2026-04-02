import { HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions';
import { COLLECTIONS, SINGLETON_DOCS } from '../config/constants.js';

export const handler = async (request) => {
    try {
        const { token: rawToken, deviceFingerprint } = request.data;
        if (!rawToken || !deviceFingerprint) {
            throw new HttpsError('invalid-argument', 'Token y deviceFingerprint son obligatorios.');
        }

        const token = rawToken.trim().toUpperCase();

        const db = getFirestore();
        const auth = getAuth();

        // 1. Validate the invite token
        const tokenRef = db.collection(COLLECTIONS.INVITE_TOKENS).doc(token);
        const tokenSnap = await tokenRef.get();

        if (!tokenSnap.exists) {
            throw new HttpsError('not-found', 'Token de invitación no encontrado');
        }

        const tokenData = tokenSnap.data();

        if (tokenData.isRevoked) {
            throw new HttpsError('permission-denied', 'Este token ha sido revocado');
        }

        if (tokenData.isClaimed && tokenData.claimedDeviceId !== deviceFingerprint) {
            throw new HttpsError('permission-denied', 'Este token ya fue usado en otro dispositivo');
        }

        const { relationshipId, expiresAt } = tokenData;
        if (expiresAt) {
            const expiryDate = (typeof expiresAt.toDate === 'function') 
                ? expiresAt.toDate() 
                : new Date(expiresAt);
            
            if (expiryDate < new Date()) {
                throw new HttpsError('deadline-exceeded', 'Este token ha expirado');
            }
        }

        // 2. Find or create the partner user in Firebase Auth
        let userRecord = await auth.createUser({
            displayName: 'Partner'
        });

        const realPartnerUid = userRecord.uid;

        // 3. Set custom claims: { role, deviceId, relationshipId }
        await auth.setCustomUserClaims(realPartnerUid, {
            role: 'partner',
            deviceId: deviceFingerprint,
            ...(relationshipId && { relationshipId }),
        });

        // 4. Mark invite token as claimed
        await tokenRef.update({
            isClaimed: true,
            claimedBy: realPartnerUid,
            claimedAt: FieldValue.serverTimestamp(),
            claimedDeviceId: deviceFingerprint,
        });

        // 5. Update Relationship Config — link new Partner and deactivate invite
        const configColl = db.collection('relationships').doc(relationshipId).collection('config');
        await configColl.doc(SINGLETON_DOCS.RELATIONSHIP).set({
            partnerUid: realPartnerUid,
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        await configColl.doc(SINGLETON_DOCS.INVITE_CONFIG).set({
            isActive: false,
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        // 6. Update/create user doc in Firestore
        const userRef = db.collection(COLLECTIONS.USERS).doc(realPartnerUid);
        await userRef.set({
            uid: realPartnerUid,
            role: 'partner',
            accountStatus: 'active',
            relationshipId: relationshipId || null,
            displayName: 'Partner',
            deviceId: deviceFingerprint,
            deviceInfo: {
                registeredAt: FieldValue.serverTimestamp(),
                lastSeenAt: FieldValue.serverTimestamp(),
                platform: 'web',
                userAgent: request.rawRequest?.headers?.['user-agent'] ?? '',
            },
            isRevoked: false,
            accountStatus: 'active',
            fcmTokens: [],
            welcomeSeen: false,
            teaserCompleted: false, // Force them to see the intro
            createdAt: FieldValue.serverTimestamp(),
            lastActiveAt: FieldValue.serverTimestamp(),
            gameCoins: 100,
            coinTransactions: []
        }, { merge: true });

        // 7. Generate and return the custom token
        const customToken = await auth.createCustomToken(realPartnerUid, {
            role: 'partner',
            deviceId: deviceFingerprint,
            ...(relationshipId && { relationshipId }),
        });

        logger.info(`Invite token ${token} successfully exchanged. User ${realPartnerUid} authenticated on device ${deviceFingerprint}.`);

        return {
            success: true,
            customToken,
            userId: realPartnerUid
        };
    } catch (error) {
        logger.error('exchangeInviteToken error:', error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'Error al procesar el token. ' + error.message);
    }
};
